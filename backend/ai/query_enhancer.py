"""
Query enhancer for FicFinder — HyDE-style expansion via Gemini Flash.

Takes a short user query like "Drarry angst no MCD" and produces:
  1. A semantic_description (hypothetical fic summary) → gets embedded for vector search
  2. Structured tags/filters/ships/characters → for future BM25 / metadata filtering

This is a single Gemini Flash call using structured JSON output.
"""

import os
import sys
import json

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from google import genai
from google.genai import types
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
FLASH_MODEL = "gemini-2.5-flash"


# ── Schema ────────────────────────────────────────────────────────────────────

class EnrichedQuery(BaseModel):
    semantic_description: str        # Dense paragraph for embedding (HyDE-style)
    ao3_tags: list[str]              # Canonical AO3 tag suggestions
    ao3_filters: dict                # Rating, warning, category, word count, etc.
    ffn_keywords: list[str]          # FFN-compatible search terms
    ffn_filters: dict                # FFN genre, rating, length filters
    detected_fandoms: list[str]      # Extracted fandom references
    detected_ships: list[str]        # Extracted relationship/ship references
    detected_characters: list[str]   # Extracted character references
    excluded_tags: list[str]         # Anything the user wants to avoid


# ── System prompt ─────────────────────────────────────────────────────────────

SYSTEM_PROMPT = """You are a fanfiction search query enhancer for FicFinder. Your job is to transform short, informal user search queries into enriched representations optimized for semantic search and structured filtering across AO3 and FFN.

For every query, you must produce a JSON object with these fields:

1. "semantic_description": Write a 2-4 sentence hypothetical fanfiction summary that matches what the user is looking for. Write it as if describing an ideal search result — a fanfic summary paragraph covering the tropes, relationship dynamics, emotional tone, and narrative premise implied by the query. Use natural, descriptive prose. Include relevant AO3 trope names and common fanfiction terminology woven naturally into the text. Do NOT hallucinate specific titles, authors, or plot details.

2. "ao3_tags": List of canonical AO3 freeform/relationship tags relevant to the query.

3. "ao3_filters": Object with any of: rating, warnings, category, completion_status, min_word_count, max_word_count. Only include filters the user explicitly or strongly implicitly requests.

4. "ffn_keywords": List of FFN-compatible keyword search terms.

5. "ffn_filters": Object with any of: rating, genre, status, min_words, max_words. Only include filters explicitly requested.

6. "detected_fandoms": Fandoms mentioned or implied in the query.

7. "detected_ships": Relationships detected, in canonical AO3 format (use "/" for romantic, "&" for platonic).

8. "detected_characters": Individual characters referenced.

9. "excluded_tags": Anything the user wants to avoid ("no MCD", "no non-con", etc.)

Key rules:
- Expand portmanteau ship names: "Drarry" = "Draco Malfoy/Harry Potter", "Destiel" = "Dean Winchester/Castiel", "Johnlock" = "Sherlock Holmes/John Watson", "Stucky" = "James 'Bucky' Barnes/Steve Rogers"
- Map informal trope names to canonical AO3 tags: "coffee shop AU" = "Alternate Universe - Coffee Shops & Cafés", "soulmate AU" = "Alternate Universe - Soulmates", "5+1" = "5+1 Things", "fix it" = "Fix-It", "dead dove" = "Dead Dove: Do Not Eat"
- Include related/adjacent tropes the user likely wants: "enemies to lovers" often co-occurs with "Slow Burn", "Mutual Pining", "Tension"
- For vibe/mood queries ("something sad", "feel-good"), map to appropriate trope tags AND describe the emotional tone in the semantic description
- Use "/" for romantic and "&" for platonic relationships in AO3 tag format
- If the query mentions excluding something ("no MCD", "no non-con"), put those in excluded_tags
- Leave filter fields as empty objects {} when the user doesn't specify them

Example input: "hurt/comfort enemies to lovers"
Example output:
{
  "semantic_description": "A story where two characters who start as enemies or rivals are forced together by circumstance, and one is hurt or in emotional distress. Through vulnerability and reluctant caretaking, their antagonism slowly transforms into deep affection and eventually romance. Themes of hurt/comfort, emotional healing, trust-building, and the tension between hatred and attraction.",
  "ao3_tags": ["Hurt/Comfort", "Enemies to Lovers", "Slow Burn", "Emotional Hurt/Comfort", "Mutual Pining", "Angst with a Happy Ending"],
  "ao3_filters": {},
  "ffn_keywords": ["hurt comfort", "enemies to lovers", "rivals to romance"],
  "ffn_filters": {},
  "detected_fandoms": [],
  "detected_ships": [],
  "detected_characters": [],
  "excluded_tags": []
}

Example input: "long completed Drarry slow burn explicit"
Example output:
{
  "semantic_description": "A lengthy, completed fanfiction featuring a slow-developing romantic and sexual relationship between Draco Malfoy and Harry Potter. The story builds tension gradually over many chapters, with the characters navigating their complicated history, mutual attraction, and eventual intimate relationship. A slow burn Drarry romance with explicit content and substantial narrative depth.",
  "ao3_tags": ["Slow Burn", "Draco Malfoy/Harry Potter", "Enemies to Lovers", "Sexual Content", "Romance", "Post-Hogwarts"],
  "ao3_filters": {"rating": "Explicit", "category": "M/M", "completion_status": "Complete", "min_word_count": 50000},
  "ffn_keywords": ["Draco Harry slow burn romance"],
  "ffn_filters": {"rating": "M", "genre": "Romance", "status": "Complete", "min_words": 60000},
  "detected_fandoms": ["Harry Potter - J. K. Rowling"],
  "detected_ships": ["Draco Malfoy/Harry Potter"],
  "detected_characters": ["Draco Malfoy", "Harry Potter"],
  "excluded_tags": []
}"""


