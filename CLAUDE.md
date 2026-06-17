# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

FicFinder — semantic search for fanfiction. Users type a natural-language query ("Drarry slow burn enemies to lovers no MCD") and get ranked results scraped from AO3, FFN, and Wattpad. Search runs against a **pre-built index**, not live scraping (see Architecture below).

Two existing docs go far deeper than this file:
- [README.md](README.md) — setup + run commands.
- [ARCHITECTURE.md](ARCHITECTURE.md) — full system design (16 sections: pipeline, embedder, ranker, scrapers, infra, gotchas).

**Caveat: ARCHITECTURE.md has drifted from the code in places.** Verify against source before relying on it. Known-stale sections:
- §11 says auth is "planned / empty placeholder" — auth is **fully implemented** (`backend/auth/`: Google OAuth, JWT, DynamoDB user store, Stripe billing).
- §5/§8 describe `search_similar` + merge/dedup and a Gemini ranker — the live path uses `search_rrf` (RRF hybrid) and a **Bedrock Haiku 4.5** ranker.
- README/ARCHITECTURE say env lives in `backend/.env` — it actually loads from the **repo-root `.env`** via `config.py` (see Conventions).

## Commands

All paths are Windows / PowerShell (the dev machine). The repo lives on `D:\Fanfiction-Finder`.

### Backend (FastAPI on :8000)
```powershell
cd D:\Fanfiction-Finder\backend
pip install -r requirements.txt
python db/postgres.py                              # one-time: create table, enable pgvector, build indexes
uvicorn api:app --reload --host 0.0.0.0 --port 8000
```
- The server entrypoint is `api:app` (`backend/api.py`). `backend/main.py` is **not** the server — it's a throwaway manual test runner.

### Tests (backend, pytest)
```powershell
cd D:\Fanfiction-Finder\backend
pip install pytest                                 # not in requirements.txt
python -m pytest                                   # all tests
python -m pytest tests/test_audit_fixes.py         # one file
python -m pytest tests/test_audit_fixes.py::test_name -v   # one test
```
- `tests/conftest.py` stubs boto3 / google-genai / SQLAlchemy at import time, so tests run **without real credentials or network**. Don't bypass these stubs in new tests.

### Frontend (Next.js on :3000)
```powershell
cd D:\Fanfiction-Finder\frontend
npm install
npm run dev
npm run build
npm run lint        # eslint with ESLINT_USE_FLAT_CONFIG=true (via cross-env)
```
- No frontend unit-test runner is configured — `lint` and `build` are the checks.

### Indexer — Selenium + Chrome (run OUTSIDE Docker)
AO3 and FFN need a **real, non-headless Chrome window** to defeat bot detection; Wattpad runs over pure HTTP. So the indexer cannot run in a container.
```powershell
cd D:\Fanfiction-Finder\backend
python indexer.py                                  # all fandoms (AO3 + FFN + Wattpad)
python indexer.py "Naruto"                         # one fandom
python indexer.py "Naruto" --clear                 # re-index from scratch
python indexer.py "Naruto" --start-page 664        # resume AO3 from a page
python indexer.py "Naruto" --ffn-only | --wattpad-only
```
The first page pauses ~15s — use it to click through any age/bot interstitial.

### Devtool — Textual TUI (`fanfic-devtool/`)
Swaps fandom data between the live Neon DB and local parquet/numpy files. Standalone tool with its own `.env` (needs `DATABASE_URL`).
```powershell
cd D:\Fanfiction-Finder\fanfic-devtool
pip install -r requirements.txt
python app.py
```

### Other backend utilities
- `python rq.py "Fandom"` / `python rq.py --all` — compare expected fic counts (live site) vs what's indexed in Postgres.
- `python check_embeddings.py` — print embedding dims + per-fandom counts.
- `python cleanup.py` — `VACUUM FULL ANALYZE` the DB.

### Deploy
- **Frontend**: auto-deploys on `git push` to `main` (Vercel).
- **Backend**: manual Docker → ECR → App Runner. Exact tag/push commands in [README.md](README.md) and [ARCHITECTURE.md §3](ARCHITECTURE.md).

## Architecture (big picture)

### Index-then-search split
Scraping a fandom takes hours, so it never happens at query time. Two separate flows:
1. **Offline indexing** (`indexer.py`): scrape → embed (Gemini) → upsert into Neon Postgres with pgvector. The corpus is a snapshot; new fics only appear after a manual re-index.
2. **Online search** (`api.py` `/search`): enhance query → embed → RRF hybrid retrieval → LLM re-rank → return. Sub-second because it only touches the pre-built index.

