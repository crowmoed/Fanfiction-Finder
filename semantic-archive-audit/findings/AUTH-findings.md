# AUTH Findings & Fix Log
Run: 2026-06-13 · Task: tasks/01-auth.md

| ID | file:line | Severity | Finding | Fix direction | Status |
|----|-----------|----------|---------|---------------|--------|
| AUTH-1 | backend/api.py:230 `admin_stats` | Medium | `/admin/stats` has **no auth dependency** — fully public; leaks per-fandom DB stats (counts, kudos, last-indexed). No role/admin concept exists in the user model. | Gate behind optional `ADMIN_API_TOKEN` env: if set, require matching `X-Admin-Token` header (403 else); if unset, preserve current open behavior so the ops dashboard isn't broken. | FIXED |
| AUTH-2 | backend/auth/auth.py:24 `verify_google_token` | High | `GOOGLE_CLIENT_ID` defaults to `""`. The Google lib treats a falsy `audience` as `None` → **audience NOT verified**, so any valid Google ID token from *any* OAuth client would be accepted. | Fail closed: raise if `GOOGLE_CLIENT_ID` is unset/empty before calling verify, so audience is always enforced. | FIXED |
| AUTH-3 | backend/auth/auth.py:12 `JWT_SECRET` | High | `JWT_SECRET` falls back to the public literal `"change-me-in-production"`. If the env var is ever unset, anyone can forge a valid JWT for any `sub`. (Deployment `.env` does set a real secret, so this is latent, not live.) | Fail closed: refuse to issue/verify a JWT when the secret is empty or equals the placeholder. | FIXED |

## BOLA endpoint table (audit step 1)
Every endpoint that accepts an object ID, and whether it verifies the caller may
access that object. The app is **single-resource-per-user** — there is no endpoint
that accepts a *foreign* object ID (fic IDs are public catalog data, not owned).

| Endpoint | Method | Object ID accepted? | Ownership/authz check | Verdict |
|----------|--------|---------------------|------------------------|---------|
| `/auth/login` | POST | Google `id_token` (not an object ID) | Google lib verifies token | N/A |
| `/auth/me` | GET | none (uses authed identity) | `get_current_user` | PRESENT (implicit) |
| `/auth/checkout` | POST | none — uses `user["id"]`/`email` from JWT | `get_current_user` | PRESENT (implicit) |
| `/auth/billing-portal` | POST | none — uses `user.stripe_customer_id` from JWT | `get_current_user` | PRESENT (implicit) |
| `/webhooks/stripe` | POST | Stripe event (no user-supplied object ID) | Stripe signature (see PAY) | N/A (correctly unauthenticated) |
| `/fandoms` | GET | none | public catalog | N/A |
| `/search` | GET | `q`,`fandom`,`limit`,`strict` — no per-object ID; fics are public | `check_search_limit`→`get_current_user` | N/A (no per-object ownership) |
| `/admin/stats` | GET | none | **NONE** — see AUTH-1 | function-level authz ABSENT |
| `/health` | GET | none | public | N/A |

**No classic BOLA (IDOR) present:** no route lets a user pass another user's object
ID and read/modify it. The only authz gap is function-level (AUTH-1), not object-level.

## Token-verification verdict (audit step 2)
- **Signature verified:** YES. Google: `verify_oauth2_token` fetches Google certs and
  verifies the RS256 signature. JWT: `jwt.decode(..., algorithms=["HS256"])` verifies HMAC.
- **Algorithm allow-list:** YES, explicit. `decode_jwt` passes `algorithms=[JWT_ALGORITHM]`
  (single-element `["HS256"]`) → no `alg:none` / RS256→HS256 confusion. Google lib pins RS256.
- **aud:** Google — verified **only if `GOOGLE_CLIENT_ID` is set** (see AUTH-2). JWT — n/a (own issuer).
- **iss:** Google — verified by the lib against `{accounts.google.com, https://accounts.google.com}`. Good.
- **exp:** Google — verified by lib. JWT — `ExpiredSignatureError` handled in `decode_jwt`. Good.
- **Library vs hand-rolled:** Google uses the official `google-auth` client library (good).
  JWT uses PyJWT (standard). Token lifetime = 7 days (`JWT_EXPIRY_DAYS`). **No revocation**
  (stateless JWT) — see NEEDS-DECISION.

## NEEDS-DECISION (behavior-changing — human decides)
- **Admin role model.** AUTH-1 is gated by a shared `ADMIN_API_TOKEN` as a stopgap.
  A proper `is_admin`/role field on the user + JWT-based admin gate is a product/login
  change — left for you. Also: the frontend `/api/admin/stats` proxy
  (`frontend/app/api/admin/stats/route.ts`) sends **no** header; once you set
  `ADMIN_API_TOKEN`, update that proxy to forward `X-Admin-Token` or the ops page breaks.
- **JWT revocation / lifetime.** 7-day stateless JWT, no revocation list. Adding
  revocation (or shortening lifetime) changes auth behavior — left for you.
- **CORS `allow_origins=["*"]` with `allow_credentials=True`** (api.py:31). Tightening to
  the real frontend origin is a behavior change (and the wildcard+credentials combo is
  itself invalid per spec) — flagged here, cross-listed in INF; left for you to set the origin.
