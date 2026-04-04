---
date: 2026-03-24
tags: [AI, embeddings, pipeline]
---
Basically read a research paper and it found that the effectevness of a 768 and 3072 Dimension vector in sentiment analysis using COS search is almost enitrely the same, so to save storage/money I decide to migrate the whole system to that 768 dimension vector. 

As well there were some small changes to the way we vectorized fanfics. with the tags going first instead of the description. Helps the embedding models with better assigning sentiment to the fics.
# Mar 24 — Embedding Pipeline Overhaul

## What happened
Breaking change to embedding format need to re-index all future fandoms 
## Changes made

### Format (embedder.py)
- **Tags first**: `Tags: {tags}. {title}. {summary}` — tags first improves transformer attention weighting and truncation survival
- Removed 15-tag cap
- Added `fandom` parameter to batch embedding

### Dimensions (postgres.py)
- Switched from `Vector(3072)` → `Vector(768)` (Matryoshka truncation)
- 4× cheaper storage with minimal quality loss // needed for our db

### Task types (embedder.py)
- `RETRIEVAL_DOCUMENT` for fic indexing
- `RETRIEVAL_QUERY` for search queries
- Asymmetric task types meaningfully improve retrieval quality

## Bug fixed
Ranker was assigning `0` (instead of `None`) to fics the LLM omitted, causing them to appear falsely scored. LLM ranker temporarily disabled — pgvector cosine order preserved until ranker is rebuilt.

## Links
- [[Mar 23 - HyDE Query Design]]
- [[Mar 29 - Auth Planning]]
- [[Mar 31 AM - DB Cleanup and Neon Migration]]
