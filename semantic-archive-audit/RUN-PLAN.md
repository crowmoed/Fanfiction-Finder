# RUN-PLAN.md — Scope resolution for the backend audit

Run date: 2026-06-13. Repo: Fanfiction-Finder (FicFinder). Backend = Python/FastAPI
under `backend/`. Dev tool under `fanfic-devtool/`.

This file records the resolved `<scope>` paths for each of the six tasks (the task
files shipped with `[fill in]`), plus a note on what I found while resolving them.

> Note on commits: the task files say "leave staged, do not commit." The overnight
> run instructions override that with "one commit per domain." I follow the run
> instructions: each domain gets its own commit `audit(<domain>): <n> fixes`.

---

## 01 — Auth & Authorization  → findings/AUTH-findings.md
Resolved scope:
- `backend/auth/auth.py` — Google ID token verify + JWT issue/decode
- `backend/auth/dependencies.py` — `get_current_user`, `check_search_limit`
- `backend/auth/user_store.py` — DynamoDB user record access
- `backend/api.py` — all FastAPI route handlers (login, me, checkout, billing-portal,
  webhook, search, fandoms, health, admin/stats)

Resolution notes: token verification already uses the Google client library
(`google.oauth2.id_token.verify_oauth2_token`) — good. JWT uses HS256 with an
explicit single-algorithm list — good. The interesting surface is BOLA on the
route handlers and the unauthenticated `/admin/stats`.

## 02 — LLM Pipeline & Denial-of-Wallet  → findings/LLM-findings.md
Resolved scope:
- `backend/ai/query_enhancer.py` — Bedrock Haiku call (`_invoke_enhancer`)
- `backend/ai/ranker.py` — Bedrock Haiku call (`_rank_chunk`)
- `backend/ai/embedder.py` — Gemini embed calls (`_embed_single`, `_embed_batch`)
- `backend/auth/dependencies.py` (`check_search_limit`) + `backend/api.py` `/search`
  — the rate-limit layer + search endpoint
- `backend/auth/user_store.py` — free-tier counter (`increment_searches`)

Resolution notes: enhancer has `max_tokens=2048`; ranker has `max_tokens=8192`.
Embedder is Gemini (no max_tokens concept for embeddings). `check_search_limit` is a
no-op pass-through right now ("disabled during beta") — that's the denial-of-wallet
gap. User query is f-string-interpolated into both Bedrock prompts (injection +
no delimiting). Free-tier counter uses a get-then-update race in `increment_searches`.

## 03 — Payments (Stripe)  → findings/PAY-findings.md
Resolved scope:
- `backend/auth/stripe_handler.py` — `handle_webhook`, checkout/portal, `verify_paid_user`,
  `_downgrade_by_customer_id`
- `backend/api.py` `/webhooks/stripe` — raw-body webhook route
- `backend/auth/user_store.py` — `set_tier`, `set_stripe_customer_id` (DynamoDB writes
  triggered by Stripe events)

Resolution notes: webhook route already reads `await request.body()` (raw bytes) and
passes to `construct_event` — signature verify is on raw body (good). The gap is
idempotency: no `event.id` dedupe, so a Stripe retry re-applies `set_tier`.

## 04 — Data Layer & SQL Injection  → findings/SQL-findings.md
Resolved scope:
- `backend/db/postgres.py` — `search_rrf` (the CTE builder = the "C2" flag),
  `search_similar`, migrations, stats
- `backend/data/schema.py` — Pydantic model only (no SQL)
- `fanfic-devtool/swap_tool.py` — bulk insert / push / export SQL
- (adjacent, out of strict scope but noted) `backend/migrate_to_neon.py`,
  `backend/rq.py`

Resolution notes: `search_rrf` builds CTE text via f-strings but every CTE name and
fandom/filter fragment is server-controlled and all user *values* (embeddings, word
counts, excluded_tags) are bound params — this is the "C2" construction and it is
SAFE. `swap_tool.py` builds VALUES lists via f-strings of *param names* only — SAFE.
The one genuine interpolation is `migrate_to_neon.py:63` (`'{embedding_str}'::vector`)
but `embedding_str` is a pgvector text value read from the source DB, not user input,
and that file is outside the task-04 scope list (migration utility). Net: low SQLi
exposure; this domain is mostly a confirm-SAFE pass.

## 05 — Infra, Secrets & Network  (PROPOSE-ONLY)  → findings/INF-findings.md
Resolved scope:
- `backend/Dockerfile` — base image, USER, layers
- `backend/config.py` + `backend/.env` (gitignored now) — config loader / secret source
- App Runner service config + IAM role `ficfinder-apprunner-instance` (AWS, propose-only)
- RDS / Neon networking (AWS, propose-only)
- `backend/api.py` — `/docs` `/redoc` exposure, CORS `allow_origins=["*"]`

Resolution notes (read-only): **`backend/.env` was committed in the initial commit
`014bf35` with a real `GEMINI_API_KEY` and `DATABASE_URL`** — later untracked in
`e381c2a` but still present in git history. That's the headline INF finding. All
secrets are plain env vars loaded from `.env` (no Secrets Manager). Dockerfile runs
as root. `/docs` is open. CORS is wildcard with credentials.

## 06 — Reliability & Ops  → findings/OPS-findings.md
Resolved scope:
- Outbound calls: `backend/ai/query_enhancer.py` + `backend/ai/ranker.py` (Bedrock),
  `backend/ai/embedder.py` (Gemini), `backend/db/postgres.py` (RDS/Neon engine),
  `backend/auth/stripe_handler.py` (Stripe), `backend/auth/auth.py` (Google),
  `backend/auth/user_store.py` (DynamoDB)
- Global error handler + logging: `backend/api.py` (none today — uses bare `print`)
- DB pool config: `backend/db/postgres.py` `create_engine` (pool_size=5, max_overflow=2)
- RDS backup config: AWS (propose-only)

Resolution notes: no outbound call sets an explicit timeout (boto3 default, httpx via
genai, stripe default). No structured logging — everything is `print()`. No global
exception handler, but FastAPI's default already hides tracebacks from clients;
unhandled errors in `/search` (e.g. enhancer raising) are the risk. Pool size 5+2=7;
need to compare to RDS/Neon max — propose-only.
