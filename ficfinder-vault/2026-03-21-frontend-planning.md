# Frontend planning
**Date:** March 21, 2026  
**Tags:** #product  
**Links:** ← [[2026-03-20-inception]] → [[2026-03-22-first-deploy]]

## What happened
Designed the full frontend spec before writing any code.

## Design system
- Color: warm stone tones + teal accent
- Type: Instrument Serif (display) + DM Sans (body) + JetBrains Mono (data)
- Built in Next.js + Tailwind from scratch — no component libraries

## 5 core components
1. **SearchBar** — typewriter placeholder, hero→header transition on first search
2. **StatusIndicator** — 5-step pipeline stepper with pulse/collapse animations
3. **ResultsTable** — 10 columns, shimmer loading, ranking reorder animation
4. **ExportButton**
5. **SearchHistory** — side panel, Dexie.js (IndexedDB)

## Hardest UX problem
Two-phase result loading: raw results stream in → ranked reorder happens. Rows need to animate into new positions without jarring the user.

## Storage
- No localStorage — all persistence through Dexie.js / IndexedDB
- No dark mode yet (future)
- No infinite scroll (results capped at 50/search)
