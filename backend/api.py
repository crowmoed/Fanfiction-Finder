from contextlib import asynccontextmanager
from fastapi import FastAPI, Query, HTTPException
from typing import Optional
import numpy as np

from data.schema import Fic
from data.fandoms import FANDOMS
from ai.embedder import embed_query
from ai.query_enhancer import enhance_query
from ai.ranker import rank
from db.postgres import search_similar, get_fic_count, get_indexed_fandoms, get_admin_stats, engine
from sqlalchemy import text


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
    limit: int = Query(20, ge=1, le=100, description="Number of results to return")
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

    # Step 1: Enhance the query (HyDE — generate hypothetical fic description)
    enriched = enhance_query(q, fandom=fandom)
    print(f"[search] enhanced query ready", flush=True)

    # Step 2: Embed both the HyDE description and raw query, then blend
    hyde_embedding = embed_query(enriched.semantic_description)
    raw_embedding = embed_query(q)
    query_embedding = _blend_embeddings(hyde_embedding, raw_embedding)
    print(f"[search] blended embedding ready ({len(query_embedding)} dims)", flush=True)

    # Step 3: Vector search — get top candidates
    candidates = search_similar(query_embedding, fandom=fandom, limit=200)
    print(f"[search] {len(candidates)} candidates from vector search", flush=True)

    # Step 4: AI rank the candidates
    ranked = rank(fics=candidates, query=q)
    print(f"[search] ranking done, returning {min(limit, len(ranked))} results", flush=True)

    return ranked[:limit]


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/admin/stats")
def admin_stats():
    """Internal endpoint — per-fandom DB stats for the ops dashboard."""
    stats = get_admin_stats()
    stats["supported_fandoms"] = list(FANDOMS.keys())
    return stats