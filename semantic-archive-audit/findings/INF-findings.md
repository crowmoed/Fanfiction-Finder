# INF Findings & Remediation Proposals
Run: 2026-06-13 · Task: tasks/05-infra.md · **PROPOSE-ONLY** (2 permitted code edits applied, staged)

| ID | location | Severity | Finding | Status |
|----|----------|----------|---------|--------|
| INF-1 | git history (`backend/.env` @ 014bf35, 880b37b/9c4879c blobs) | **Critical** | `backend/.env` was committed with a **real `GEMINI_API_KEY` and `DATABASE_URL`** (Neon URL embeds the DB password). Untracked later in e381c2a but **still recoverable from history**. `.gitignore` now correctly excludes `.env`. | PROPOSED (rotate + history rewrite) |
| INF-2 | backend/config.py + .env (all secrets) | High | All secrets (`DATABASE_URL`, `GEMINI_API_KEY`, `GOOGLE_CLIENT_ID`, `JWT_SECRET`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID`) are plain env vars from `.env` — no Secrets Manager / Parameter Store. | PROPOSED |
| INF-3 | backend/Dockerfile | Medium | Container ran as **root**; `COPY . .` can bake a local `.env` into an image layer. | **FIXED (staged)** — added non-root `USER appuser`. `.dockerignore` proposed below. |
| INF-4 | backend/api.py (FastAPI docs) | Medium | `/docs`, `/redoc`, `/openapi.json` exposed by default in production. | **FIXED (staged)** — gated behind `ENABLE_DOCS=1` (off by default). |
| INF-5 | backend/api.py:31 CORS | Medium | `allow_origins=["*"]` **with** `allow_credentials=True` — over-broad, and the wildcard+credentials combo is invalid per the CORS spec. | PROPOSED (cross-ref AUTH NEEDS-DECISION) |
| INF-6 | IAM role `ficfinder-apprunner-instance` | Unknown→propose | Couldn't read live policy (no AWS access in this run). Must confirm resource-scoped ARNs (not `*`), role temp creds (no long-lived keys), and least-priv Bedrock/DynamoDB/Secrets perms. | PROPOSED (read-back) |
| INF-7 | RDS/Neon networking | Unknown→propose | DB is **Neon** (serverless PG). Publicly reachable but credential+TLS gated. Confirm `sslmode=require` in `DATABASE_URL` and that the App Runner egress is the only path. | PROPOSED (read-back) |

## Secret-location verdict (audit step 1)
| Secret | Where it lives today | Target |
|--------|----------------------|--------|
| DATABASE_URL | `.env` env var (**leaked in git history**) | Secrets Manager + **rotate** |
| GEMINI_API_KEY | `.env` env var (**leaked in git history**) | Secrets Manager + **rotate** |
| JWT_SECRET | `.env` env var | Secrets Manager |
| GOOGLE_CLIENT_ID | `.env` env var (not secret per se) | Parameter Store ok |
| STRIPE_SECRET_KEY | `.env` env var | Secrets Manager |
| STRIPE_WEBHOOK_SECRET | `.env` env var | Secrets Manager (cross-ref PAY-5) |
| STRIPE_PRICE_ID | `.env` env var (not secret) | Parameter Store ok |

- **IAM wildcard vs scoped:** UNKNOWN (no live AWS read) — must verify (INF-6).
- **RDS public vs private:** Neon serverless — public endpoint, TLS+cred gated (INF-7).
- **Container user:** was root → **now non-root** (INF-3 fixed).

## Staged code edits (the only two permitted here)
1. `backend/Dockerfile` — non-root `USER appuser` (uid 10001) + `chown` of `/app`.
2. `backend/api.py` — `/docs` `/redoc` `/openapi.json` set to `None` unless `ENABLE_DOCS=1`.
   Verified: disabled by default, re-enabled with the flag.

## PROPOSE — remediation commands (Windows CMD, do NOT execute here)

### INF-1 (Critical) — rotate leaked secrets, then scrub history  [DESTRUCTIVE — operator runs]
> ⚠️ Risk: treat the leaked `GEMINI_API_KEY` and Neon DB password as **compromised** —
> rotate them FIRST (so the old values in history become useless), then optionally
> rewrite history. History rewrite is force-push and rewrites every collaborator's clone.
```bat
:: 1) ROTATE (do this first, regardless of history rewrite):
::    - Neon console: reset the database password, update DATABASE_URL everywhere.
::    - Google AI Studio: revoke the leaked GEMINI_API_KEY, issue a new one.
:: 2) (Optional) scrub the blob from history with git-filter-repo:
pip install git-filter-repo
git filter-repo --path backend/.env --invert-paths
:: 3) Force-push the rewritten history (coordinate with anyone who has a clone):
git push origin --force --all
git push origin --force --tags
```

### INF-2 / INF-5..INF-7 — Secrets Manager, CORS, IAM, network
```bat
:: --- Secrets Manager: store each secret (repeat per secret) ---
aws secretsmanager create-secret --name ficfinder/DATABASE_URL ^
  --secret-string "postgresql://USER:NEWPASS@HOST/db?sslmode=require" --region us-east-1
