# Bedrock decision
**Date:** March 31, 2026 (evening)  
**Tags:** #cost #ai  
**Links:** ← [[2026-03-31-db-cleanup-neon]] → [[2026-04-02-bedrock-live]]

## What happened
Made the call to eliminate all Gemini runtime costs by migrating inference to AWS Bedrock.

## The problem
Gemini Flash was being called at search time (query enhancer + ranker). This costs money per search. AWS credits cover Bedrock usage.

## Decision
- **Migrate to Bedrock:** `query_enhancer.py` and `ranker.py`
- **Keep Gemini for:** embeddings only (index-time, ~1 call/search = negligible)
- **Model:** `us.anthropic.claude-haiku-4-5-20251001-v1:0` (Haiku 3.5 was blocked as Legacy)

## Why keep Gemini embeddings
- `gemini-embedding-001` with 768-dim Matryoshka is genuinely strong
- Switching would require re-embedding the entire corpus
- Bedrock embedding options (Titan, Cohere) are both weaker
- Embedding happens at index time — not a runtime cost per search

## Status at end
Decision made, migration not yet done → [[2026-04-02-bedrock-live]]