# ── Main function ─────────────────────────────────────────────────────────────

def enhance_query(user_query: str, fandom: str = None) -> EnrichedQuery:
    """Expand a raw user query into a rich semantic description + structured filters.
    
    Returns an EnrichedQuery with:
      - semantic_description: the HyDE paragraph to embed
      - structured fields: tags, filters, ships, characters, exclusions
    """
    # Add fandom context if provided
    query_text = user_query
    if fandom:
        query_text = f"[Fandom: {fandom}] {user_query}"

    print(f"[query_enhancer] enhancing: {query_text!r}", flush=True)

    try:
        response = client.models.generate_content(
            model=FLASH_MODEL,
            contents=f'Enhance this fanfiction search query: "{query_text}"',
            config=types.GenerateContentConfig(
                system_instruction=SYSTEM_PROMPT,
                response_mime_type="application/json",
                response_schema=EnrichedQuery.model_json_schema(),
                temperature=0.1,
            )
        )

        raw = response.text.strip()
        data = json.loads(raw)
        enriched = EnrichedQuery(**data)

        print(f"[query_enhancer] semantic_description: {enriched.semantic_description[:100]}...", flush=True)
        print(f"[query_enhancer] ao3_tags: {enriched.ao3_tags}", flush=True)
        print(f"[query_enhancer] ships: {enriched.detected_ships}", flush=True)
        print(f"[query_enhancer] excluded: {enriched.excluded_tags}", flush=True)

        return enriched

    except Exception as e:
        print(f"[query_enhancer] ERROR: {e} — falling back to raw query", flush=True)
        # Fallback: return the raw query as the semantic description
        return EnrichedQuery(
            semantic_description=user_query,
            ao3_tags=[],
            ao3_filters={},
            ffn_keywords=[],
            ffn_filters={},
            detected_fandoms=[fandom] if fandom else [],
            detected_ships=[],
            detected_characters=[],
            excluded_tags=[],
        )


if __name__ == "__main__":
    result = enhance_query("long completed Drarry angst no MCD", fandom="Harry Potter")
    print(f"\n{'='*50}")
    print(json.dumps(result.model_dump(), indent=2))