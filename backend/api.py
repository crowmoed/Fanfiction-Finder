import os
import sys
import hashlib
import json
import logging
import time
import uuid
from datetime import datetime, timezone
from http import HTTPStatus

# Force UTF-8 on stdout/stderr so the diagnostic print()s (which contain box-drawing
# and arrow characters) don't crash a request with UnicodeEncodeError on a non-UTF-8
# console (e.g. Windows cp1252 in local dev). No-op where stdout is already UTF-8.
for _stream in (sys.stdout, sys.stderr):
    try:
        _stream.reconfigure(encoding="utf-8")
    except (AttributeError, ValueError):
        pass
from fastapi import FastAPI, Query, HTTPException, Depends, Request, Header, Response
from fastapi.exceptions import RequestValidationError
from fastapi.encoders import jsonable_encoder
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.concurrency import run_in_threadpool
from pydantic import BaseModel
from typing import Optional, Union
import numpy as np

from data.schema import Fic
from data.fandoms import FANDOMS
from data.vote_candidates import VOTE_CANDIDATES
from ai.embedder import embed_query
from ai.query_enhancer import enhance_query
from ai.ranker import rank
from db.postgres import (
    search_rrf,
    search_rrf_with_variants,
    get_fic_count,
    get_indexed_fandoms,
    get_admin_stats,
)

from auth.auth import verify_google_token, create_jwt
from auth.user_store import user_store
from auth.dependencies import get_current_user, get_optional_user
import notify


# Interactive API docs (/docs, /redoc, /openapi.json) are disabled by default so the
# full schema isn't exposed in production. Set ENABLE_DOCS=1 to turn them back on
# (e.g. in a staging environment).
_DOCS_ENABLED = os.environ.get("ENABLE_DOCS", "") == "1"
app = FastAPI(
    title="FicFinder API",
    docs_url="/docs" if _DOCS_ENABLED else None,
    redoc_url="/redoc" if _DOCS_ENABLED else None,
    openapi_url="/openapi.json" if _DOCS_ENABLED else None,
)

# Pin CORS to known frontend origins (OWASP API #8). The wildcard + credentials combo
# is spec-invalid and unsafe; set CORS_ALLOW_ORIGINS (comma-separated) in the deploy env
# to the production frontend origin(s). Defaults to the local dev frontend.
_CORS_ORIGINS = [
    o.strip()
    for o in os.environ.get("CORS_ALLOW_ORIGINS", "http://localhost:3000").split(",")
    if o.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Request-ID"],
)


# ── Structured logging + request correlation ──────────────────────
# One JSON line per request with a correlation id, status, and latency. The same
# request id is attached to error logs and returned in the X-Request-ID header so a
# client-visible error can be traced to a server log line without leaking internals.

logger = logging.getLogger("ficfinder")
if not logger.handlers:
    _handler = logging.StreamHandler()
    _handler.setFormatter(logging.Formatter("%(message)s"))
    logger.addHandler(_handler)
    logger.setLevel(logging.INFO)


def _log(event: str, **fields) -> None:
    logger.info(json.dumps({"event": event, **fields}))


@app.middleware("http")
async def request_context(request: Request, call_next):
    request_id = request.headers.get("X-Request-ID") or uuid.uuid4().hex
    request.state.request_id = request_id
    start = time.perf_counter()
    response = await call_next(request)
    elapsed_ms = round((time.perf_counter() - start) * 1000, 1)
    _log(
        "request",
        request_id=request_id,
        method=request.method,
        path=request.url.path,
        status=response.status_code,
        latency_ms=elapsed_ms,
    )
    response.headers["X-Request-ID"] = request_id
    return response


# ── RFC 9457 problem+json errors ──────────────────────────────────
# One machine-readable error contract. `request_id` is kept as an extension member so a
# client-visible error still maps to a server log line (and stays back-compatible with
# the previous {detail, request_id} body).

_PROBLEM_SLUGS = {
    400: "bad-request",
    401: "unauthorized",
    403: "forbidden",
    404: "not-found",
    422: "validation-error",
    429: "rate-limited",
    500: "internal-error",
}


