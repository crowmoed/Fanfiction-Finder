# Inception
**Date:** March 20, 2026  
**Tags:** #product #infra  
**Links:** → [[2026-03-21-frontend-planning]]

## What happened
First session. Defined the concept and made the foundational architectural call.

## Core concept
Unified semantic fanfic search across AO3, FFN, Wattpad — user types a natural language query, AI matches it to indexed fics.

## Key decisions
- **Scrape-to-DB, not live federation** — live querying would be too slow and too expensive at runtime
- **Metadata-only** — store titles, tags, summaries, word counts, links; never full fic text
- **Stack:** FastAPI backend, PostgreSQL + pgvector, Gemini embeddings

## Why this architecture
Federated real-time search = per-query scraping + per-query AI = cost-prohibitive. Pre-indexing with vector embeddings narrows to candidates before any LLM work.

## Open at end of session
- Everything. This was day one.
