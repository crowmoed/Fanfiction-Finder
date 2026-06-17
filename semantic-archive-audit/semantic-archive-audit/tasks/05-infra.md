# TASK 05 — Infra, Secrets & Network (audit → PROPOSE → verify)
READ-ONLY for everything. This task does NOT change code or AWS. It audits and
outputs exact Windows CMD AWS CLI commands for YOU to run. Reason: flipping
RDS networking, IAM, or secrets autonomously against live AWS can lock the app
out of its DB or break auth.

<scope>
Dockerfile, app startup/config loader, App Runner service config, IAM role
ficfinder-apprunner-instance, RDS networking. Pin paths: [fill in]
</scope>

## Step 1 — AUDIT (read-only)
1. Secrets: DB creds, Stripe secret + webhook secret, Gemini key, JWT signing
   secret — plain env vars, or Secrets Manager / Parameter Store? Any secret
   hardcoded or committed? Check .gitignore + git-history exposure.
2. IAM: ficfinder-apprunner-instance — resource-scoped ARNs or wildcards?
   Long-lived access keys vs role temp creds? Bedrock/DynamoDB/Secrets perms
   over-broad?
3. Network: RDS public, or private subnet via VPC connector only? SG limited
   to the app SG on 5432, or open? TLS enforced on the RDS connection?
4. Container: root or non-root user? Secrets baked into image layers?
5. /docs and /redoc exposed in production?
Write to `findings/INF-findings.md`: IDs INF-1..n with verdicts on (a) where
each secret lives, (b) IAM wildcard vs scoped, (c) RDS public vs private,
(d) container user.

## Step 2 — PROPOSE (do NOT execute)
For each finding, write exact **Windows CMD** AWS CLI commands (or Dockerfile/
config edits as a diff to review) to remediate. Group destructive/locking
changes (RDS networking, IAM) separately with a one-line risk note each.
The ONLY direct code edits permitted here: a Dockerfile USER directive for
non-root, and protecting /docs (e.g. gating behind an env flag) — and even
those leave staged, not committed.

## Step 3 — VERIFY (read-back commands)
Provide the read-back commands (e.g. `aws rds describe-db-instances`,
`aws iam get-role-policy`) the user runs AFTER applying changes to confirm
each INF-# is resolved.

## Step 4 — REPORT
Per-ID status (PROPOSED), the command blocks, and any staged Dockerfile/docs
diff. Do not commit, do not execute AWS changes.
