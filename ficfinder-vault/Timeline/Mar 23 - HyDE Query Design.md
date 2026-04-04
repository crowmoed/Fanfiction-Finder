---
date: 2026-03-23
tags: [AI, HyDE, query-enhancement]
---
Basically made it so the users Query instead of being just vecotirzed and used for searching was firstly expanded by an LLM, gemini to start now its Caludes Haiku 4.5, and then additionally after that it creates a model fanfic and embeds that because that will actually be representative of what the fanfic vector is like. 

think of it like this, compare the exact words of a prompt to the fanfic description you excpect.
"Naruto neglect fanfic where he becomes op"
"Naruto left alone and forgotten by his family paves his own path to hokage"
Thats like really different and so we used the query enhancement to take the original prompt and create a fake description of the excpected descriptions to get a vector that has the best COS similiarity to do wanted fanfics.
# Mar 23 — HyDE Query Design

## What happened
- Designed HyDE-style (Hypothetical Document Embeddings) query expansion pipeline
- User types query → Gemini(updateded to Haiku 4.5) rewrites it into a dense semantic prose paragraph → embed that instead

## Output schema (Pydantic)
```python
semantic_description: str      # 100-200 token hypothetical fic summary
ao3_tags: list[str]
ao3_filters: dict
ffn_keywords: list[str]
ffn_filters: dict
detected_ships: list[str]
detected_characters: list[str]
excluded_tags: list[str]
```

## Key design decision
**Dual schema enforcement**: `response_schema` config + natural language description in system prompt. Config-only schema enforcement degrades output quality by 5-10% 

## Why prose over tag list
Prose embeds more richly than flat tag lists. A 100-200 token hypothetical fic summary aligns better with the fanfic summary corpus already indexed via `RETRIEVAL_DOCUMENT`.

## Planned embedding
Blend HyDE description embedding (0.7) + raw query embedding (0.3), re-normalize before pgvector search.

## Links
- [[Mar 22 - First Deploy]]
- [[Mar 24 - Embedding Overhaul]]
