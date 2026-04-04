---
date: 2026-03-21
tags: [frontend, design, UX]
---


# Mar 21 — Frontend Planning

## What happened
- Full frontend created for FanFicFinder
- Chose Next.js + Tailwind 
- Dexie.js (IndexedDB) for local search history persistence

## Design system
- Warm stone color palette + teal accent
- Fonts: Instrument Serif (display) + DM Sans (body) + JetBrains Mono (data)
- All CSS variables, dark mode ready

## 5 core components designed
1. **SearchBar** — typewriter placeholder, hero→header transition on first search
2. **StatusIndicator** — 5-step horizontal stepper with pulse/collapse animations
3. **ResultsTable** — 10 columns, shimmer loading, ranking reorder animation
4. **ExportButton**
5. **SearchHistory** — side panel backed by Dexie.js

## Hardest UX problem
Two-phase result loading: raw results streaming in → ranked reorder. Rows need to animate into new positions when scores arrive without jarring the user.

## Links
- [[Mar 20 - Came up with the Idea]]
- [[Mar 22 - First Deploy]]
