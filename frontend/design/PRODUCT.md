# PRODUCT.md — FicFinder ("Semantic Archive")

## What this is
Semantic search for fanfiction. A reader types what they want in plain English
("enemies to lovers slow burn, complete, no major character death") and gets a
ranked list of real fics scraped from AO3, FFN, and Wattpad. Search runs against
a pre-built index; results come back in under a second via an SSE pipeline that
streams each stage (expand → embed → retrieve → re-rank).

## The one job
Help a reader **decide what to read next** from a large corpus, fast. Everything
on screen serves scanning, comparing, and committing to a fic. The product is the
results, not the chrome.

## Register
**Product-first**, with exactly **one brand moment**: the empty-state hero on the
home screen. Once a search runs, the UI is a focused scanning tool. We do not let
"cozy teahouse" decoration slow down or clutter the act of finding a fic.

- Brand surface (may be expressive): empty-state hero, sign-in/onboarding.
- Tool surfaces (must be calm, dense, legible): results table + browse cards,
  filters, fic detail, settings.

## Audience
Fanfiction readers — often mobile, often browsing late, often power-users with
strong preferences (length, rating, completion status, ships, tropes). They know
their tags. They want signal, not marketing.

## Brand identity (kept, productized)
"A warm tea house full of books." Steeped-tea greens, aged paper, lamplight.
The identity is carried by **accent color, one serif for titles, and small warm
touches** — NOT by a cream body background, not by decoration on every surface,
not by always-on animation. Calm, literary, trustworthy.

## Non-negotiables
- Light **and** dark mode, both first-class, both contrast-verified.
- Every text pair ≥ 4.5:1 (large text ≥ 3:1). No washed-out gray-on-cream.
- Reduced-motion honored everywhere; no always-on infinite animations.
- The corpus count and other "facts" have a single source of truth.
- Backend/data contracts, auth/Stripe, SSE pipeline, IndexedDB history: untouched.

## Out of scope for the redesign
Data layer, scrapers, ranking, embeddings, auth logic. This is visual + UX + a11y.
