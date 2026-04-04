---
date: 2026-03-31
tags: [AI, cost, bedrock, decision]
---
Basically I wanted to make the effect costs of running the platform as minimal as possible and the gemini query enhanement is really the only place I saw that costed me anything at runtime and so what I did was I just decided lets instead of gemini lets use AWS because its free. worked out well and even ended up with better query enhancement because Im using a more advanced model. 
# Mar 31 PM — Bedrock Decision

## What happened
- Decided to eliminate all Gemini runtime costs by migrating inference to AWS Bedrock (covered by AWS credits)
- Gemini kept only for embeddings (index-time only  small per-search cost)

## Reasoning
- Indexing costs are a one-time expense per fandom // its like 1 dollar for a  whole fandom
- Runtime inference (query enhancement + ranking) happens on every search // this needs to be cheaper
- AWS account has ~$200 in credits → Bedrock usage is effectively free 
- an additional point is the claude Haiku 4.5 model is significantly more advanced at language interpretation then gemini 2.5-flash model

## Migration targets
- `query_enhancer.py` → Bedrock Haiku
- `ranker.py` → Bedrock Haiku

## Model selected
`us.anthropic.claude-haiku-4-5-20251001-v1:0`
(Haiku 3.5 was blocked as Legacy in us-east-1)

## Links
- [[Mar 31 AM - DB Cleanup and Neon Migration]]
- [[Apr 2 - Bedrock Live and HyDE Pipeline]]
