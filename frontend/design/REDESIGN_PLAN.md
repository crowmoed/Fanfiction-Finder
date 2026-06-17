# FicFinder Frontend Redesign — Plan

**Branch:** `feat/teahouse-theme` (continue here)
**Decisions locked:** Keep teahouse soul, productize it · Full design brief + token files · Keep both results views, make bento usable.
**Design read:** Product UI (a search tool), register = *product-first* with one *brand moment* (the empty-state hero). Same warm/literary teahouse identity, off the cream-default palette, one font system, real contrast, calm motion, no global WebGL background.

---

## Phase 0 — Design system source of truth (docs + tokens)

Write the artifacts everything else references:

1. **`frontend/design/PRODUCT.md`** — who/what/register, audience (fic readers), the one job (find a fic in plain English), brand moment vs. tool surfaces.
2. **`frontend/design/DESIGN.md`** — the committed system:
   - **Palette (off the cream default).** New base is a *deeper, clearly-brand* warm neutral, not L≈0.9 parchment. Light mode body ≈ warm off-white at near-zero/own-hue chroma OR a deeper tea-stained mid-tone; jade accent stays the identity. Add a **dark mode** (warm off-black, not pure #000). Define semantic tokens only (no raw hex in components). Every body/secondary/tertiary pair verified ≥4.5:1; large text ≥3:1.
   - **Type.** Retire Instrument-Serif-everywhere. One sans for UI/body + one serif used *only* for fic titles and the hero (a brand serif that is NOT Instrument Serif / Fraunces). No italic as the default for scannable text.
   - **Motion.** Remove the global `steps(2,end)` choppy transitions. Calm `ease-out` (custom curve), 120–250ms; reduced-motion alternative for everything. No always-on infinite animations.
   - **Shape & elevation.** One radius scale, one shadow scale (keep a *restrained* offset-sticker shadow as the one signature move, not on everything).
3. **Tokens land in `globals.css` (`:root` + `[data-theme="dark"]`) and `tailwind.config.ts`** (mapped classes), so new components use Tailwind classes, not inline `style={{ var() }}`.

Deliverable of Phase 0: the design is decided on paper + in tokens before component work.

---

## Phase 1 — Foundation cleanup

- Rewrite `globals.css`: new tokens, dark mode, kill choppy `steps()` motion, keep focus rings + reduced-motion block, keep useful utilities (line-clamp, scrollbar). Switch `100vh`→`100dvh`.
- Update `tailwind.config.ts`: full semantic color set (incl. dark), radius/shadow scales, fonts, motion tokens.
- `layout.tsx`: new fonts via `next/font`; **remove the global `GravityGridBackground` (WebGL RippleGrid)**; decide `SmoothScroll` (likely drop or scope it). Add `data-theme` handling.
- Prune dead/duplicate trees: `components/ResultsTable.tsx` vs `components/results/ResultsTable.tsx`, `ResultsCard.tsx`, `QuickFilters.tsx`, unused `ui/*` (glare/magic/aurora/tracing-beam/box-reveal/shine where replaced), `/demo` + `/ops` if confirmed throwaway. (I'll list exactly what's removed and confirm before deleting anything I didn't author.)
- Remove three.js/r3f/drei from `package.json` **if** nothing else needs them after the background goes.

---

## Phase 2 — Unified results layer (table + browse, shared filter state)

The big architectural change: **lift filter/sort/view state into one provider** so table and bento read the *same* filtered rows.

- New `useResultsState` (or context provider): owns platform/status/rating/words/kudos/tags + sort + view (`table | browse`). Both views consume it.
- **`ResultsTable`**: keep virtualization + columns; restyle to new tokens; fix a11y — remove the `onWheel preventDefault` scroll hijack, make the row open keyboard-accessible (real focusable control, not a div-with-cursor), real `<th aria-sort>`.
- **Browse (rebuilt bento)**: replace `GlareCard`/`MagicCard` with calm reading cards that share the toolbar's filters/sort. Top result gets *subtle* emphasis (size/weight), no casino badge.
- **`FicCard`**: kill the animated `emeraldShine` match badge + glassy/refraction layers → one calm, high-contrast match indicator (reuse `ScoreBar` language). Verify contrast.
- **Mobile**: real filterable card *list* (the existing `TableToolbar` already has a `viewMode` toggle hook to build on), not a 1100px horizontal-scroll table.
- One `ViewToggle` (table ↔ browse) on all viewports; one empty state, one loading state, one error state — all on-theme (remove hardcoded `#FEF2F2`/red error box).

---

## Phase 3 — Home / search shell

- **Hero (the brand moment):** new serif headline within clamp ceiling (≤6rem), single brand sticker, calm. Keep the morph empty→compact search, redo with View Transitions where it earns it.
- **`PromptSearchBar`:** restyle to tokens; replace `ShineBorder`/`InteractiveHoverButton` with calmer equivalents; keep textarea autosize, Cmd/Ctrl+Enter, rotating examples. Verify placeholder contrast (≥4.5:1).
- **`FilterChips` fandom picker:** keep, restyle; ensure the dropdown escapes clipping (portal/fixed) and is keyboard-navigable.
- **Loading (`ArchitectureBeam`):** keep the staged-pipeline idea (it's genuinely nice + maps to the real SSE stages), restyle to tokens, fix the stale orange glow, drive copy from real stage events where possible.
- **Proof/ambient:** `StatsTicker`/`FandomMarquee` restyle; **single source of truth** for the indexed-fic count (one constant, not hardcoded in two files). `TeahouseCanopy` vines: keep as the *one* tasteful brand flourish on empty state only, or cut — decide in Phase 0.
- **Auth/onboarding:** turn the abrupt "please sign in" into a proper first-run moment (the tool requires Google sign-in to function).

---

## Phase 4 — Secondary surfaces

- **Fic detail page** (`/fic/[platform]/[id]`): rebuild as a *reading-decision* page (title, author, stats, tags, summary, why-it-matched, read/find-similar CTAs) on new tokens; drop `TracingBeam`/`BoxReveal`/`ShimmerButton` poster wrappers; fix the banned 5xl italic headline.
- **Settings** (`SettingsContent`, modal + `/settings`): restyle to tokens; fix drifted `rgba(13,148,136)` teal + `text-white`-on-accent contrast.
- **Blog** (`/blog`, `[slug]`): bring into the type/token system (lighter pass).

---

## Phase 5 — Polish, a11y & verification pass

- Run the design tools' pre-flight: contrast (all text pairs), reduced-motion on every animation, dark-mode parity, mobile @375px + landscape, keyboard nav, focus order, touch targets ≥44px.
- `npm run lint` + `npm run build` must pass.
- Visually verify in the running app (light + dark) before declaring done.

---

## Sequencing & checkpoints

I'll work Phase 0 → 5 and **pause after Phase 0 (the brief + tokens) and after Phase 2 (the results core)** for your eyes, since those set the tone for everything after. Nothing outward-facing ships without you. Deletions of files I didn't author get listed and confirmed first.

## Out of scope / preserved

SSE staged-pipeline search, virtualized table mechanics, IndexedDB history (Dexie), auth/Stripe logic, all backend data contracts, the platform/rating/score semantic *meanings*. This is a visual + UX + a11y redesign, not a data-layer change.
