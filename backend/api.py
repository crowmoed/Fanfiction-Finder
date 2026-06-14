import os
import sys
import json
import logging
import time
import uuid
from contextlib import asynccontextmanager

# Force UTF-8 on stdout/stderr so the diagnostic print()s (which contain box-drawing
# and arrow characters) don't crash a request with UnicodeEncodeError on a non-UTF-8
# console (e.g. Windows cp1252 in local dev). No-op where stdout is already UTF-8.
for _stream in (sys.stdout, sys.stderr):
    try:
        _stream.reconfigure(encoding="utf-8")
    except (AttributeError, ValueError):
        pass
from fastapi import FastAPI, Query, HTTPException, Depends, Request, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional
import numpy as np

from data.schema import Fic
from data.fandoms import FANDOMS
from ai.embedder import embed_query
from ai.query_enhancer import enhance_query
from ai.ranker import rank
from db.postgres import search_rrf, get_fic_count, get_indexed_fandoms, get_admin_stats, ensure_vector_index, engine
from sqlalchemy import text

from auth.auth import verify_google_token, create_jwt
from auth.user_store import user_store
from auth.dependencies import get_current_user, check_search_limit
from auth.stripe_handler import create_checkout_session, create_portal_session, handle_webhook
import stripe


@asynccontextmanager
async def lifespan(app: FastAPI):
    # ensure_vector_index()  # skip on startup — HNSW build blocks if index is missing
    yield


# Interactive API docs (/docs, /redoc, /openapi.json) are disabled by default so the
# full schema isn't exposed in production. Set ENABLE_DOCS=1 to turn them back on
# (e.g. in a staging environment).
_DOCS_ENABLED = os.environ.get("ENABLE_DOCS", "") == "1"
app = FastAPI(
    title="FicFinder API",
    lifespan=lifespan,
    docs_url="/docs" if _DOCS_ENABLED else None,
    redoc_url="/redoc" if _DOCS_ENABLED else None,
    openapi_url="/openapi.json" if _DOCS_ENABLED else None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Tighten to frontend origin in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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
    try:
        response = await call_next(request)
    except Exception:
        # Unhandled error past the route — logged by the exception handler below;
        # re-raise so Starlette routes it there.
        raise
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
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail, "request_id": request_id},
        headers={"X-Request-ID": request_id} if request_id else None,
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
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "request_id": request_id},
        headers={"X-Request-ID": request_id} if request_id else None,
    )


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
    return {"token": token, "user": user}


@app.get("/auth/me")
def me(user: dict = Depends(get_current_user)):
    """Return the current user's profile (tier, searches remaining, etc.)."""
    return user


@app.post("/auth/checkout")
def checkout(user: dict = Depends(get_current_user)):
    """Create a Stripe Checkout Session and return the URL."""
    try:
        url = create_checkout_session(user["id"], user["email"])
    except stripe.error.StripeError as e:
        msg = getattr(e, "user_message", None) or str(e)
        raise HTTPException(status_code=502, detail=f"Stripe error: {msg}")
    return {"url": url}


@app.post("/auth/billing-portal")
def billing_portal(user: dict = Depends(get_current_user)):
    """Create a Stripe Billing Portal session so the user can cancel or manage billing."""
    customer_id = user.get("stripe_customer_id")
    if not customer_id:
        raise HTTPException(status_code=400, detail="No Stripe customer on file")
    try:
        url = create_portal_session(customer_id)
    except stripe.error.StripeError as e:
        msg = getattr(e, "user_message", None) or str(e)
        raise HTTPException(status_code=502, detail=f"Stripe error: {msg}")
    return {"url": url}


@app.post("/webhooks/stripe")
async def stripe_webhook(request: Request):
    """Stripe webhook endpoint — no auth, raw body for signature verification."""
    payload = await request.body()
    sig_header = request.headers.get("Stripe-Signature", "")
    try:
        handle_webhook(payload, sig_header)
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
def get_fandoms():
    """Returns supported fandoms with their collection status."""
    indexed = get_indexed_fandoms()
    return {
        "fandoms": [
            {"name": ALL_FANDOMS, "collected": True},
            *[
                {"name": fandom, "collected": fandom in indexed}
                for fandom in FANDOMS
            ],
        ]
    }


@app.get("/search", response_model=list[Fic])
async def search(
    q: str = Query(..., max_length=1000, description="Natural language search query"),
    fandom: Optional[str] = Query(None, description="Fandom name from /fandoms"),
    limit: int = Query(20, ge=1, le=100, description="Number of results to return"),
    strict: bool = Query(False, description="Apply enhancer-extracted filters as hard SQL WHERE clauses (debug toggle)"),
    user: dict = Depends(check_search_limit),
):
    if not fandom:
        raise HTTPException(status_code=400, detail="Fandom is required.")
    is_all_fandoms = fandom == ALL_FANDOMS
    if not is_all_fandoms and fandom not in FANDOMS:
        raise HTTPException(status_code=400, detail=f"Unknown fandom '{fandom}'. See /fandoms.")
    count_filter = None if is_all_fandoms else fandom
    if get_fic_count(count_filter) == 0:
        label = "any fandom" if is_all_fandoms else f"'{fandom}'"
        raise HTTPException(status_code=404, detail=f"No fics indexed for {label}. Run the indexer first.")

    print(f"\n[search] ── new request ──────────────────", flush=True)
    print(f"[search] fandom : {fandom!r}", flush=True)
    print(f"[search] query  : {q!r}", flush=True)
    print(f"[search] strict mode: {strict}", flush=True)

    search_fandom = None if is_all_fandoms else fandom

    # Step 1: Enhance the query (HyDE — generate 3 hypothetical fic descriptions at different angles)
    enriched = enhance_query(q, fandom=search_fandom)
    print(f"[search] enhanced query ready ({len(enriched.semantic_descriptions)} descriptions)", flush=True)

    # Build hard-filter dict from enhancer output (only when strict=True).
    # Schema-supported filters: min_word_count, max_word_count, excluded_tags.
    # rating/warnings/completion_status are logged but skipped — those columns don't exist.
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
        for key in ("rating", "warnings", "completion_status"):
            ffn_key = key.replace("completion_status", "status")
            if ao3.get(key) or ffn.get(ffn_key):
                print(f"[search] filter '{key}' requested but column not in schema — ignored", flush=True)

    # Step 2: Embed raw query once (shared across all angles)
    raw_embedding = embed_query(q)
    print(f"[search] raw embedding ready ({len(raw_embedding)} dims)", flush=True)

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
    print(f"[search] RRF fused {len(query_embeddings)} embeddings → {len(candidates)} candidates", flush=True)

    # Step 4: AI rank the candidates against the original user query
    ranked = rank(fics=candidates, query=q)
    print(f"[search] ranking done, returning {min(limit, len(ranked))} results", flush=True)

    results = ranked[:limit]

    # Increment search count only after a successful search
    user_store.increment_searches(user["id"])

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