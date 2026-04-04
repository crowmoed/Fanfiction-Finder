# First deploy ★
**Date:** March 22, 2026  
**Tags:** #infra #scraping  
**Links:** ← [[2026-03-21-frontend-planning]] → [[2026-03-23-hyde-design]] → [[2026-03-24-embedding-overhaul]]

## What happened
Built scrapers, deployed backend + frontend, indexed first real data.

## Scrapers built
- AO3: SeleniumBase, headed mode (for interstitial pages — must stay headed)
- FFN: SeleniumBase (curl_cffi and Playwright both failed against bot detection)

## AO3 quirks discovered
- Encodes `&` as `*a*` in fandom tag URLs (e.g. `Naruto+(Anime+*a*+Manga)`)
- Must use tag works URL (`/works?tag_id=...`), NOT the search endpoint
- `work_search[words_from]` works; `work_search[word_count]` does NOT

## Infrastructure
- Backend: AWS App Runner (`fanficfinder-backend`, `arn:aws:apprunner:us-east-1:473157802304:service/...`)
- Frontend: Vercel (`fanfiction-finder.vercel.app`)
- DB: AWS RDS PostgreSQL + pgvector
- ECR: `473157802304.dkr.ecr.us-east-1.amazonaws.com/fanficfinder-backend:latest`

## Milestone
**820 Naruto fics indexed** — first real data in production DB.

## Name change
"ficfinder sounds like feetfinder" → renamed to **FanFicFinder**

## Also
- Hunter x Hunter added to `fandoms.py`
- Vercel BACKEND_URL double-slash bug fixed post-deploy
