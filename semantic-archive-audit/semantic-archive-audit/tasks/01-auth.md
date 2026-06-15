# TASK 01 — Auth & Authorization (audit → fix → verify, one run)
Work ONLY within this domain's scope. Do not touch unrelated code. Leave all
changes staged, do not commit.

<scope>
Auth/token verification module, all FastAPI route handlers, the current-user
dependency. Pin paths: [fill in]
</scope>

## Step 1 — AUDIT (read-only)
1. BOLA — every endpoint accepting an object ID (path/query/body): does it
   verify the authenticated user owns/may access that object, or only that
   they're logged in? Build a table: endpoint, object, PRESENT/ABSENT.
2. JWT / Google ID token verification:
   - Signature actually verified, or token only decoded?
   - Explicit algorithm allow-list (RS256), or accepts the token's `alg`?
     (alg:none / RS256->HS256)
   - aud, iss, exp validated? Google: aud == client ID, iss in
     {accounts.google.com, https://accounts.google.com}.
   - Hand-rolled vs Google client library? Token lifetime? Revocation?
3. Function-level authz: any privileged route missing a role check?
Write all findings to `findings/AUTH-findings.md`: ID (AUTH-1..n), file:line,
severity, why, fix direction, plus the BOLA table.

## Step 2 — FIX (Medium+ findings)
- Implement each Medium/High/Critical fix, scoped to the flagged code only.
  No refactor of working logic.
- BOLA fixes (adding ownership checks) and token-verification hardening
  (allow-list algorithms, validate aud/iss/exp, switch to the Google library)
  are in scope to fix directly.
- Anything that changes product behavior (token lifetime, login flow,
  introducing revocation) → mark `NEEDS-DECISION` in the findings file, skip.
- Update findings file: each AUTH-# → FIXED / SKIPPED-NEEDS-DECISION.

## Step 3 — VERIFY
Re-check each FIXED item against its finding. Confirm no new BOLA introduced
by the edits.

## Step 4 — REPORT
List files changed, per-ID status, and the staged diff. Do not commit.
