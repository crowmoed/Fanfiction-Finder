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
from typing import Optional
import numpy as np

from data.schema import Fic
from data.fandoms import FANDOMS
from ai.embedder import embed_query
from ai.query_enhancer import enhance_query
from ai.ranker import rank
from db.postgres import search_rrf, get_fic_count, get_indexed_fandoms, get_admin_stats

from auth.auth import verify_google_token, create_jwt
from auth.user_store import user_store
from auth.dependencies import get_current_user, check_search_limit
from auth.stripe_handler import create_checkout_session, create_portal_session, handle_webhook
import stripe


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


def _stripe_url(fn, *args) -> str:
    """Call a Stripe session-creating fn, mapping StripeError → HTTP 502."""
    try:
        return fn(*args)
    except stripe.error.StripeError as e:
        msg = getattr(e, "user_message", None) or str(e)
        raise HTTPException(status_code=502, detail=f"Stripe error: {msg}")


@app.post("/auth/checkout")
def checkout(user: dict = Depends(get_current_user)):
    """Create a Stripe Checkout Session and return the URL."""
    return {"url": _stripe_url(create_checkout_session, user["id"], user["email"])}


@app.post("/auth/billing-portal")
def billing_portal(user: dict = Depends(get_current_user)):
    """Create a Stripe Billing Portal session so the user can cancel or manage billing."""
    customer_id = user.get("stripe_customer_id")
    if not customer_id:
        raise HTTPException(status_code=400, detail="No Stripe customer on file")
    return {"url": _stripe_url(create_portal_session, customer_id)}


@app.post("/webhooks/stripe")
async def stripe_webhook(request: Request):
    """Stripe webhook endpoint — no auth, raw body for signature verification."""
    payload = await request.body()
    sig_header = request.headers.get("Stripe-Signature", "")
    try:
        # handle_webhook is blocking (Stripe SDK + DynamoDB writes, plus a table
        # scan on subscription.deleted). This route must stay async for
        # `await request.body()`, so offload the blocking work to a thread rather
        # than running it on the event loop and freezing concurrent requests.
        await run_in_threadpool(handle_webhook, payload, sig_header)
    except ValueError:
        # Malformed payload — Stripe should not retry an unparseable body.
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError:
        # Bad/forged signature — reject; no side effects ran.
        raise HTTPException(status_code=400, detail="Invalid signature")
    except Exception:
        # Signature was valid but processing failed (e.g. transient DynamoDB error).
        # Return 500 so Stripe retries; the idempotency guard makes the retry safe.
        raise HTTPException(status_code=500, detail="Webhook processing error")
    return {"status": "ok"}


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


@app.get("/search", response_model=list[Fic])
def search(
    # NOTE: intentionally a plain `def`, not `async def`. Every step below
    # (enhance_query, embed_query, search_rrf, rank, increment_searches) is a
    # *blocking* call. In an async route those would freeze the event loop, so a
    # single in-flight search would block every other request on the worker
    # (even /health). As a sync route, FastAPI runs it in a threadpool, so
    # searches from different clients run concurrently.
    q: str = Query(..., max_length=1000, description="Natural language search query"),
    fandom: Optional[str] = Query(None, description="Fandom name from /fandoms"),
    limit: int = Query(20, ge=1, le=100, description="Number of results to return"),
    strict: bool = Query(False, description="Apply enhancer-extracted filters as hard SQL WHERE clauses (debug toggle)"),
    user: dict = Depends(check_search_limit),
):
    _t0 = time.perf_counter()
    if not fandom:
        raise HTTPException(status_code=400, detail="Fandom is required.")
    is_all_fandoms = fandom == ALL_FANDOMS
    if not is_all_fandoms and fandom not in FANDOMS:
        raise HTTPException(status_code=400, detail=f"Unknown fandom '{fandom}'. See /fandoms.")
    count_filter = None if is_all_fandoms else fandom
    if get_fic_count(count_filter) == 0:
        label = "any fandom" if is_all_fandoms else f"'{fandom}'"
        raise HTTPException(status_code=404, detail=f"No fics indexed for {label}. Run the indexer first.")

    search_fandom = None if is_all_fandoms else fandom

    # Step 1: Enhance the query (HyDE — generate 3 hypothetical fic descriptions at different angles)
    enriched = enhance_query(q, fandom=search_fandom)

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
    raw_embedding = embed_query(q)

    # Step 3: Build query embeddings — 3 HyDE blends at varying ratios + 1 pure raw.
    # All embeddings fuse via Reciprocal Rank Fusion in one SQL round trip with
    # per-platform quotas (AO3/FFN/Wattpad), so no platform gets crowded out.
    descriptions = enriched.semantic_descriptions
    is_fallback = len(descriptions) == 1
    blend_ratios = [0.7] if is_fallback else [0.8, 0.7, 0.5]

    query_embeddings = [raw_embedding]
    for description, hyde_weight in zip(descriptions, blend_ratios):
        hyde_embedding = embed_query(description)
        blended = _blend_embeddings(hyde_embedding, raw_embedding, hyde_weight=hyde_weight)
        query_embeddings.append(blended)

    candidates = search_rrf(
        embeddings=query_embeddings,
        fandom=search_fandom,
        per_platform_limit=40,
        total_limit=None,
        filters=filters or None,
    )

    # Step 4: AI rank the candidates against the original user query
    ranked = rank(fics=candidates, query=q)

    results = ranked[:limit]

    # Increment search count only after a successful search
    user_store.increment_searches(user["id"])

    # ── Analytics ──────────────────────────────────────────────────
    # Two sinks, both best-effort: (1) a structured log line → CloudWatch (free,
    # queryable via Logs Insights, retroactive); (2) a durable DynamoDB event so
    # the history survives the weekly searches_used reset and powers time-series
    # metrics (searches/day, unique users, per-fandom volume, free-vs-paid).
    latency_ms = round((time.perf_counter() - _t0) * 1000, 1)
    _log(
        "search",
        user_id=user["id"],
        tier=user.get("tier"),
        fandom=fandom,
        all_fandoms=is_all_fandoms,
        strict=strict,
        candidates=len(candidates),
        returned=len(results),
        latency_ms=latency_ms,
    )
    user_store.record_search_event(
        user["id"],
        fandom=search_fandom,
        tier=user.get("tier"),
        strict=strict,
        candidates=len(candidates),
        returned=len(results),
        latency_ms=latency_ms,
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


@app.get("/admin/stats")
def admin_stats(_: None = Depends(require_admin)):
    """Internal endpoint — per-fandom DB stats for the ops dashboard."""
    stats = get_admin_stats()
    stats["supported_fandoms"] = list(FANDOMS.keys())
    return stats