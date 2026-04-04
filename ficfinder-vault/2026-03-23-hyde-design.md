# HyDE query design
**Date:** March 23, 2026  
**Tags:** #ai  
**Links:** ← [[2026-03-22-first-deploy]] → [[2026-03-24-embedding-overhaul]]

## What happened
Designed the query enhancement step before implementing it.

## Core idea
User types `"hurt/comfort enemies to lovers"` → Gemini rewrites it into a rich semantic prose paragraph → that paragraph gets embedded instead of the raw query.

This is HyDE (Hypothetical Document Embeddings): generate a fake document that looks like what you're searching for, embed it, then find real documents near it in vector space.

## Why prose, not tags
Prose embeds more richly. The corpus is fic summaries — prose aligns better with that embedding space than a flat tag list.

## Output schema (Pydantic)
```python
semantic_description: str  # HyDE paragraph, ~100-200 tokens
ao3_tags: list[str]
ao3_filters: dict
ffn_keywords: list[str]
ffn_filters: dict
detected_ships: list[str]
detected_characters: list[str]
excluded_tags: list[str]
```

## Key insight: dual schema enforcement
Use BOTH `response_schema` (Pydantic config) AND natural language description in the system prompt. Config-only enforcement degrades output quality ~5-10%. Both together is best.

## Status at end
Designed only — implementation comes in [[2026-03-24-embedding-overhaul]].
