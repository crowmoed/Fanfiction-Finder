# Backend Audit — Overnight Run Summary
Run: 2026-06-13 · Branch: `main` · 6 domains, one commit each.

Scope was resolved first for all six tasks (the task files shipped with `[fill in]`
`<scope>` blocks) and recorded in [RUN-PLAN.md](RUN-PLAN.md). Each domain was then
audited → fixed → verified → written to `findings/<DOMAIN>-findings.md` → committed.
Per-domain detail (tables, NEEDS-DECISION, propose-only commands) lives in those files.

## Per-domain results

| Domain | Commit | Fixes | Verify | Findings |
|--------|--------|-------|--------|----------|
| 01 auth | `e4293fb` | 3 FIXED | PASS | [AUTH-findings.md](findings/AUTH-findings.md) |
| 02 llm | `e1d1a36` | 3 FIXED (1 NEEDS-DECISION) | PASS | [LLM-findings.md](findings/LLM-findings.md) |
| 03 stripe | `136c97b` | 2 FIXED (2 NEEDS-DECISION) | PASS | [PAY-findings.md](findings/PAY-findings.md) |
| 04 sql | `b1dce56` | 0 (confirm-clean) | PASS | [SQL-findings.md](findings/SQL-findings.md) |
| 05 infra | `499101f` | 2 FIXED (rest propose-only) | PASS | [INF-findings.md](findings/INF-findings.md) |
| 06 ops | `0473c07` | 2 FIXED (3 NEEDS-DECISION) | PASS | [OPS-findings.md](findings/OPS-findings.md) |

### 01 — Auth (`e4293fb`)
- **AUTH-1**: gated `/admin/stats` behind optional `ADMIN_API_TOKEN` (`X-Admin-Token`
  header). Open by default if unset, so the ops dashboard isn't broken.
- **AUTH-2**: `verify_google_token` now fails closed if `GOOGLE_CLIENT_ID` is empty
  (the lib was silently skipping audience verification → any Google token accepted).
- **AUTH-3**: `create_jwt`/`decode_jwt` fail closed on empty/placeholder `JWT_SECRET`.
- No BOLA/IDOR found — the app is single-resource-per-user.
- Verify: tests confirmed fail-closed on both secrets, valid tokens round-trip, tampered
  tokens rejected, admin gate correct in all four states.

### 02 — LLM / Denial-of-Wallet (`e1d1a36`)
- **LLM-2**: capped `/search` `q` at `max_length=1000`.
- **LLM-4 / LLM-5**: delimited untrusted user query (enhancer) and user query + scraped
  fic content (ranker) with an "ignore embedded instructions" guard.
- `max_tokens` already present on both Bedrock calls (confirmed SAFE).
- Verify: prompts delimit input and preserve the scoring rubric/output format.

### 03 — Stripe (`136c97b`)
- **PAY-1**: idempotency guard — `UserStore.mark_event_processed` records `event.id` via
  a conditional DynamoDB put; 72h Stripe retries now no-op.
- **PAY-2**: webhook route distinguishes signature/payload errors (400) from post-verify
  processing errors (500), so Stripe retries transient failures correctly.
- Raw-body signature verify confirmed already correct (no fix needed).
- Verify: tests confirmed first delivery applies once, retry of same `event.id` no-ops,
  and the exception ordering is correct.

### 04 — SQL (`b1dce56`)
- **Zero fixes — confirm-clean.** Every raw-SQL site binds user/data values as params and
  builds SQL structure only from server constants. The "C2" `search_rrf` CTE construction
  is SAFE. Verify: a representative search (incl. a `'; DROP TABLE fics;--` excluded-tag)
  produced params-only SQL with no value interpolation; CTE structure intact.

### 05 — Infra (`499101f`, propose-only domain)
- **INF-3**: Dockerfile now runs as non-root `USER appuser`.
- **INF-4**: `/docs` `/redoc` `/openapi.json` gated behind `ENABLE_DOCS=1` (off by default).
- Everything else proposed-only (AWS CLI + read-back commands in the findings file).

### 06 — Ops (`0473c07`)
- **OPS-1**: explicit timeouts on all outbound calls (Bedrock, DynamoDB, Postgres, Gemini,
  Stripe) with bounded retries.
- **OPS-2**: structured JSON logging + `X-Request-ID` middleware + global exception handler
  (generic 500, no traceback leak; auth failures logged with correlation id).
- Verify (TestClient): request id propagated, internal error detail never reaches the
  client, errors logged server-side.

## ⚠️ Default values I picked — please sanity-check
| Where | Value | Note |
|-------|-------|------|
| LLM-2 | `q` max_length = **1000 chars** | Generous for any real fanfic query; confirm it fits your longest. |
| OPS-1 Bedrock | connect 10s / **read 60s** / retries 2 | The ranker on a large candidate pool *could* exceed 60s — check your p99. |
| OPS-1 Gemini | **30s** | Embedding calls; should be ample. |
| OPS-1 DynamoDB | connect 5s / read 10s / retries 3 | |
| OPS-1 Postgres | connect 10s / **statement_timeout 30s** | Kills runaway queries server-side; confirm the RRF query stays under 30s at scale. |
| OPS-1 Stripe | `max_network_retries=2` | SDK ~80s per-request timeout still applies. |
| AUTH-1 | gate is **opt-in** via `ADMIN_API_TOKEN` | Stays open until you set the env var (and update the frontend proxy to send the header). |

## ⚠️ Could NOT safely complete (left for you)
- **INF-1 (Critical): leaked secrets in git history.** `backend/.env` was committed in
  the initial commit (`014bf35`, blobs still present) with a **real `GEMINI_API_KEY` and
  `DATABASE_URL`** (Neon URL embeds the DB password). I did **not** rotate keys or rewrite
  history (both are operator/destructive actions). **Action required:** rotate the Gemini
  key and Neon password NOW (treat as compromised), then optionally scrub history. Commands
  are in [INF-findings.md](findings/INF-findings.md).
- **IAM (INF-6) / RDS-Neon network (INF-7):** no live AWS access in this run — proposed
  read-back + scoping commands only.
- **NEEDS-DECISION** (behavior-changing, not touched): re-enabling the disabled search gate
  + setting quotas (LLM-1); JWT revocation/lifetime + admin role model (AUTH); Stripe
  atomicity via `TransactWriteItems` + the `subscription.deleted` table scan→GSI (PAY-3/4);
  `/search` graceful-degradation response (OPS-5); DB pool vs live `max_connections` (OPS-3);
  RDS backup retention/PITR (OPS-4); CORS `["*"]`+credentials tightening (INF-5/AUTH).

## Fresh-eyes re-check recommended
The verify step in each domain ran in the **same session that wrote the fix — it graded
its own work.** Per the run plan, the security-critical domains deserve a cold re-review:
- **01 auth** — the fail-closed guards and the admin-gate (esp. that the frontend proxy
  must be updated before you set `ADMIN_API_TOKEN`, or the ops page 403s).
- **03 stripe** — the idempotency ordering (marker-before-write) and the residual atomicity
  gap (PAY-3); replay a real event id twice via the Stripe CLI to confirm the no-op.
- **04 sql** — re-confirm `search_rrf` stays params-only; I judged it SAFE with no change.

All work is committed to `main` (6 commits, `e4293fb`..`0473c07`). The input task plan
under `semantic-archive-audit/semantic-archive-audit/` was left untracked (it's the spec,
not output).
