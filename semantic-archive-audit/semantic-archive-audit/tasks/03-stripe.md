# TASK 03 — Payments (Stripe) (audit → fix → verify, one run)
Work ONLY within scope. Leave changes staged, do not commit.

<scope>
Stripe webhook handler, checkout/subscription logic, the DynamoDB user writes
triggered by Stripe events. Pin paths: [fill in]
</scope>

## Step 1 — AUDIT (read-only)
1. Signature: Stripe-Signature verified via SDK (constructEvent) against the
   RAW body, or is the body parsed to JSON first (breaks verify)? Invalid
   webhook rejected (400) before any side effect?
2. Idempotency: each event.id recorded with a uniqueness guard to dedupe
   72h retries? Dedupe + business write atomic, or can a crash double-fulfill?
   DynamoDB has no multi-item txn by default — assess the consistency model.
3. Returns 2xx fast and defers slow work, or heavy work inline (timeout/retry
   storm risk)?
4. Webhook secret in a secret manager or hardcoded/env?
5. Any persist-then-verify-later pattern breaking the ~5-min signature window?
Write to `findings/PAY-findings.md`: IDs PAY-1..n with verdicts on raw-body
verify, idempotency atomicity, fast-2xx.

## Step 2 — FIX (Medium+)
- Direct-fix in scope: switch verification to the raw request body via the
  SDK; reject invalid webhooks with 400 before side effects; implement
  idempotency via a DynamoDB conditional write on event.id (ConditionExpression
  attribute_not_exists) so retries no-op; move heavy work after the 2xx.
- If the idempotency fix requires restructuring how the business write commits
  (e.g. ordering, or it can't be made atomic in DynamoDB without a
  TransactWriteItems redesign) → implement the conditional-write dedupe AND
  flag the residual atomicity gap as `NEEDS-DECISION` rather than silently
  reordering financial writes.
- Webhook secret in env/hardcoded → moving it to Secrets Manager is infra:
  propose the Windows CMD command, don't execute.
- Update findings file: each PAY-# → FIXED / SKIPPED-NEEDS-DECISION.

## Step 3 — VERIFY
Re-check raw-body verify, idempotency guard, fast-2xx. Document (do NOT run)
the Stripe CLI test: `stripe listen --forward-to <url>` then `stripe trigger
<event>`.

## Step 4 — REPORT
Files changed, per-ID status, staged diff. Do not commit.
