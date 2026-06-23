# Phase 2 — API standards backlog

Additive / corrective work to bring the API up to industry standards. Each item names the **standard**, the **current FicFinder gap**, and the source (full reading list in [`04-api-resources.md`](04-api-resources.md)). Do this **after** Phase 1 cleanup. Bucketed by risk/effort.

> These change behavior and contracts — do them in their own diffs, with tests, separate from the cleanup. If a change touches the frontend contract, run `cd frontend && npm run lint && npm run build`.

## Stage A — quick edits (low risk, no product decision)

- [ ] **A1 · Error bodies → RFC 9457 `problem+json`.** Handlers return `{detail, request_id}`; switch to `application/problem+json` with `type`/`title`/`status`/`detail`/`instance` and stable `type` URIs. One machine-readable error contract. → `api.py` exception handlers. *(RFC 9457)*
- [ ] **A2 · Tighten CORS.** Currently `allow_origins=['*']` + `allow_credentials=True` (spec-questionable combo). Pin to the frontend origin. → `api.py` CORSMiddleware. *(OWASP API #8 misconfig)*
- [ ] **A3 · `Retry-After` on 429.** When rate limiting returns (C2), include `Retry-After`. *(RFC 9110)*
- [ ] **A4 · `ETag`/`Cache-Control` on stable reads.** Add conditional-request support to rarely-changing endpoints (`/fandoms`). *(RFC 9111)*
- [ ] **A5 · Bound resource consumption.** Cap `limit`, the RRF candidate-pool size, and the ranker fan-out per request. *(OWASP API #4 Unrestricted Resource Consumption)*
- [ ] **A6 · Verify Stripe webhook idempotency.** `mark_event_processed` already dedupes — confirm it persists *and replays* the first outcome (status+body) per the Stripe/RFC model. → `auth/stripe_handler.py`. *(Stripe idempotency)*

## Stage B — features (multi-file, needs tests)

- [ ] **B1 · Cursor pagination on `/search`.** Currently returns the full ranked list. Add `page_size` (clamped) + opaque `next_page_token`; empty token = end. Touches the frontend results contract. *(Google AIP-158)*
- [ ] **B2 · OpenTelemetry tracing.** Add spans across `enhance → embed → search_rrf → rank`, propagating the existing correlation IDs. Makes per-stage latency attributable. *(OpenTelemetry)*
- [ ] **B3 · OpenAPI 3.1 contract as source of truth + Schemathesis in CI.** Pin the spec, then property-based/fuzz test the API against it (high-yield on FastAPI). *(OpenAPI 3.1, Schemathesis)*
- [ ] **B4 · (Decision-gated) Hybrid search.** If keeping `search_text` (see C3): wire the tsvector/GIN column into `search_rrf` so fusion is keyword + vector, not vector-only. This is what `add_search_text_column` was built for. *(hybrid retrieval)*

## Stage C — decisions (yours, before the related edits)

- [ ] **C1 · Versioning + deprecation policy.** No `/v1` or version header today. Pick a scheme (URI path vs header/media-type) and a deprecation signal (`Deprecation`/`Sunset` headers + changelog) before the first breaking change. *(Microsoft / Zalando / AIP)*
- [ ] **C2 · Re-enable rate limiting.** `check_search_limit` is a no-op in beta — restore the 429 gate (the counter/`searches_used`/`week_start` machinery already exists). **Keep that function** (this is why Phase 1 doesn't delete it). *(OWASP API #4)*
- [ ] **C3 · Keep or delete `search_text` / `add_search_text_column`.** Tied to B4. Keep → hybrid search is on the roadmap. Delete → reclaim ~72 lines (then it moves into Phase 1). The audit's verifiers disagreed; this is a product call, not a cleanup call.

## Not gaps (already compliant — for reference)

- Config from env (12-factor) — `config.py`. ✓
- Structured per-request JSON logging with correlation IDs (`X-Request-ID`) — `api.py`. ✓ (B2 extends this to traces.)
- Sync-vs-async route discipline (blocking work off the event loop) — `api.py` `/search`. ✓
- Generic 500s with no internal leak — `api.py` `unhandled_exception_handler`. ✓
- Bounded Bedrock/Stripe/DB timeouts + retries — already in place. ✓
