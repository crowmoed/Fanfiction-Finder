---
date: 2026-04-04
tags: [scraping, reliability, embeddings]
---

# Apr 4 — Parallel Scraping + Retry Logic

## What happened
- Established safe parallelism rules for running multiple scrapers concurrently
- Added Gemini 429 retry with exponential backoff
- Confirmed embedding model decision: keep Gemini, don't migrate to Bedrock

## Parallel scraping rules
- **AO3/FFN**: rate-limit aggressively, IP-ban risk → max 1 concurrent scraper
- **Wattpad**: v4 API more tolerant → 1-2 concurrent scrapers ok
- **Safe pattern**: 1 AO3/FFN + 1-2 Wattpad from same IP
- **Database**: Neon handles concurrent inserts fine
- **Gemini embeddings**: shared rate limits across instances — add jitter or stagger

## Retry logic (tenacity)
Added to `embedder.py`:
- Catch `google.genai.errors.ClientError` (429/ResourceExhausted)
- Exponential backoff: starts 2s, max 30s, up to 5 retries
- Non-rate-limit errors raise immediately
- `embed_query()` / `embed_fic()`: max 3 retries (single calls)
- Existing `time.sleep(1)` between batches stays

## Embedding model confirmed: keep Gemini
Bedrock alternatives evaluated and rejected:
- **Titan Embed v2**: 1024 dims max, no Matryoshka, weaker MTEB scores
- **Cohere Embed v3**: competitive but adds another API dependency

`gemini-embedding-001` at 768-dim Matryoshka + asymmetric task types is the right choice. Embedding is index-time only anyway — near-zero runtime cost.

## Links
- [[Apr 3 - Wattpad Scraper]]
- [[Apr 4 - Multi account DB]]
