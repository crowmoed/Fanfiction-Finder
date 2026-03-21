import os
import json
from dotenv import load_dotenv
from typing import Optional
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from data.schema import Fic

load_dotenv()

from google import genai
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))


def rank(fics: list[Fic], query: str) -> list[Fic]:
    if not fics:
        return []


    fic_list = []
    for i, fic in enumerate(fics):
        fic_list.append({
            "index": i,
            "title": fic.title,
            "summary": fic.summary or "",
            "tags": fic.tags[:10],  
        })

    prompt = f"""You are a fanfiction recommendation engine.

    A user is looking for: "{query}"

    Below is a list of fanfics. Score each one from 0-100 based on how well it matches what the user is looking for.
    Consider the title, summary, and tags when scoring.

    Return ONLY a JSON array with no explanation, no markdown, no backticks. Format:
    [
    {{"index": 0, "score": 85, "reason": "one line explanation"}},
    {{"index": 1, "score": 42, "reason": "one line explanation"}},
    ...
    ]

    Fanfics:
    {json.dumps(fic_list, indent=2)}
    """

    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt
        )
        raw = response.text.strip()

        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        raw = raw.strip()

        scores = json.loads(raw)

        score_map = {item["index"]: item for item in scores}
        for i, fic in enumerate(fics):
            if i in score_map:
                fic.match_score = score_map[i]["score"]
                fic.match_reason = score_map[i]["reason"]
            else:
                fic.match_score = 0
                fic.match_reason = "Not scored"

        fics.sort(key=lambda f: f.match_score, reverse=True)
        return fics

    except Exception as e:
        print(f"Ranking error: {e}")
        fics.sort(key=lambda f: f.kudos or 0, reverse=True)
        return fics