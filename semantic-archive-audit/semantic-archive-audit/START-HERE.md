# Semantic Archive — Backend Audit + Fix Package (for Claude Code)

Six domains. Each `tasks/NN-*.md` is ONE self-contained run that **audits,
fixes, and verifies** that domain in a single pass. You run them; Claude Code
changes the code.

## ⚠️ Do this FIRST
Open each `tasks/*.md` and fill the `<scope>` block — replace `[fill in]`
with real repo paths. Blank scope = the agent edits the wrong files or misses
them.

## How to run
One domain at a time. In Claude Code:
> Read and execute `tasks/01-auth.md`.

It will: (1) audit read-only and write `findings/<DOMAIN>-findings.md`,
(2) fix Medium+ findings directly in code, (3) verify, (4) report the diff —
**staged, not committed.** You review the diff and commit. Then the next file.

Recommended order (sharpest edge first):
**01-auth, 02-llm, 03-stripe, 04-sql, 06-ops, 05-infra.**

## What each run will and won't do
- WILL: fix code-level findings tightly scoped to the flagged files. No
  refactoring of working logic, no drive-by edits.
- WON'T guess: anything that changes product behavior (token lifetime,
  rate-limit numbers, login/checkout flow) is marked `NEEDS-DECISION` in the
  findings file and skipped for you to decide.
- WON'T commit: changes are left staged so you review the diff first.
- **05-infra and the AWS backstops in 02/06 are PROPOSE-ONLY:** Claude Code
  outputs exact Windows CMD AWS CLI commands but does NOT execute them.
  Reason: autonomously changing RDS networking, IAM, secrets, or Budgets
  against live AWS can lock the app out of its own DB or break auth. You run
  those commands yourself.

## Rules (encoded in every task)
- Audit step is read-only. Fix step touches ONLY flagged code.
- One acceptance criterion per finding.
- Config/AWS fixes → Windows CMD AWS CLI (NOT PowerShell), as commands to run,
  never executed by the agent.
- Report files changed + per-ID status (FIXED / SKIPPED-NEEDS-DECISION); leave
  the diff staged.

## Independent re-check (optional, recommended for 01/03/04)
The verify step runs in the same session that did the fix — it's grading its
own work. For the security-critical domains, re-run just the VERIFY section in
a FRESH Claude Code session for a cold-eyes check.

## Domain → findings map
01-auth → AUTH-# · 02-llm → LLM-# · 03-stripe → PAY-# · 04-sql → SQL-#
· 05-infra → INF-# · 06-ops → OPS-#