aws secretsmanager create-secret --name ficfinder/STRIPE_SECRET_KEY ^
  --secret-string "sk_live_..." --region us-east-1
aws secretsmanager create-secret --name ficfinder/STRIPE_WEBHOOK_SECRET ^
  --secret-string "whsec_..." --region us-east-1
aws secretsmanager create-secret --name ficfinder/JWT_SECRET ^
  --secret-string "<32+ byte random>" --region us-east-1
aws secretsmanager create-secret --name ficfinder/GEMINI_API_KEY ^
  --secret-string "<new key>" --region us-east-1
:: Then wire App Runner to inject them as env vars from Secrets Manager
:: (apprunner update-service ... RuntimeEnvironmentSecrets), and grant the instance
:: role secretsmanager:GetSecretValue on these ARNs only.

:: --- IAM (INF-6): inspect, then scope. LOCKING change — review before applying. ---
aws iam list-attached-role-policies --role-name ficfinder-apprunner-instance
aws iam list-role-policies --role-name ficfinder-apprunner-instance
:: For each inline policy, read it and replace any "Resource":"*" with concrete ARNs:
aws iam get-role-policy --role-name ficfinder-apprunner-instance --policy-name <name>
:: Example scoped DynamoDB policy (PutItem/GetItem/UpdateItem on the users table only):
::   "Resource": "arn:aws:dynamodb:us-east-1:ACCOUNT_ID:table/ficfinder-users"
:: Example scoped Bedrock policy (only the Haiku model used):
::   "Resource": "arn:aws:bedrock:us-east-1::foundation-model/anthropic.claude-haiku-4-5-*"

:: --- CORS (INF-5): code change, not AWS. In api.py set the real origin: ---
::   allow_origins=["https://fanfiction-finder.vercel.app"]  (drop the "*")
::   keep allow_credentials=True only with an explicit origin list.
```

## VERIFY — read-back commands (run AFTER applying)
```bat
:: INF-1: confirm .env no longer in history (expect no output)
git log --all --oneline -- backend/.env
git rev-list --all --objects | findstr "backend/.env"

:: INF-3: confirm image runs non-root (expect uid=10001)
docker build -t ficfinder-api ./backend && docker run --rm ficfinder-api id

:: INF-4: confirm /docs is gated (expect 404 in prod config)
curl -s -o nul -w "%%{http_code}" https://<app-runner-url>/docs

:: INF-6: confirm no wildcard resources remain
aws iam get-role-policy --role-name ficfinder-apprunner-instance --policy-name <name>

:: INF-7: confirm TLS + reachability
aws apprunner describe-service --service-arn <arn>
:: and that DATABASE_URL contains sslmode=require
```

## Recommended additional file (PROPOSED, not created — keeps to permitted edits)
`backend/.dockerignore` to keep secrets/junk out of the image build context:
```
.env
.env.*
logs/
__pycache__/
*.pyc
downloaded_files/
```