def _problem(status: int, detail, request_id, instance=None, **extra) -> JSONResponse:
    """Build an RFC 9457 application/problem+json response."""
    try:
        title = HTTPStatus(status).phrase
    except ValueError:
        title = "Error"
    body = {
        "type": f"/problems/{_PROBLEM_SLUGS.get(status, 'error')}",
        "title": title,
        "status": status,
        "detail": detail,
    }
    if instance:
        body["instance"] = instance
    if request_id:
        body["request_id"] = request_id
    body.update(extra)
    return JSONResponse(
        status_code=status,
        content=body,
        media_type="application/problem+json",
        headers={"X-Request-ID": request_id} if request_id else None,
    )


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    request_id = getattr(request.state, "request_id", None)
    # Log 401/403 (auth failures) and other HTTP errors with the request id.
    _log(
        "http_error",
        request_id=request_id,
        path=request.url.path,
        status=exc.status_code,
        detail=str(exc.detail),
    )
    return _problem(exc.status_code, exc.detail, request_id, instance=request.url.path)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    request_id = getattr(request.state, "request_id", None)
    _log(
        "validation_error",
        request_id=request_id,
        path=request.url.path,
        status=422,
    )
    return _problem(
        422,
        "Request validation failed",
        request_id,
        instance=request.url.path,
        errors=jsonable_encoder(exc.errors()),
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    request_id = getattr(request.state, "request_id", None)
    # Record the real error server-side; return a generic message so no traceback or
    # internal detail reaches the client.
    _log(
        "unhandled_error",
        request_id=request_id,
        path=request.url.path,
        error_type=type(exc).__name__,
        error=str(exc),
    )
    return _problem(500, "Internal server error", request_id, instance=request.url.path)


# ── Request models ────────────────────────────────────────────────

class LoginRequest(BaseModel):
    id_token: str


class FandomRequestBody(BaseModel):
    fandom_name: str
    notes: str = ""
    email: str = ""


class VoteRequest(BaseModel):
    fandom: str


# ── Auth endpoints ────────────────────────────────────────────────

@app.post("/auth/login")
def login(body: LoginRequest):
    """Exchange a Google ID token for a FicFinder JWT."""
    payload = verify_google_token(body.id_token)
    sub = payload["sub"]
    email = payload.get("email", "")
    user = user_store.upsert_user(sub, email)
    token = create_jwt(sub, email)

    # Analytics: distinguish a brand-new signup from a returning login by how
    # recently the record was created (upsert_user is create-if-absent). Lets
    # CloudWatch report signups-over-time and DAU without storing anything new.
    is_new_signup = False
    try:
        created = user.get("created_at")
        if created:
            age = (datetime.now(timezone.utc) - datetime.fromisoformat(created)).total_seconds()
            is_new_signup = age < 10
    except (ValueError, TypeError):
        pass
    _log("login", user_id=sub, tier=user.get("tier"), new_signup=is_new_signup)

    return {"token": token, "user": user}


@app.get("/auth/me")
def me(user: dict = Depends(get_current_user)):
    """Return the current user's profile (tier, searches remaining, etc.)."""
    return user


@app.post("/request")
def request_fandom(body: FandomRequestBody):
    """Free 'request a fandom' — records the request and emails the operator.

    Anonymous; no payment. The email is best-effort: the request is still recorded
    (and visible via fandom_orders.py / /admin/requests) even if the email fails.
    """
    fandom = body.fandom_name.strip()
    if not fandom:
        raise HTTPException(status_code=400, detail="Fandom name is required.")
    req = user_store.create_fandom_request(
        fandom=fandom, email=body.email.strip(), notes=body.notes.strip()
    )
    try:
        notify.send_request_email(fandom, body.notes.strip(), body.email.strip())
    except Exception as e:
        _log("request_email_failed", fandom=fandom, error=str(e)[:200])
    return {"ok": True, "id": req["id"]}


# ── Community vote — free, sign-in-gated: pick 1 of 4 fandoms to index next ──────

def _eligible_vote_candidates() -> list[str]:
    """Ballot candidates minus fandoms already indexed — no point voting to add
    what's already searchable. Best-effort: any DB hiccup (or all candidates
    already indexed) falls back to the full curated list rather than breaking /vote."""
    try:
        indexed = get_indexed_fandoms()
    except Exception:
        return list(VOTE_CANDIDATES)
    eligible = [c for c in VOTE_CANDIDATES if c not in indexed]
    return eligible or list(VOTE_CANDIDATES)


def _vote_state(ballot: dict, user: Optional[dict], known_vote: Optional[str] = None) -> dict:
    """Public ballot state: the 4 fandoms, 0-filled tallies, total, and (if signed
    in) the caller's own current pick.

    `known_vote` lets the POST path report the vote it just cast directly, rather
    than a follow-up read that DynamoDB's eventual consistency could answer stale."""
    raw = user_store.tally_votes(ballot["ballot_id"])
    tallies = {f: raw.get(f, 0) for f in ballot["fandoms"]}
    if known_vote is not None:
        your_vote = known_vote
    else:
        your_vote = user_store.get_user_vote(ballot["ballot_id"], user["id"]) if user else None
    return {
        "fandoms": ballot["fandoms"],
        "tallies": tallies,
        "total": sum(tallies.values()),
        "your_vote": your_vote,
    }


@app.get("/vote")
def get_vote(user: Optional[dict] = Depends(get_optional_user)):
    """The current 4-fandom ballot + tallies (public). Includes the caller's own
    vote when signed in."""
    ballot = user_store.get_or_create_ballot(_eligible_vote_candidates())
    return _vote_state(ballot, user)


@app.post("/vote")
def cast_vote(body: VoteRequest, user: dict = Depends(get_current_user)):
    """Cast (or change) the signed-in user's one vote. Sign-in is required —
    get_current_user 401s otherwise."""
    ballot = user_store.get_or_create_ballot(_eligible_vote_candidates())
    if body.fandom not in ballot["fandoms"]:
        raise HTTPException(status_code=400, detail="That fandom isn't on the current ballot.")
    user_store.cast_vote(ballot["ballot_id"], user["id"], body.fandom)
    return _vote_state(ballot, user, known_vote=body.fandom)


def _blend_embeddings(hyde_emb: list[float], raw_emb: list[float], hyde_weight: float = 0.7) -> list[float]:
    """Weighted blend of HyDE and raw query embeddings.
    
    Protects against cases where LLM expansion drifts from user intent.
    0.7 HyDE + 0.3 raw is the recommended ratio from the research.
    """
    h = np.array(hyde_emb)
    r = np.array(raw_emb)
    blended = hyde_weight * h + (1 - hyde_weight) * r
    # Re-normalize after blending
    norm = np.linalg.norm(blended)
    if norm > 0:
        blended = blended / norm
    return blended.tolist()


ALL_FANDOMS = "All Fandoms"


@app.get("/fandoms")
def get_fandoms(request: Request):
    """Returns supported fandoms with their collection status.

    Stable read (changes only on a manual re-index), so it carries an ETag +
    Cache-Control and honors If-None-Match with a 304 (RFC 9111).
    """
    indexed = get_indexed_fandoms()
    body = {
        "fandoms": [
            {"name": ALL_FANDOMS, "collected": True},
            *[
                {"name": fandom, "collected": fandom in indexed}
                for fandom in FANDOMS
            ],
        ]
    }
    digest = hashlib.sha256(
        json.dumps(body, separators=(",", ":"), sort_keys=True).encode()
    ).hexdigest()[:32]
    etag = f'"{digest}"'
    cache_headers = {"ETag": etag, "Cache-Control": "public, max-age=300"}
    if request.headers.get("if-none-match") == etag:
        return Response(status_code=304, headers=cache_headers)
    return JSONResponse(content=body, headers=cache_headers)


class SearchVariant(BaseModel):
    """One pre-fusion retrieval list: how a single query variant (the raw query or
    one HyDE rewrite) ranks the corpus before RRF fusion + LLM re-ranking."""
    key: str  # "raw" | "hyde-1" | "hyde-2" | "hyde-3"
    label: str  # the exact prompt text this list was retrieved with
    fics: list[Fic]


class SearchWithVariantsResponse(BaseModel):
    """Shape of GET /search?include_variants=true (plain list[Fic] otherwise)."""
    results: list[Fic]
    variants: list[SearchVariant]


@app.get("/search", response_model=Union[SearchWithVariantsResponse, list[Fic]])
async def search(
    # NOTE: async, but every pipeline step (enhance_query, embed_query,
    # search_rrf, rank, increment_searches) is a *blocking* call, so each one is
    # offloaded via run_in_threadpool — searches from different clients still
    # run concurrently and the event loop stays free (even /health), same as the
    # old sync-def-in-threadpool route. Being async is what lets us await
    # request.is_disconnected() between stages: when the client cancels (the
    # Next proxy aborts its upstream request on the browser's AbortSignal), we
    # bail before the next Bedrock/Gemini/Postgres call instead of running the
    # whole pipeline for a socket that's already closed.
    request: Request,
    q: str = Query(..., max_length=1000, description="Natural language search query"),
    fandom: Optional[str] = Query(None, description="Fandom name from /fandoms"),
    limit: int = Query(20, ge=1, le=100, description="Number of results to return"),
    strict: bool = Query(False, description="Apply enhancer-extracted filters as hard SQL WHERE clauses (debug toggle)"),
    include_variants: bool = Query(
        False,
        description="Also return the pre-fusion retrieval list per query variant (raw + HyDE rewrites)",
    ),
    user: Optional[dict] = Depends(get_optional_user),
):
    _t0 = time.perf_counter()

    # Search is open to everyone — nothing is paywalled — so `user` is None for an
    # anonymous request. Derive stable analytics fields that work either way.
    user_id = user["id"] if user else "anonymous"
    tier = user.get("tier") if user else "anonymous"

    async def client_gone(stage: str) -> bool:
        """Cancellation checkpoint. True means the client already hung up, so
        nothing we compute can be delivered — callers bail with a 499 (which
        the server discards; there's no socket left to write it to)."""
        if not await request.is_disconnected():
            return False
        _log(
            "search_cancelled",
            user_id=user_id,
            fandom=fandom,
            stage=stage,
            latency_ms=round((time.perf_counter() - _t0) * 1000, 1),
        )
        return True

    if not fandom:
        raise HTTPException(status_code=400, detail="Fandom is required.")
    is_all_fandoms = fandom == ALL_FANDOMS
    if not is_all_fandoms and fandom not in FANDOMS:
        raise HTTPException(status_code=400, detail=f"Unknown fandom '{fandom}'. See /fandoms.")
    count_filter = None if is_all_fandoms else fandom
    if await run_in_threadpool(get_fic_count, count_filter) == 0:
        label = "any fandom" if is_all_fandoms else f"'{fandom}'"
        raise HTTPException(status_code=404, detail=f"No fics indexed for {label}. Run the indexer first.")

    search_fandom = None if is_all_fandoms else fandom

    # Step 1: Enhance the query (HyDE — generate 3 hypothetical fic descriptions at different angles)
    if await client_gone("before_enhance"):
        return Response(status_code=499)
    enriched = await run_in_threadpool(enhance_query, q, fandom=search_fandom)

    # Build hard-filter dict from enhancer output (only when strict=True).
    # Schema-supported filters: min_word_count, max_word_count, excluded_tags.
    # rating/warnings/completion_status are ignored — those columns don't exist.
    filters: dict = {}
    if strict:
        ao3 = enriched.ao3_filters or {}
        ffn = enriched.ffn_filters or {}
        mins = [v for v in [ao3.get("min_word_count"), ffn.get("min_words")] if v]
        maxs = [v for v in [ao3.get("max_word_count"), ffn.get("max_words")] if v]
        if mins:
            filters["min_word_count"] = min(mins)
        if maxs:
            filters["max_word_count"] = max(maxs)
        if enriched.excluded_tags:
            filters["excluded_tags"] = enriched.excluded_tags

    # Step 2: Embed raw query once (shared across all angles)
    if await client_gone("before_embed"):
        return Response(status_code=499)
    raw_embedding = await run_in_threadpool(embed_query, q)

    # Step 3: Build query embeddings — 3 HyDE blends at varying ratios + 1 pure raw.
    # All embeddings fuse via Reciprocal Rank Fusion in one SQL round trip with
    # per-platform quotas (AO3/FFN/Wattpad), so no platform gets crowded out.
    descriptions = enriched.semantic_descriptions
    is_fallback = len(descriptions) == 1
    blend_ratios = [0.7] if is_fallback else [0.8, 0.7, 0.5]

    query_embeddings = [raw_embedding]
    for description, hyde_weight in zip(descriptions, blend_ratios):
        hyde_embedding = await run_in_threadpool(embed_query, description)
        blended = _blend_embeddings(hyde_embedding, raw_embedding, hyde_weight=hyde_weight)
        query_embeddings.append(blended)

    # In variant mode, also capture each embedding's pre-fusion retrieval list.
    # The variant lists share Fic objects with `candidates`, so the ranker's
    # in-place match_score writes below flow into them for free; sorting
    # `candidates` doesn't reorder the variant lists (separate list objects).
    variant_lists: Optional[list[list[Fic]]] = None
    if await client_gone("before_retrieve"):
        return Response(status_code=499)
    if include_variants:
        candidates, variant_lists = await run_in_threadpool(
            search_rrf_with_variants,
            embeddings=query_embeddings,
            fandom=search_fandom,
            per_platform_limit=40,
            total_limit=None,
            filters=filters or None,
        )
    else:
        candidates = await run_in_threadpool(
            search_rrf,
            embeddings=query_embeddings,
            fandom=search_fandom,
            per_platform_limit=40,
            total_limit=None,
            filters=filters or None,
        )

    # Step 4: AI rank the candidates against the original user query — the
    # single most expensive stage, so this checkpoint saves the most.
    if await client_gone("before_rank"):
        return Response(status_code=499)
    ranked = await run_in_threadpool(rank, fics=candidates, query=q)

    results = ranked[:limit]

    # Increment the per-user weekly counter only for signed-in users — an
    # anonymous search has no account to count against.
    if user is not None:
        await run_in_threadpool(user_store.increment_searches, user["id"])

    # ── Analytics ──────────────────────────────────────────────────
    # Two sinks, both best-effort: (1) a structured log line → CloudWatch (free,
    # queryable via Logs Insights, retroactive); (2) a durable DynamoDB event so
    # the history survives the weekly searches_used reset and powers time-series
    # metrics (searches/day, unique users, per-fandom volume, free-vs-paid).
    latency_ms = round((time.perf_counter() - _t0) * 1000, 1)
    _log(
        "search",
        user_id=user_id,
        tier=tier,
        fandom=fandom,
        all_fandoms=is_all_fandoms,
        strict=strict,
        candidates=len(candidates),
        returned=len(results),
        latency_ms=latency_ms,
    )
    await run_in_threadpool(
        user_store.record_search_event,
        user_id,
        fandom=search_fandom,
        tier=tier,
        strict=strict,
        candidates=len(candidates),
        returned=len(results),
        latency_ms=latency_ms,
    )

    if variant_lists is not None:
        # query_embeddings = [raw] + one HyDE blend per description, so
        # variant_lists[0] belongs to the raw query and variant_lists[i] to
        # descriptions[i-1]. Each list is capped like the merged results.
        return SearchWithVariantsResponse(
            results=results,
            variants=[
                SearchVariant(key="raw", label=q, fics=variant_lists[0][:limit]),
                *[
                    SearchVariant(key=f"hyde-{i}", label=desc, fics=v[:limit])
                    for i, (desc, v) in enumerate(zip(descriptions, variant_lists[1:]), start=1)
                ],
            ],
        )
    return results


@app.get("/health")
def health():
    return {"status": "ok"}


# Shared-secret gate for the internal admin/ops surface. Optional by design so the
# ops dashboard keeps working until an operator opts in: when ADMIN_API_TOKEN is set,
# /admin/* requires a matching X-Admin-Token header; when unset, access is unchanged.
ADMIN_API_TOKEN = os.environ.get("ADMIN_API_TOKEN", "")


def require_admin(x_admin_token: str = Header(None)) -> None:
    """Authorize an admin request when ADMIN_API_TOKEN is configured.

    No-op if ADMIN_API_TOKEN is unset (preserves prior open behavior). When set,
    requires the X-Admin-Token header to match exactly, else 403.
    """
    if not ADMIN_API_TOKEN:
        return
    import hmac

    if not x_admin_token or not hmac.compare_digest(x_admin_token, ADMIN_API_TOKEN):
        raise HTTPException(status_code=403, detail="Admin authorization required")


def require_admin_strict(x_admin_token: str = Header(None)) -> None:
    """Fail-CLOSED admin gate for DESTRUCTIVE actions.

    require_admin is open-by-default when ADMIN_API_TOKEN is unset — acceptable for
    read-only stats, but not for a route that wipes state. This variant treats an
    unconfigured token as not-found, so ballot reset can never run without a
    configured, matching token (no anonymous internet caller can DoS the vote).
    """
    if not ADMIN_API_TOKEN:
        raise HTTPException(status_code=404, detail="Not found")
    import hmac

    if not x_admin_token or not hmac.compare_digest(x_admin_token, ADMIN_API_TOKEN):
        raise HTTPException(status_code=403, detail="Admin authorization required")


@app.get("/admin/stats")
def admin_stats(_: None = Depends(require_admin)):
    """Internal endpoint — per-fandom DB stats for the ops dashboard."""
    stats = get_admin_stats()
    stats["supported_fandoms"] = list(FANDOMS.keys())
    return stats


@app.get("/admin/requests")
def admin_requests(
    status: Optional[str] = Query(None, description="Filter by request status"),
    _: None = Depends(require_admin),
):
    """Internal endpoint — fandom-sponsorship orders for the operator to fulfill."""
    return {"requests": user_store.list_fandom_requests(status)}


@app.post("/admin/vote/reset")
def admin_reset_vote(_: None = Depends(require_admin_strict)):
    """Internal endpoint — start a fresh voting round with a new random 4
    (run after indexing the previous round's winner). Destructive → fail-closed auth."""
    return user_store.reset_ballot(_eligible_vote_candidates())