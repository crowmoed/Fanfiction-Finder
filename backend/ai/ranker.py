import os
import json
import boto3
from typing import Optional
from concurrent.futures import ThreadPoolExecutor
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from data.schema import Fic

bedrock = boto3.client("bedrock-runtime", region_name="us-east-1")

CHUNK_SIZE = 100


def _build_prompt(fic_list: list[dict], query: str) -> str:
    return f"""You are a fanfiction recommendation engine.

    A user is looking for: "{query}"

    Below is a list of fanfics. Score each one from 0-100 based on how well it matches what the user is looking for.
    Use absolute scores — if most fics are a strong match, most should score 70-90. If most are weak, most should score low.
    Do NOT spread scores artificially across the full range. Ties are fine.

    SCORING PRIORITY: The summary is the primary signal. It describes the actual
    plot, characters, and tone of the fic in the author's own words. Weight it
    most heavily. Use the title as a secondary signal. Tags are high-signal
    structured metadata (especially on AO3) — when they directly match query
    concepts like tropes, ships, or characters, weight them heavily.

    Return ONLY a JSON array with no explanation, no markdown, no backticks. Format:
    [
    {{"index": 0, "score": 85}},
    {{"index": 1, "score": 42}},
    ...
    ]

    Fanfics:
    {json.dumps(fic_list, indent=2)}
    """


def _format_tags(tags: list[str]) -> str:
    capped = tags[:20]
    joined = ", ".join(capped)
    if len(joined) > 400:
        joined = joined[:399] + "…"
    return joined


def _rank_chunk(fics_chunk: list[Fic], query: str, chunk_idx: int, base_offset: int) -> dict[int, int]:
    """Rank a single chunk. Returns {global_fic_index: score}. Indexes are
    chunk-local in the prompt, then remapped to global positions via base_offset.
    """
    fic_list = [
        {
            "index": i,
            "title": fic.title,
            "summary": fic.summary or "",
            "tags": _format_tags(fic.tags or []),
        }
        for i, fic in enumerate(fics_chunk)
    ]

    prompt = _build_prompt(fic_list, query)
    print(f"[ranker] chunk {chunk_idx}: ranking {len(fics_chunk)} fics", flush=True)

    response = bedrock.invoke_model(
        modelId="us.anthropic.claude-haiku-4-5-20251001-v1:0",
        body=json.dumps({
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": 8192,
            "temperature": 0.0,
            "system": "You are a fanfiction recommendation engine. Return ONLY a JSON array. No markdown, no backticks, no explanation.",
            "messages": [{"role": "user", "content": prompt}],
        }),
    )
    body = json.loads(response["body"].read())
    raw = body["content"][0]["text"].strip()
    if raw.startswith("```"):
        raw = raw.split("```", 2)[1]
        if raw.startswith("json"):
            raw = raw[4:]
        raw = raw.strip()

    scores = json.loads(raw)
    return {base_offset + item["index"]: item["score"] for item in scores}


def rank(fics: list[Fic], query: str) -> list[Fic]:
    if not fics:
        return []

    # Chunk into CHUNK_SIZE groups and rank in parallel. Each chunk scores
    # absolutely (0-100) per the prompt, so scores compose across chunks without
    # needing normalization. Fan-out keeps wall-clock latency near one call's
    # worth even when the candidate pool grows.
    chunks = []
    for start in range(0, len(fics), CHUNK_SIZE):
        chunks.append((start, fics[start:start + CHUNK_SIZE]))

    print(f"[ranker] ranking {len(fics)} fics in {len(chunks)} parallel chunk(s) for query: {query!r}", flush=True)

    score_map: dict[int, int] = {}
    succeeded = 0
    with ThreadPoolExecutor(max_workers=len(chunks)) as pool:
        future_meta = [
            (idx, offset, chunk_fics, pool.submit(_rank_chunk, chunk_fics, query, idx, offset))
            for idx, (offset, chunk_fics) in enumerate(chunks)
        ]
        for idx, offset, chunk_fics, fut in future_meta:
            try:
                score_map.update(fut.result())
                succeeded += 1
            except Exception as e:
                print(f"[ranker] chunk {idx} failed ({type(e).__name__}: {e}); assigning neutral score 50", flush=True)
                for local_i in range(len(chunk_fics)):
                    score_map.setdefault(offset + local_i, 50)

    if succeeded == 0:
        print("[ranker] DEGRADED: all chunks failed; falling back to kudos sort", flush=True)
        fics.sort(key=lambda f: f.kudos or 0, reverse=True)
        return fics

    for i, fic in enumerate(fics):
        fic.match_score = score_map.get(i, None)

    fics.sort(key=lambda f: (f.match_score is None, -(f.match_score or 0)))
    return fics
