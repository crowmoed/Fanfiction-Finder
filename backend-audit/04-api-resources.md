# Phase 2 — Verified API reference set

Industry-standard resources for building a production API, all URLs pulled live and currency-checked. Backs the [Phase 2 backlog](03-api-backlog.md).

## Currency notes (current vs superseded)

- **Errors** → RFC **9457** (2023) is current; obsoletes RFC 7807 (backward-compatible).
- **HTTP semantics / status codes** → RFC **9110** (2022); obsoletes the RFC 7230–7235 split (so "see RFC 7231" references are stale).
- **HTTP caching** → RFC **9111** (2022); obsoletes RFC 7234.
- **OpenAPI** → use **3.1.x** (JSON-Schema-aligned). **3.2.0** shipped Sept 2025 (newest) — adopt as tooling catches up.
- **OWASP API Security Top 10** → the **2023** edition is current.
- **JWT** → RFC **8725** BCP current (an `8725bis` revision is in draft).
- **OAuth 2.1** → still an IETF *draft* (`draft-ietf-oauth-v2-1`), NOT yet an RFC — OAuth 2.0 (RFC 6749) remains the ratified standard.

## 1. REST / HTTP API design
- [RFC 9110 – HTTP Semantics](https://www.rfc-editor.org/rfc/rfc9110.html)
- [OpenAPI Specification 3.1.0](https://spec.openapis.org/oas/v3.1.0.html)
- [Microsoft REST API Guidelines](https://github.com/microsoft/api-guidelines)
- [Google API Improvement Proposals (aip.dev)](https://google.aip.dev/)
- [Zalando RESTful API Guidelines](https://opensource.zalando.com/restful-api-guidelines/)
- [JSON:API](https://jsonapi.org/)

Must-know: resources are nouns, methods are verbs (no `/getUser`); respect method semantics & idempotency (GET safe; PUT/DELETE idempotent; never mutate on GET); correct status class; one consistent JSON envelope (top-level object, ISO-8601, one casing); design-first with OpenAPI as source of truth.

## 2. Errors, versioning, pagination, filtering, idempotency
- [RFC 9457 – Problem Details](https://www.rfc-editor.org/rfc/rfc9457.html)
- [AIP-158 Pagination](https://google.aip.dev/158) · [AIP-160 Filtering](https://google.aip.dev/160)
- [Stripe – Idempotent requests](https://docs.stripe.com/api/idempotent_requests) · [Stripe idempotency design](https://stripe.com/blog/idempotency)

Must-know: one error shape (`problem+json`, branch on stable `type`); one versioning scheme, major-bump only on breaking changes, `Deprecation`/`Sunset` signals; prefer cursor/keyset pagination over offset (opaque signed tokens, empty `next_page_token` = end); single structured `filter` param; `Idempotency-Key` on unsafe POSTs (persist + replay first outcome incl. 5xx, ~24h expiry, client backoff+jitter).

## 3. Security
- [OWASP API Security Top 10 (2023)](https://owasp.org/API-Security/editions/2023/en/0x11-t10/) · [project home](https://owasp.org/www-project-api-security/)
- [RFC 8725 – JWT BCP](https://datatracker.ietf.org/doc/html/rfc8725)
- [OAuth 2.0 (RFC 6749)](https://datatracker.ietf.org/doc/html/rfc6749) · [OAuth 2.1 draft](https://datatracker.ietf.org/doc/draft-ietf-oauth-v2-1/) · [RFC 9068 JWT access tokens](https://datatracker.ietf.org/doc/html/rfc9068)

Must-know: #1 risk is Broken Object-Level Authorization — check ownership per object; validate JWT `alg` (reject `none`/confusion), verify `aud`/`iss`/`exp`; rate-limit + bound resource consumption (#4); lock down CORS; treat upstream API responses as untrusted (#10).

## 4. FastAPI + Python (this stack)
- [FastAPI docs](https://fastapi.tiangolo.com/) · [Bigger Applications](https://fastapi.tiangolo.com/tutorial/bigger-applications/)
- [zhanymkanov/fastapi-best-practices](https://github.com/zhanymkanov/fastapi-best-practices)
- [full-stack-fastapi-template](https://github.com/fastapi/full-stack-fastapi-template)
- [Pydantic v2](https://docs.pydantic.dev/latest/)

Must-know: structure by domain module (router/schemas/service/deps); sync-`def`-in-threadpool vs async-route rule (already correct in `api.py`); push validation into dependencies; Pydantic models as the contract; uvicorn workers behind a process manager.

## 5. Reliability & operations
- [The Twelve-Factor App](https://12factor.net/)
- [OpenTelemetry docs](https://opentelemetry.io/docs/)
- [Google SRE Books](https://sre.google/books/)

Must-know: config from env; OpenTelemetry traces/metrics/logs with propagated correlation IDs; health/readiness; timeouts + retries-with-backoff + circuit breakers on outbound calls; graceful shutdown; SLOs/error budgets.

## 6. Performance, caching & scaling
- [RFC 9111 – HTTP Caching](https://www.rfc-editor.org/rfc/rfc9111.html)
- [k6](https://k6.io/docs/) · [Locust](https://docs.locust.io/)

Must-know: `ETag`/`If-None-Match` + `Cache-Control` for conditional requests & concurrency; edge/CDN caching where safe; DB connection pooling (relevant to the Neon pooler); load-test before launch.

## 7. Testing, contracts & docs
- [Schemathesis](https://schemathesis.io/) ([repo](https://github.com/schemathesis/schemathesis))
- [Pact](https://pact.io/)
- [Swagger – Problem Details guide](https://swagger.io/blog/problem-details-rfc9457-doing-api-errors-well/)

Must-know: Schemathesis auto-generates property-based/fuzz tests from the OpenAPI spec (catches 500s, schema violations); Pact for consumer-driven contract testing; keep docs generated from the spec so they can't drift.

## 8. Gold-standard references to study
- [Stripe API docs](https://docs.stripe.com/api) — errors, idempotency, pagination, versioning done right
- [GitHub REST API](https://docs.github.com/en/rest) — resource modeling, pagination/rate-limit headers
- *Book:* "API Design Patterns" — JJ Geewax (Manning)

---

*Sources pulled and currency-confirmed via live web search. Two items (12factor.net, the Geewax book) are cited from established canonical knowledge rather than this run's searches — both stable and authoritative.*