### Search pipeline (the live code path)
`api.py:/search` orchestrates:
1. `ai/query_enhancer.py` → **Bedrock Claude Haiku 4.5** (IAM role, no API key) expands the query into multiple HyDE-style hypothetical fic summaries (`EnrichedQuery.semantic_descriptions`).
2. `ai/embedder.py` → **Gemini `gemini-embedding-001`, 768-dim, L2-normalized**. Indexing uses task type `RETRIEVAL_DOCUMENT`; queries use `RETRIEVAL_QUERY` — this asymmetry matters, don't mix them up.
3. `db/postgres.py:search_rrf()` → **multi-vector retrieval**: runs one ranked pgvector cosine search per `(query embedding × platform)` — the 4 query vectors (1 raw + 3 HyDE blends) across AO3/FFN/Wattpad — and fuses the ranked lists via **Reciprocal Rank Fusion** (`RRF_K = 60`), with per-platform quotas (default 40) so FFN/Wattpad aren't drowned out by AO3. This is the current retrieval primitive — `search_similar()` (single-vector) still exists but is legacy. NOTE: a `search_text` tsvector GIN column exists in the schema but is **not** wired into `search_rrf` today — fusion is vector-only, despite "hybrid/BM25" framing in older notes.
4. `ai/ranker.py` → Bedrock Haiku 4.5 scores the merged candidates 0–100 against the **original raw query** (not the HyDE text). Fics it omits get `match_score = None` (not 0). On any failure it falls back to sorting by `kudos`.

### Module map (backend)
- `api.py` — FastAPI app, all HTTP endpoints, search orchestration, structured per-request JSON logging with correlation IDs (`X-Request-ID`). Docs (`/docs`) are off unless `ENABLE_DOCS=1`.
- `ai/` — `query_enhancer.py`, `embedder.py`, `ranker.py`.
- `db/postgres.py` — SQLAlchemy `FicRecord` model + every DB function (init, migrations, upsert, `search_rrf`, admin stats). `db/local_storage.py` — local parquet/numpy store used by the devtool.
- `scrapers/` — `ao3.py`, `ffn.py` (SeleniumBase UC mode + BeautifulSoup), `wattpad.py` (pure HTTP against Wattpad's v4 search API, with a vote/read-ratio quality filter).
- `data/schema.py` — the Pydantic `Fic` model shared across scrapers, DB, and API. `data/fandoms.py` — `FANDOMS` dict mapping display name → `{ao3, ffn, wattpad}` source keys. To add a fandom: add an entry here, then `python indexer.py "Name"`.
- `auth/` — `auth.py` (Google token verify + JWT), `user_store.py` (DynamoDB), `dependencies.py` (`get_current_user`, `check_search_limit`), `stripe_handler.py` (checkout/portal/webhook). Users live in **DynamoDB**, not Postgres.

### Frontend
Next.js (App Router) + TypeScript + Tailwind, on Vercel. The browser never sees the backend URL — all calls go through server-side proxy routes under `frontend/app/api/*` (`search` wraps the backend response in an **SSE stream** emitting per-stage pipeline status events; `fandoms`, `admin/stats` are plain proxies). State hooks in `frontend/hooks/` (`useSearch` SSE + AbortController, `useSearchHistory` IndexedDB cache via Dexie with 24h TTL). Results render in a virtual-scrolled TanStack table. Recent work added a three.js / react-three-fiber animated foliage background and `motion` transitions (see the `feat/teahouse-theme` branch and `frontend/design/`).

## Conventions & gotchas (project-specific)

- **Env loading is centralized in `config.py`, from the repo-root `.env`.** `config.py` calls `load_dotenv(ROOT_DIR / ".env")` where `ROOT_DIR` is the **repo root** (`D:\Fanfiction-Finder\.env`), not `backend/`. Seven modules (`embedder`, `postgres`, `cleanup`, `migrate_to_neon`, `rq`, `indexer`, `config` itself) do `import config` purely for this side effect. **New backend modules that read env vars must `import config` first.** The root `.env` is git-ignored.
- **Styling: prefer mapped Tailwind classes over inline `style={{ color: 'var(--accent)' }}`.** The inline CSS-variable pattern in older components is legacy — don't mimic it in new components.
- **Embedding dimension constant must stay in sync.** `EMBEDDING_DIMS = 768` is defined in both `ai/embedder.py` and `db/postgres.py`. Changing dims drops & recreates the `embedding` column (nulls all embeddings) and requires a full re-index.
- **AO3 tag-filter URL encoding is non-standard** (`scrapers/ao3.py`): `&` in a fandom tag → `*a*` (not `%26`), spaces → `+` (not `%20`), and the `commit` value must be `+`-encoded. Getting this wrong silently returns zero results. See [ARCHITECTURE.md §14](ARCHITECTURE.md).
- **Neon: always use the pooler URL** (`-pooler` in the hostname) and keep `pool_pre_ping=True` / `pool_recycle=300` in the SQLAlchemy engine — Neon suspends idle compute and drops connections, so without pre-ping the first request after idle fails.
- **AWS auth has no keys in env.** Bedrock (enhancer + ranker) uses the App Runner IAM instance role; `boto3` resolves credentials automatically. Only Gemini, the DB, and Stripe need keys/secrets in `.env`.
- **Indexing is fully manual** — no cron, no scheduler. Intentional (reduces bot-detection risk). The corpus goes stale until someone re-runs `indexer.py`.

## Sub-projects (separate from the main app)
- `fanfic-devtool/` — Textual TUI for local↔Neon data swapping (own README + requirements).
- `semantic-archive-audit/` — analysis/reporting docs on the corpus (markdown findings, run plans).
- `ficfinder-vault/` — Obsidian-style project journal (dated design notes, timeline). Historical context, not code.
