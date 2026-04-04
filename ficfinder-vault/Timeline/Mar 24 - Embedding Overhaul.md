---
date: 2026-03-24
tags: [AI, embeddings, pipeline]
---

# Mar 24 — Embedding Pipeline Overhaul

## What happened
Breaking change to embedding format — full re-index required for all future fandoms (Naruto already indexed at old format).

## Changes made

### Format (embedder.py)
- **Tags first**: `Tags: {tags}. {title}. {summary}` — tags first improves transformer attention weighting and truncation survival
- Removed 15-tag cap
- Added `fandom` parameter to batch embedding

### Dimensions (postgres.py)
- Switched from `Vector(3072)` → `Vector(768)` (Matryoshka truncation)
- 4× cheaper storage with minimal quality loss
- Added `migrate_embedding_dimensions()` to detect/recreate mismatched columns at startup
- Added null-embedding filter to `search_similar()`

### Task types (embedder.py)
- `RETRIEVAL_DOCUMENT` for fic indexing
- `RETRIEVAL_QUERY` for search queries
- Asymmetric task types meaningfully improve retrieval quality

### Normalization
- Added L2 normalization via numpy — Gemini 768-dim outputs are NOT pre-normalized

## Bug fixed
Ranker was assigning `0` (instead of `None`) to fics the LLM omitted, causing them to appear falsely scored. LLM ranker temporarily disabled — pgvector cosine order preserved until ranker is rebuilt.

## Links
- [[Mar 23 - HyDE Query Design]]
- [[Mar 29 - Auth Planning]]
- [[Mar 31 AM - DB Cleanup and Neon Migration]]
