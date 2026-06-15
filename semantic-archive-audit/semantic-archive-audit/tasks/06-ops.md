# TASK 06 — Reliability & Ops (audit → fix → verify, one run)
Work ONLY within scope. Leave changes staged, do not commit.

<scope>
All outbound-call sites (RDS, Bedrock, Stripe, Google, DynamoDB), global error
handler, logging setup, DB connection/pool config, RDS backup config. Pin
paths: [fill in]
</scope>

## Step 1 — AUDIT (read-only)
1. Timeouts: every outbound call sets an explicit timeout, or can it hang?
   (table: call + timeout/ABSENT)
2. Retries: bounded, backoff+jitter? (enhancer + embed_query already use
   tenacity — confirm bounds; ensure retries can't amplify denial-of-wallet)
3. Errors: stack traces leaked to clients? Graceful degradation if Bedrock/RDS
   down, or hard 500?
4. Logging: structured JSON with a request/correlation ID per line? Auth
   failures/403s logged? Any secret/PII logged?
5. DB pool: configured? Pool size sane vs RDS max_connections (db.t4g.micro is
   small)? Exhaustion risk?
6. Backups: RDS automated backups + PITR on, non-zero retention? Report days.
Write to `findings/OPS-findings.md`: IDs OPS-1..n; timeout verdict per call;
pool vs max_connections; backup retention.

## Step 2 — FIX (Medium+)
- Direct-fix in scope: add explicit timeouts to outbound calls; stop leaking
  stack traces (generic error response + logged detail); add structured
  logging with a request ID; redact secrets/PII from logs; add graceful
  fallback where a dependency being down shouldn't 500 the whole request.
- Behavior-changing → `NEEDS-DECISION`, skip: specific timeout/retry values if
  non-obvious (propose defaults, let human confirm), and any change to what an
  endpoint returns on degradation.
- Pool size and RDS backups are config → PROPOSE-ONLY (Step 3), not code.
- Update findings file: each OPS-# → FIXED / SKIPPED-NEEDS-DECISION.

## Step 3 — VERIFY + config (propose-only)
- Re-check timeouts, error handling, structured logging in the changed code.
- Output (do NOT execute) Windows CMD AWS CLI commands to: set RDS backup
  retention (if disabled/low) and confirm PITR; and the pool-size change if it
  lives in config. Write into `findings/OPS-findings.md`.

## Step 4 — REPORT
Files changed, per-ID status, staged diff, proposed config commands. Do not
commit.
