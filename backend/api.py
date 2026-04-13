from contextlib import asynccontextmanager
from fastapi import FastAPI, Query, HTTPException, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import numpy as np

from data.schema import Fic
from data.fandoms import FANDOMS
from ai.embedder import embed_query
from ai.query_enhancer import enhance_query
from ai.ranker import rank
from db.postgres import search_similar, get_fic_count, get_indexed_fandoms, get_admin_stats, engine
from sqlalchemy import text

from auth.auth import verify_google_token, create_jwt
from auth.user_store import user_store
from auth.dependencies import get_current_user, check_search_limit
from auth.stripe_handler import create_checkout_session, handle_webhook


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Safe migration — adds indexed_at column if it doesn't exist yet
    with engine.connect() as conn:
        conn.execute(text(
            "ALTER TABLE fics ADD COLUMN IF NOT EXISTS indexed_at TIMESTAMPTZ DEFAULT NOW()"
        ))
        conn.commit()
    yield


app = FastAPI(title="FicFinder API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Tighten to frontend origin in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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
    url = create_checkout_session(user["id"], user["email"])
    return {"url": url}


@app.post("/webhooks/stripe")
async def stripe_webhook(request: Request):
    """Stripe webhook endpoint — no auth, raw body for signature verification."""
    payload = await request.body()
    sig_header = request.headers.get("Stripe-Signature", "")
    try:
        handle_webhook(payload, sig_header)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid payload")
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid signature")
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


@app.get("/fandoms")
def get_fandoms():
    """Returns supported fandoms with their collection status."""
    indexed = get_indexed_fandoms()
    return {
        "fandoms": [
            {"name": fandom, "collected": fandom in indexed}
            for fandom in FANDOMS
        ]
    }


@app.get("/search", response_model=list[Fic])
async def search(
    q: str = Query(..., description="Natural language search query"),
    fandom: Optional[str] = Query(None, description="Fandom name from /fandoms"),
    limit: int = Query(20, ge=1, le=100, description="Number of results to return"),
    user: dict = Depends(check_search_limit),
):
    if not fandom:
        raise HTTPException(status_code=400, detail="Fandom is required.")
    if fandom not in FANDOMS:
        raise HTTPException(status_code=400, detail=f"Unknown fandom '{fandom}'. See /fandoms.")
    if get_fic_count(fandom) == 0:
        raise HTTPException(status_code=404, detail=f"No fics indexed for '{fandom}'. Run the indexer first.")

    print(f"\n[search] ── new request ──────────────────", flush=True)
    print(f"[search] fandom : {fandom!r}", flush=True)
    print(f"[search] query  : {q!r}", flush=True)

    # Step 1: Enhance the query (HyDE — generate 3 hypothetical fic descriptions at different angles)
    enriched = enhance_query(q, fandom=fandom)
    print(f"[search] enhanced query ready ({len(enriched.semantic_descriptions)} descriptions)", flush=True)

    # Step 2: Embed raw query once (shared across all angles)
    raw_embedding = embed_query(q)
    print(f"[search] raw embedding ready ({len(raw_embedding)} dims)", flush=True)

    # Step 3: Multi-angle HyDE search — 3 blended at varying ratios + 1 pure raw; merge results
    # fic_id -> (fic, best_position): lower position = higher cosine similarity
    merged: dict[str, tuple] = {}
    descriptions = enriched.semantic_descriptions
    is_fallback = len(descriptions) == 1

    # Normal: desc1=0.8/0.2, desc2=0.7/0.3, desc3=0.5/0.5. Fallback: single desc at 0.7/0.3.
    blend_ratios = [0.7] if is_fallback else [0.8, 0.7, 0.5]

    for angle_idx, (description, hyde_weight) in enumerate(zip(descriptions, blend_ratios)):
        hyde_embedding = embed_query(description)
        blended = _blend_embeddings(hyde_embedding, raw_embedding, hyde_weight=hyde_weight)
        results = search_similar(blended, fandom=fandom, limit=50)
        print(f"[search] angle {angle_idx + 1}: blend {hyde_weight}/{round(1 - hyde_weight, 1)}, {len(results)} results", flush=True)
        for pos, fic in enumerate(results):
            fic_id = f"{fic.platform}:{fic.url}"
            if fic_id not in merged or pos < merged[fic_id][1]:
                merged[fic_id] = (fic, pos)

    # Final search: pure raw query embedding, no blend
    raw_results = search_similar(raw_embedding, fandom=fandom, limit=50)
    print(f"[search] raw search: {len(raw_results)} results", flush=True)
    for pos, fic in enumerate(raw_results):
        fic_id = f"{fic.platform}:{fic.url}"
        if fic_id not in merged or pos < merged[fic_id][1]:
            merged[fic_id] = (fic, pos)

    # Deduplicated by best position (proxy for highest similarity), capped at 100
    candidates = [fic for fic, _ in sorted(merged.values(), key=lambda x: x[1])][:100]
    total_searches = len(blend_ratios) + 1
    print(f"[search] {len(candidates)} unique candidates after {total_searches} search(es)", flush=True)

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


@app.get("/admin/stats")
def admin_stats():
    """Internal endpoint — per-fandom DB stats for the ops dashboard."""
    stats = get_admin_stats()
    stats["supported_fandoms"] = list(FANDOMS.keys())
    return stats