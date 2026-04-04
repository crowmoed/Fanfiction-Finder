# Parallel scraping + retry logic
**Date:** April 4, 2026  
**Tags:** #scraping #ai  
**Links:** ← [[2026-04-03-wattpad-scraper]] → [[2026-04-04-today]]

## What happened
Established safe parallelism rules and added Gemini rate limit handling.

## Safe parallelism
- **AO3/FFN:** Max 1 scraper at a time (same IP → rate limit / IP ban risk)
- **Wattpad:** 1-2 concurrent scrapers OK (v4 API, more tolerant)
- **Recommended pattern:** Different platforms concurrently (AO3 for fandom A, Wattpad for fandom B)
- **DB:** Neon handles concurrent inserts fine

## Gemini 429 retry (tenacity)
Added exponential backoff to `embedder.py`:
- `embed_fics_batch()`: retry up to 5×, backoff 2s→30s
- `embed_query()` / `embed_fic()`: retry up to 3×
- Only retries on rate-limit errors, raises immediately on others
- `tenacity` already in requirements.txt

## Bedrock embedding comparison
Confirmed keeping `gemini-embedding-001`:
- Bedrock Titan Embed v2: 1024 dims max, no Matryoshka, weaker MTEB
- Cohere Embed v3: competitive but adds another API dependency
- Switching = re-embed entire corpus, not worth it
