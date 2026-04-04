---
date: 2026-03-31
tags: [infra, database, cost, milestone]
---

# Mar 31 AM — DB Cleanup + Neon Migration

## What happened
- AWS RDS cost too high → migrated to **Neon serverless Postgres**
- Major Naruto fic cleanup: raised word floor from 5K → 20K words

## Neon details
- Plan: Launch tier ($19/mo)
- PostgreSQL 17
- True scale-to-zero (no idle compute cost)
- 10 GB storage

## Cleanup
- Before: 69,379 fics, 657 MB reported (475 MB was bloat)
- After VACUUM FULL: 182 MB actual data
- Deleted 40,306 fics (below 20K word floor)
- Migrated: **34,069 Naruto fics** (2,611 skipped — null embeddings)

## Bugs fixed
- Vercel `BACKEND_URL` trailing slash → double-slash API routes
- Neon idle connection drops → `pool_pre_ping=True` + `pool_recycle=300` in SQLAlchemy engine config

## ⚠️ Security issue
Neon DB password and Gemini API key were **exposed in App Runner output logs**. Both need rotation.

## Connection string pattern
```
postgresql+psycopg2://user:password@host.neon.tech/ficfinder?sslmode=require
```

## Links
- [[Mar 29 - Auth Planning]]
- [[Mar 31 PM - Bedrock Decision]]
