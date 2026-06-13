# PAY Findings & Fix Log
Run: 2026-06-13 · Task: tasks/03-stripe.md

| ID | file:line | Severity | Finding | Fix direction | Status |
|----|-----------|----------|---------|---------------|--------|
| PAY-1 | backend/auth/stripe_handler.py:60 `handle_webhook` | High | **No idempotency guard.** `event.id` is never recorded; Stripe retries (up to 72h) re-run the handler. Today's business writes (`set_tier`, `set_stripe_customer_id`) are naturally idempotent so double-delivery is benign *now*, but any future non-idempotent fulfillment would double-apply. | Conditional `put_item` on `event.id` (`attribute_not_exists`) at the top of `handle_webhook`; duplicate deliveries no-op. Reuse the users table with key `stripe_event:<id>`. | FIXED |
| PAY-2 | backend/api.py:99 webhook route | Medium | The route's `except Exception` maps **every** post-verify failure (including DynamoDB write errors) to `400 "Invalid signature"`. 400 tells Stripe to retry, but the label is wrong, and a *permanent* processing error (e.g. missing field) would make Stripe retry for 72h against a misleading reason. | Distinguish: signature/payload errors → 400 (don't retry); processing errors after a valid signature → 500 (Stripe retries transient failures correctly). | FIXED |
| PAY-3 | backend/auth/stripe_handler.py:84 `verify_paid_user` + DynamoDB | Low | Business write isn't atomic with the dedupe marker. A crash between recording `event.id` and the `set_tier` write could lose a fulfillment; a crash between `set_tier` and `set_stripe_customer_id` briefly downgrades a paid user (self-heals on next webhook). Closing this fully needs `TransactWriteItems`. | Residual atomicity gap — flagged, not silently reordered. | SKIPPED-NEEDS-DECISION |
| PAY-4 | backend/auth/stripe_handler.py:132 `_downgrade_by_customer_id` | Low | `customer.subscription.deleted` does a full DynamoDB **table scan** inline in the webhook → grows with user count; latency/timeout risk at scale. | Move to a GSI on `stripe_customer_id` (infra) or defer the scan to a background task. Propose-only. | SKIPPED-NEEDS-DECISION |
| PAY-5 | backend/auth/stripe_handler.py:26 `WEBHOOK_SECRET` | Medium | Webhook secret read from a plain env var, not a secret manager (cross-listed in INF). | Move `STRIPE_WEBHOOK_SECRET` to Secrets Manager — infra, propose-only (see INF). | SKIPPED-NEEDS-DECISION |

## Audit verdicts (task step 1)
- **Raw-body signature verify: CORRECT.** Route reads `await request.body()` (raw bytes,
  api.py:93) and passes to `stripe.Webhook.construct_event(payload, sig, secret)` — the
  body is **not** JSON-parsed before verification. Signature is checked against the raw body.
- **Invalid webhook rejected before side effects: YES.** All `set_tier`/`set_stripe_customer_id`
  calls happen *after* `construct_event` returns. A bad signature raises inside
  `construct_event` → caught → 400, before any write. (See PAY-2 for the status-mapping nit.)
- **Idempotency atomicity: NO (pre-fix).** No `event.id` dedupe; no multi-item txn. See PAY-1/PAY-3.
- **Fast 2xx: MOSTLY.** checkout path = ≤2 DynamoDB writes (fast). subscription.deleted path =
  full table scan inline (PAY-4) — not "fast" at scale but acceptable at current volume.
- **Persist-then-verify-later: NONE.** Verify is always first; no ~5-min-window break.

## NEEDS-DECISION (behavior-changing — human decides)
- **PAY-3 atomicity:** to make the dedupe marker + business write truly atomic, redesign
  to `TransactWriteItems` (put event marker + update user in one transaction). I did NOT
  reorder the financial writes silently. Current fix records the marker first then does
  the idempotent business writes; a crash in between is recoverable because the writes are
  idempotent, but a marker-without-write is theoretically possible. Decide if you want the
  transactional redesign.
- **PAY-4 scan → GSI:** add a GSI on `stripe_customer_id` to replace the table scan.
- **PAY-5 secret → Secrets Manager** (see INF commands).

## Stripe CLI test (document only — do NOT run here)
After deploying, verify locally with the Stripe CLI:
```
stripe listen --forward-to localhost:8000/webhooks/stripe
# then in another shell:
stripe trigger checkout.session.completed
stripe trigger customer.subscription.deleted
# replay the SAME event id twice to confirm the second delivery no-ops (PAY-1):
stripe events resend <evt_id>
```
Expect: first delivery applies the tier change; the resend returns 200 and makes no
second write (idempotency guard hit).
