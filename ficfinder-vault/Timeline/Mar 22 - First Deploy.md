---
date: 2026-03-22
tags: [deploy, scraping, milestone]
---

# Mar 22 — First Deploy ★

## What happened
- Built AO3 + FFN scrapers with SeleniumBase (headed mode — needed for AO3 interstitials)
- **820+ Naruto fics** indexed on AWS RDS — first real data in production
- Backend deployed to AWS App Runner (`fanficfinder-backend`)
- Frontend deployed to Vercel (`fanfiction-finder.vercel.app`)
- Name changed mid-session: "ficfinder sounds like feetfinder" → **FanFicFinder**

## AO3 quirks discovered
- Encodes `&` as `*a*` in fandom tag URLs (e.g. `Naruto+(Anime+*a*+Manga)`)
- Must use tag works URL format, not search URL (`archiveofourown.org/works?tag_id=...`)
- `work_search[words_from]` works; `work_search[word_count]` does not

## Infrastructure
- AWS RDS PostgreSQL 16.6 on db.t3.micro
- ECR: `473157802304.dkr.ecr.us-east-1.amazonaws.com/fanficfinder-backend:latest`
- App Runner ARN: `arn:aws:apprunner:us-east-1:473157802304:service/fanficfinder-backend/528af1471b70407c87d54cbc0ee74d6c`
- IAM role `AppRunnerECRRole` for ECR access

## Also
- Added Hunter x Hunter to `fandoms.py`

## Links
- [[Mar 20 - Inception]]
- [[Mar 21 - Frontend Planning]]
- [[Mar 23 - HyDE Query Design]]
- [[Mar 24 - Embedding Overhaul]]
