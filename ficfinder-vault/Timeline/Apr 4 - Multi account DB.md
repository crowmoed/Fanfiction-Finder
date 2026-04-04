---
date: 2026-04-04
tags: [planning, ToS, scale]
---
# Apr 4 — Today: Scale Planning & Null removal System

## What happened
- idea: split large vs. small fandoms across two Neon accounts
- Created this Obsidian vault to track project history
- Added a backend system to minimize the amount of wasted DB storage by clearing null vals

## Multi-account DB idea
To manage Neon storage/cost at scale:
- Account A: big fandoms (Harry Potter, Naruto, Marvel — high volume)
- Account B: small/niche fandoms (NCT, Steven Universe, etc.)
### DB Cleanup
Added a simple backend function that removes all Fanfics with a vector value of NULL
- Can be found in `backend/leanup.py`
- Executes the SQL command "DELETE FROM fics WHERE embedding IS NULL"
- This is necessary because sometimes the embedding fails and just returns null, in said cases they are added to the DB just with null even though they are unusable.

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
