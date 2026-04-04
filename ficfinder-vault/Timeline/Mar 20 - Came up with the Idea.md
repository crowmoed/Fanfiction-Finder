---
date: 2026-03-20
tags: [concept, stack, architecture]
---

# Mar 20 — Inception

## What happened
- Concept formed: unified fanfic search across AO3, FFN, Wattpad with AI-powered searching
- Core architectural decision: **scrape-to-DB** instead of a redundent search (avoids per-query latency/cost)
- Recognized ToS risk early — decided metadata-only DB approach

## Stack selected
- FastAPI backend
- PostgreSQL + pgvector
- Gemini embeddings (`gemini-embedding-001`)
- Next.js frontend

## Key insight
Scraping on every query would be kinda insane and way to expensive time and monetary wize. Pre-indexed fics with vector embeddings creating a database, use pgvector cosine similarity to narrow candidates before another LLM does the ranking.

## Links
- [[Mar 21 - Frontend Planning]]
- [[Mar 22 - First Deploy]]
