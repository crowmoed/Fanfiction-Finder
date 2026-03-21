from fastapi import FastAPI, Query, HTTPException
from typing import Optional

from data.schema import Fic
from data.fandoms import FANDOMS
from ai.embedder import embed_query
from ai.ranker import rank
from db.postgres import search_similar, get_fic_count

app = FastAPI(title="FicFinder API")


@app.get("/fandoms")
def get_fandoms():
    """Returns supported fandoms and how many fics are indexed per fandom."""
    result = {}
    for fandom in FANDOMS:
        result[fandom] = get_fic_count(fandom)
    return {"fandoms": result}


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

    # Embed the query
    query_embedding = embed_query(q)

    # Vector search — get top 50 candidates
    candidates = search_similar(query_embedding, fandom=fandom, limit=50)

    # AI rank the candidates
    ranked = rank(fics=candidates, query=q)

    return ranked[:limit]


@app.get("/health")
def health():
    return {"status": "ok"}