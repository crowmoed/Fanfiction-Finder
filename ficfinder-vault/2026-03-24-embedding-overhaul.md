# Embedding pipeline overhaul
**Date:** March 24, 2026  
**Tags:** #ai  
**Links:** ← [[2026-03-23-hyde-design]] ← [[2026-03-22-first-deploy]] → [[2026-03-29-auth-planning]]

## What happened
Full overhaul of how fics are embedded and how queries are processed.

## Changes to embedder.py
| Before | After |
|--------|-------|
| `"{title}. {summary}. Tags: {tags[:15]}"` | `"Tags: {tags}. {title}. {summary}"` |
| 3072 dims | **768 dims** (Matryoshka) |
| No task types | `RETRIEVAL_DOCUMENT` for fics, `RETRIEVAL_QUERY` for queries |
| No normalization | L2 normalization via numpy (768-dim Gemini not pre-normalized) |
| Tags truncated at 15 | All tags included |

## Why tags first
Transformer attention weights front-loaded tokens more heavily. Tags before title/summary = better semantic representation. Also survives truncation better — tags carry the most retrieval signal.

## Why 768 not 3072
Matryoshka: truncating to 768 dims costs ~2-3% quality, saves 4× storage. At 34K+ fics this matters.

## Ranker fix
Fics omitted by LLM ranker were getting `match_score = 0` (hardcoded fallback). Changed to `None`. Zero looked like a valid score; None is correctly "not ranked."

## LLM ranker status
Temporarily disabled — `rank()` returns fics as-is (pgvector cosine order). Dead code kept for later reactivation.

## Breaking change
This is a full re-index. Existing Naruto fics at 3072 dims are incompatible.
