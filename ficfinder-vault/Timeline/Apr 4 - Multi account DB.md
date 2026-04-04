---
date: 2026-04-04
tags: [planning, ToS, scale]
---

# Apr 4 — Today: Scale Planning

## What happened
- Flagged Wattpad ToS violation risk  it's the first thing they say on signup
- idea: split large vs. small fandoms across two Neon accounts
- Created this Obsidian vault to track project history

## Multi-account DB idea
To manage Neon storage/cost at scale:
- Account A: big fandoms (Harry Potter, Naruto, Marvel — high volume)
- Account B: small/niche fandoms (NCT, Steven Universe, etc.)

Each account gets 10 GB on Launch tier. Doubles available storage at same cost.

## Still open
- [ ] Rotate Neon password + Gemini API key (exposed in logs!)
- [ ] Test-index NCT (validate Wattpad scraper end-to-end)
- [ ] Index Hunter x Hunter
- [ ] Finalize free tier daily search limit
- [ ] Wire `excluded_tags` to SQL filters
- [ ] Add deploy script
- [ ] Enable Bedrock prompt caching
- [ ] Implement BM25/hybrid search layer
- [ ] Parallelize embedding/search calls

## Links
- [[Apr 4 - Parallel Scraping and Retry]]
- [[Mar 29 - Auth Planning]]
