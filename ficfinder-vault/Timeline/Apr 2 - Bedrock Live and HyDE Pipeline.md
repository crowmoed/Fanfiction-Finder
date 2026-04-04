---
date: 2026-04-02
tags: [AI, bedrock, milestone, pipeline]
---
Basically yeah finished the Bedrock migration and made it live. also made it so that the Hyde query enhancement didnt just make 1 imitation story but instead I createed a tri prompt method that created 3 unique storys matching the given prompt, all three from a different angle and vectorized each then found the top 100 most similiar of each. That resulted in list of 300 fics and then I used an LLM to rank only the top 100 of the fics most relevent to the original prompt.
# Apr 2 — Bedrock Live + Multi-Angle HyDE Pipeline ★

## What happened
- Full Bedrock migration complete
- New multi-angle HyDE search pipeline implemented
- `ARCHITECTURE.md` created as Claude Code prompting reference

## Bedrock migration
- `query_enhancer.py` → `us.anthropic.claude-haiku-4-5-20251001-v1:0`
- `ranker.py` → same model
- IAM role `ficfinder-apprunner-instance` attached to App Runner with `bedrock:InvokeModel` permissions
- Fixed: Bedrock response JSON parsing (markdown fence stripping, `content[0]["text"]` extraction)

## Multi-angle HyDE pipeline
```
User query
  → Bedrock Haiku: generate 3 diverse semantic descriptions
  → 4 vector searches with varying blend ratios:
      [0.8 HyDE / 0.2 raw]
      [0.7 HyDE / 0.3 raw]
      [0.5 HyDE / 0.5 raw]
      [1.0 raw]
  → Deduplicate, cap at 100 candidates
  → Bedrock ranker (ranked against original raw query)
  → Return top 100
```

## Also explored
- Running SeleniumBase indexer on EC2 with Xvfb (virtual display for headed browser)
- Alternative: GitHub Actions Ubuntu runners (have Xvfb available)

## Still outstanding
- [ ] Parallelize embedding/search calls
- [ ] Enable Bedrock prompt caching
- [ ] Wire `excluded_tags` to SQL filters
- [ ] Add deploy script
- [ ] Rotate exposed credentials (Neon, Gemini)

## Links
- [[Mar 31 PM - Bedrock Decision]]
- [[Apr 3 - Wattpad Scraper]]
