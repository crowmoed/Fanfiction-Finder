# Backend architecture map

Orientation for the FicFinder backend (`D:\Fanfiction-Finder\backend`). Distilled from a full read of ~5000 lines and verified against source. Treat this as the working mental model; `CLAUDE.md` and `ARCHITECTURE.md` exist but have drifted (see Drift below).

## One-liner

A FastAPI service doing **semantic search over a pre-built index** — never live scraping at query time. Two separate halves share only a schema + DB:
- **Index-time (offline, manual):** `indexer.py` drives scrapers → Gemini embeds → upserts into Neon Postgres + local parquet. Runs on the host (real Chrome), hours per fandom, no scheduler.
- **Query-time (online, sub-second):** `api.py:/search` → enhance → embed → RRF retrieve → LLM rerank → JSON.

## The live search path (most important to know)

```
Frontend proxy POST /api/search ──(blocking GET, limit=100)──► Backend GET /search  (sync def → threadpool)
 1. check_search_limit dep → get_current_user (JWT → DynamoDB user, weekly reset, verify_paid_user)
      ⚠ the 429 cap is DISABLED in beta — auth still required, no quota enforced
 2. validate fandom (400) · get_fic_count → 404 if 0 indexed
 3. enhance_query(q)  → Bedrock Claude Haiku 4.5 → EnrichedQuery w/ EXACTLY 3 HyDE summaries
      ⚠ any error OR count≠3 → silent fallback to [raw_query] (→ 2 vectors instead of 4)
 4. embed_query(q)    → Gemini gemini-embedding-001, 768-dim, RETRIEVAL_QUERY, L2-normalized
 5. build 4 vectors: [raw] + 3 HyDE blends at weights 0.8/0.7/0.5  (_blend_embeddings)
 6. search_rrf(4 vecs, per_platform_limit=40, total_limit=None)
      → 4 embeddings × 3 platforms = 12 ranked pgvector CTEs in ONE SQL round trip
      → fused by Reciprocal Rank Fusion, SUM 1/(60+rank); returns the FULL deduped pool
 7. rank(candidates, q) → Bedrock Haiku, 200/chunk in parallel, scores 0–100 vs the RAW query (not HyDE)
      omitted fics → match_score=None (not 0); ALL chunks fail → fall back to kudos sort
 8. ranked[:limit] · increment_searches (only on success) · _log + record_search_event
 ▼
Backend returns a PLAIN JSON array of Fic — NOT a stream.
The SSE "pipeline status" events are FABRICATED in the Next.js proxy with setTimeout — cosmetic, not real backend progress.
```

## Module map

| Area | Files | Role |
|---|---|---|
| HTTP + orchestration | `api.py` | 11 endpoints, search pipeline, request-ID JSON logging, exception masking, CORS, docs gating |
| AI pipeline | `ai/query_enhancer.py`, `ai/embedder.py`, `ai/ranker.py` | HyDE enhancer (Bedrock Haiku 4.5) · Gemini 768-dim embedder · Haiku reranker |
| Data layer | `db/postgres.py`, `db/local_storage.py` | `FicRecord` model, Neon pooler engine, `search_rrf` (live), `search_similar` (legacy), parquet/numpy store for the devtool |
| Scrapers | `scrapers/{ao3,ffn,wattpad}.py` | AO3/FFN = SeleniumBase UC + BS4 (real Chrome); Wattpad = pure HTTP v4 API w/ vote-ratio calibration + offset-cap sharding |
| Indexer | `indexer.py`, `data/progress.py` | CLI orchestration, one held browser, ~15s interstitial hold, atomic JSON checkpoints, local→Neon persistence |
| Auth + billing | `auth/{auth,user_store,dependencies,stripe_handler}.py` | Google OAuth → JWT, DynamoDB users (NOT Postgres), Stripe $2/mo, weekly counter |
| Shared/config | `data/schema.py`, `data/fandoms.py`, `config.py` | `Fic` model, `FANDOMS` registry, repo-root `.env` side-effect loader |
| Tests | `tests/{conftest,test_audit_fixes}.py` | ~30 audit-fix regression tests; hermetic stubs for boto3/Gemini/SQLAlchemy |

## External services

Gemini (embeddings, `GEMINI_API_KEY`) · AWS Bedrock Claude Haiku 4.5 (enhancer + ranker, **IAM role, no key**) · Neon Postgres + pgvector (`DATABASE_URL`, **always the `-pooler` host**) · AWS DynamoDB (users + analytics, IAM role) · Stripe (billing) · Google OAuth.

## Drift & gotchas (verified this session — trust code over the docs)

- **SSE is fake** — backend returns one JSON blob; the streaming stages live only in `frontend/app/api/search/route.ts`. No scraping happens at query time.
- **Search cap is off** — `check_search_limit` is a pass-through in beta (429 commented out).
- **AO3 encoding doc-drift** — `ARCHITECTURE.md §14`/`CLAUDE.md` describe a `&`→`*a*` scheme; the actual `ao3.py` uses standard `urlencode(quote_plus)`. (`rq.py` does replicate the `*a*` scheme — they diverge.)
- **Enhancer fallback silently degrades** retrieval to 2 vectors (raw + one 0.7 blend) on any error / wrong description count — still returns 200.
- **`search_text` tsvector/GIN exists but is NOT wired into `search_rrf`** — fusion is vector-only despite "hybrid/BM25" framing. (This is the hybrid-search seed in Phase 2.)
- **Ranker degradation looks like a popularity sort** — all-chunks-fail falls back to sorting by `kudos`.
- **`migrate_to_neon.py:6` has a hardcoded Neon connection string with credentials** in source.
- **`/admin/stats` is open by default** unless `ADMIN_API_TOKEN` is set; **CORS is `allow_origins=['*']` + `allow_credentials=True`** (both flagged in code as prod TODOs).
- **Auth is fully implemented** (Google OAuth + JWT + DynamoDB + Stripe) despite `ARCHITECTURE.md §11` calling it a placeholder.
- **`main.py` is NOT the server** (it's a throwaway test runner); the entrypoint is `api:app`.
- **`EMBEDDING_DIMS = 768`** is duplicated in `ai/embedder.py` and `db/postgres.py` and must stay in sync (changing it drops/recreates the embedding column → full re-index). Query vs document task-type asymmetry (RETRIEVAL_QUERY vs RETRIEVAL_DOCUMENT) is load-bearing.

## Key commands

```powershell
# server
cd D:\Fanfiction-Finder\backend
uvicorn api:app --reload --host 0.0.0.0 --port 8000

# tests (pytest not in requirements.txt)
cd D:\Fanfiction-Finder\backend
pip install pytest
python -m pytest

# indexer (host only — needs real Chrome)
python indexer.py "Naruto"
```
