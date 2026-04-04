# DB cleanup + Neon migration
**Date:** March 31, 2026 (morning)  
**Tags:** #infra #cost  
**Links:** ← [[2026-03-29-auth-planning]] → [[2026-03-31-bedrock-decision]]

## What happened
RDS was getting expensive. Cleaned up Naruto data and migrated to Neon serverless.

## The bloat problem
- Reported RDS storage: 657 MB
- After VACUUM FULL: 182 MB actual data, 475 MB was dead bloat
- Root cause: deleted fics during cleanup left dead tuples

## Naruto cleanup
- Before: 69,379 fics at 5K word minimum
- Deleted 40,306 fics below 20K words
- After migration: **34,069 fics** on Neon

## Neon migration
- Neon serverless Postgres, Launch tier ($19/mo, 10 GB storage, scale-to-zero)
- PostgreSQL 17 (matched target version)
- 2,611 fics skipped (null embeddings)

## Config fixes post-migration
```python
# SQLAlchemy engine — Neon drops idle connections
pool_pre_ping=True
pool_recycle=300
```

## ⚠️ Security issue
Neon DB password and Gemini API key were exposed in App Runner logs. **Need rotation.**

## Bugs fixed
- Vercel `BACKEND_URL` trailing slash causing double-slash API routes
- Neon idle connection drops
