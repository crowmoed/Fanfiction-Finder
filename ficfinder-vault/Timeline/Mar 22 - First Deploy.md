---
date: 2026-03-22
tags: [deploy, scraping, milestone]
---

# Mar 22 — First Deploy ★

## What happened
- Built AO3 + FFN scrapers with SeleniumBase (headed mode needed because AO3 was blocking web requests without tokens)
- **820+ Naruto fics** indexed on AWS RDS  first real data in production
- Backend deployed to AWS App Runner (`fanficfinder-backend`)
- Frontend deployed to Vercel (`fanfiction-finder.vercel.app`)
- Name changed mid-session: "ficfinder sounds like feetfinder" bruh **FanFicFinder**

## AO3 quirks discovered
- ran into a bunch of problems with the AO3 url seach. really weird system.

## Infrastructure
- AWS RDS PostgreSQL 16.6 on db.t3.micro // this got really expensive
- IAM role `AppRunnerECRRole` for ECR access

## Also
- Added Hunter x Hunter to `fandoms.py` // Quinn requested

## Links
- [[Mar 20 - Came up with the Idea]]
- [[Mar 21 - Frontend Planning]]
- [[Mar 23 - HyDE Query Design]]
- [[Mar 24 - Embedding Overhaul]]
