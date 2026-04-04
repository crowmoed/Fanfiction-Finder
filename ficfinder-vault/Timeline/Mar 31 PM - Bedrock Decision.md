---
date: 2026-03-31
tags: [AI, cost, bedrock, decision]
---

# Mar 31 PM — Bedrock Decision

## What happened
- Decided to eliminate all Gemini runtime costs by migrating inference to AWS Bedrock (covered by AWS credits)
- Gemini kept only for embeddings (index-time only — negligible per-search cost)

## Reasoning
- Indexing costs are a one-time expense per fandom — acceptable
- Runtime inference (query enhancement + ranking) happens on every search — must be near-zero
- AWS account has ~$200 in credits → Bedrock usage is effectively free

## Migration targets
- `query_enhancer.py` → Bedrock Haiku
- `ranker.py` → Bedrock Haiku

## Model selected
`us.anthropic.claude-haiku-4-5-20251001-v1:0`
(Haiku 3.5 was blocked as Legacy in us-east-1)

## Links
- [[Mar 31 AM - DB Cleanup and Neon Migration]]
- [[Apr 2 - Bedrock Live and HyDE Pipeline]]
