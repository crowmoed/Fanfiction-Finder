import os
import json
import boto3
from typing import Optional
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from data.schema import Fic

bedrock = boto3.client("bedrock-runtime", region_name="us-east-1")


def rank(fics: list[Fic], query: str) -> list[Fic]:
    if not fics:
        return []

    fic_list = []
    for i, fic in enumerate(fics):
        fic_list.append({
            "index": i,
            "title": fic.title,
            "summary": fic.summary or "",
            "tags": fic.tags[:20],
        })

    prompt = f"""You are a fanfiction recommendation engine.

    A user is looking for: "{query}"

    Below is a list of fanfics. Score each one from 0-100 based on how well it matches what the user is looking for.
    Use absolute scores — if most fics are a strong match, most should score 70-90. If most are weak, most should score low.
    Do NOT spread scores artificially across the full range. Ties are fine.
    Consider the title, summary, and tags when scoring.

    Return ONLY a JSON array with no explanation, no markdown, no backticks. Format:
    [
    {{"index": 0, "score": 85}},
    {{"index": 1, "score": 42}},
    ...
    ]

    Fanfics:
    {json.dumps(fic_list, indent=2)}
    """

    try:
        print(f"[ranker] ranking {len(fics)} fics for query: {query!r}", flush=True)
        response = bedrock.invoke_model(
            modelId="us.anthropic.claude-haiku-4-5-20251001-v1:0",
            body=json.dumps({
                "anthropic_version": "bedrock-2023-05-31",
                "max_tokens": 4096,
                "temperature": 0.1,
                "system": "You are a fanfiction recommendation engine. Return ONLY a JSON array. No markdown, no backticks, no explanation.",
                "messages": [{"role": "user", "content": prompt}],
            }),
        )
        body = json.loads(response["body"].read())
        raw = body["content"][0]["text"].strip()
        print(f"[ranker] raw response: {raw[:200]}", flush=True)

        scores = json.loads(raw)

        score_map = {item["index"]: item["score"] for item in scores}
        for i, fic in enumerate(fics):
            fic.match_score = score_map.get(i, None)

        fics.sort(key=lambda f: f.match_score, reverse=True)
        return fics

    except Exception as e:
        print(f"Ranking error: {e}")
        fics.sort(key=lambda f: f.kudos or 0, reverse=True)
        return fics