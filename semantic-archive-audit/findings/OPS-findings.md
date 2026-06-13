# OPS Findings & Fix Log
Run: 2026-06-13 · Task: tasks/06-ops.md

| ID | file:line | Severity | Finding | Fix direction | Status |
|----|-----------|----------|---------|---------------|--------|
| OPS-1 | bedrock/dynamodb/postgres/stripe/google call sites | High | **No outbound call sets an explicit timeout** — all rely on SDK defaults; a hung dependency can block a worker/connection. | Add explicit connect/read timeouts: boto3 via `botocore.Config`, Postgres via `connect_args` (connect_timeout + server `statement_timeout`), Stripe via bounded retries. | FIXED |
| OPS-2 | backend/api.py (no handler/logging) | Medium | No global exception handler and no structured logging — bare `print()` everywhere; no request/correlation ID; auth failures not logged. (FastAPI's default already hides tracebacks from clients, so no leak today.) | Add a request-ID + structured-JSON logging middleware and a global handler that returns a generic error and logs the detail with the request id. | FIXED |
| OPS-3 | backend/db/postgres.py:14 pool | Low | `pool_size=5, max_overflow=2` (max 7 conns). Sane for a small instance, but should be confirmed against the live Neon/RDS `max_connections`. | Confirm vs live limit; config-only → PROPOSE-ONLY. | SKIPPED-NEEDS-DECISION |
| OPS-4 | RDS/Neon backups | Low | Backup retention / PITR not verifiable from code. | Report retention + enable PITR if low → PROPOSE-ONLY AWS command. | SKIPPED-NEEDS-DECISION |
| OPS-5 | embed_query / search_rrf in /search | Medium | If Gemini or Postgres is down, `/search` hard-500s (enhancer + ranker degrade gracefully, but embedding/DB have no fallback). Changing what the endpoint returns on degradation is behavior-changing. | Propose graceful-degradation behavior; human decides the response. | SKIPPED-NEEDS-DECISION |

## Outbound-call timeout table (audit step 1)
| Call site | Dependency | Timeout before | Timeout after fix |
|-----------|-----------|----------------|-------------------|
| query_enhancer._invoke_enhancer | Bedrock | ABSENT (SDK default) | connect 10s / read 60s, retries=2 (botocore.Config) |
| ranker._rank_chunk | Bedrock | ABSENT | connect 10s / read 60s, retries=2 |
| embedder._embed_single/_batch | Gemini | ABSENT | http_options timeout 30s (genai) |
| user_store (all) + stripe `_downgrade` scan | DynamoDB | ABSENT | connect 5s / read 10s, retries=3 |
| postgres engine (all queries) | Postgres/Neon | ABSENT | connect_timeout 10s + server statement_timeout 30s |
| stripe_handler (checkout/portal/verify/webhook) | Stripe | SDK default 80s | max_network_retries=2 (bounded) |
| auth.verify_google_token | Google certs | ABSENT | (note: google.auth Request has no easy timeout knob — left as-is, low risk; cert fetch is cached) |

## Retries (audit step 2)
- enhancer: tenacity `stop_after_attempt(3)`, exp backoff 1–8s — bounded. ✓
- embedder: tenacity `stop_after_attempt(5)`, exp backoff 2–30s, only on 429 — bounded. ✓
- ranker: no tenacity; per-chunk failure degrades to bottom-sort / kudos-sort — bounded. ✓
- **Amplification note:** with the search gate disabled (LLM-1), retries multiply per-request
  Bedrock/Gemini cost. boto3's own internal retries compound with tenacity. Fix caps boto3
  `retries.max_attempts=2` so the two retry layers don't multiply unbounded.

## Errors / logging / pool / backups (audit steps 3–6)
- **Stack traces to clients:** NOT leaked (FastAPI default 500 is generic). Added a global
  handler + structured logging so failures are *recorded* with a request id, response stays generic.
- **Graceful degradation:** partial — enhancer & ranker degrade; embedding/DB don't (OPS-5).
- **Logging:** was bare `print()`, no correlation id, no auth-fail logging → added JSON logging
  middleware with `X-Request-ID`. No secrets logged (verified: only model output / non-secret fields).
- **DB pool:** 5+2=7 max — sane; confirm vs live `max_connections` (OPS-3).
- **Log-sink caveat:** the `unhandled_error` log line records `str(exc)` server-side for
  diagnostics (never sent to the client). Ensure the log sink (CloudWatch) is
  access-controlled, since an exception string could incidentally contain sensitive data.
- **Backups:** report via AWS command below (OPS-4).

## NEEDS-DECISION
- **OPS-3** pool size vs live limit; **OPS-4** backup retention/PITR; **OPS-5** what `/search`
  returns when Gemini/Postgres is down (graceful degradation response shape).
- Timeout values chosen (Bedrock 60s read, Gemini 30s, DynamoDB 10s read, Postgres 30s
  statement) are sensible defaults — **sanity-check against your real p99 latencies**, esp.
  the ranker on large candidate pools (could exceed 60s if a chunk is big).

## AWS / config commands (propose-only, run in Windows CMD)
```bat
:: OPS-4: report current RDS backup retention + PITR (if using RDS; Neon uses its own PITR)
aws rds describe-db-instances --db-instance-identifier <id> ^
  --query "DBInstances[0].{Retention:BackupRetentionPeriod,PITR:LatestRestorableTime}"
:: set retention to 7 days if 0/low (enables automated backups + PITR):
aws rds modify-db-instance --db-instance-identifier <id> ^
  --backup-retention-period 7 --apply-immediately
:: For Neon: confirm PITR/history retention in the Neon console (branch history window).

:: OPS-3: pool size lives in code (postgres.py). To confirm the DB ceiling:
::   SELECT setting FROM pg_settings WHERE name='max_connections';
:: Keep pool_size+max_overflow well under max_connections / number_of_app_instances.
```
