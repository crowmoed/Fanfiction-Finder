# CLAUDE.md — frontend_2

Guidance for working in `frontend_2/`. Read this before touching anything here.

## What this is (and isn't)

`frontend_2/` is a **from-scratch rebuild** of the FicFinder frontend. Its job right
now is to be a **fully-functional skeleton**: every feature works end-to-end, the
architecture is clean, and it's wired to the real backend contracts — but the
**visual design is deliberately NOT applied yet**.

- **In scope now:** features, behavior, state/data flow, interaction polish
  (motion, transitions, loading/empty/error states, accessibility), and
  architecture. Make these excellent.
- **Out of scope now:** the actual brand/visual design. Styling here is a neutral
  skeleton palette (plain CSS in `globals.css`) chosen to be *replaceable*, not
  final. Don't invest in bespoke visuals, color systems, or theming yet.

The locked visual direction ("Hearth Archive" — a cozy pixel mountain-library)
lives in the project notes and gets layered on **later**. Until then: build the
machine, make it feel right, leave the paint for the design pass.

> **Never look at the old `frontend/` directory.** This is an independent rebuild.

So when a request is ambiguous, bias toward: *does this make a feature work, or
make an interaction feel right?* → do it. *Is this committing to a final visual
look?* → keep it neutral/skeleton and flag it.

## Commands (Windows / PowerShell)

```powershell
cd D:\Fanfiction-Finder\frontend_2
npm install
npm run dev         # http://localhost:3000
npm run build       # production build (via the Node-24 shim — see gotchas)
npm run lint        # eslint
npm run typecheck   # tsc --noEmit
```

No frontend unit-test runner is configured — `lint` + `typecheck` + **visual
verification in a real browser** are the checks. Visually confirm every feature
(screenshot it) before calling it done.

## Architecture

```
browser ──same-origin──> Next server routes (src/app/api/*) ──> FastAPI backend (:8000)
```

The browser **never** sees the backend URL. `BACKEND_URL` is read only on the
server (`src/lib/server/backend.ts`); every backend call is proxied through a
route under `src/app/api/*`.

### Route groups: app vs dev (kept separate)

- `src/app/(app)/` — the **real product**, wrapped in the claude.ai-style sidebar
  shell (`AppShell`). Routes: `/` (home/search), `/results`, `/fic/[id]`,
  `/saved`, `/history`. Saved/History are real pages; Settings is a tabbed modal.
- `src/app/(dev)/dev/` — **all demos**, under `/dev/*`, with their own dark "DEV"
  bar (noindex). Every surface/state is demoable backend-free; `/dev/seed`
  populates the real local stores + a fake account to preview a populated app.
- `src/app/api/*` — server proxies. `search` is an **SSE stream**; the rest are
  plain JSON proxies.

### Layers

| Layer | Where | Responsibility |
|-------|-------|----------------|
| Contracts | `src/lib/contracts.ts` | Single source of truth for backend wire types + the SSE pipeline protocol. Dependency-free. |
| Backend client | `src/lib/server/backend.ts`, `forward.ts` | The only code that knows `BACKEND_URL`. `server-only`. Opt-in retry+dedupe. |
| Client API | `src/lib/client/*` | Browser → our `/api/*`; auth context, `useSearch` (SSE), fandoms, history. |
| Results domain | `src/lib/results/*` | Results cache (save-by-URL), fic store, saved-searches, facets (platform/rating/status/tags/length), `meta.ts` (normalized accessors over `Fic.meta`), highlight, export, ids. |
| Components | `src/components/*` | Presentational + interaction; restyle-ready. |
| Demos | `src/lib/demo/*` + `(dev)/dev/*` | Fixtures + simulated search; preview every state. |

## Conventions & gotchas

- **Styling is skeleton, not design.** Plain CSS in `src/app/globals.css` with
  neutral tokens and structural utility classes (`.stack`, `.row`, `.card`,
  `.xl-*` table, `.sidebar-*`). Restyle later; don't treat current colors as final.
- **Motion follows Emil Kowalski's rules** (entrances `ease-out` < 300ms, custom
  curves `--ease-drawer` / `--ease-out-strong`, `:active` press feedback, stagger
  lists, never `scale(0)`, only `transform`/`opacity`, and a
  `prefers-reduced-motion` guard). Keep new motion consistent with that.
- **Sidebar collapse:** one variable `--current-sidebar-w` drives both the fixed
  sidebar width AND `.app-main`'s left padding on the same curve — so content
  slides in lockstep with the panel (don't reintroduce a flex-centered main that
  teleports).
- **Local-only persistence:** results cache, saved searches, history, fic store,
  read state — all `localStorage`, no backend. Stores using
  `useSyncExternalStore` must return a **stable** `getSnapshot` reference (memoize
  derived arrays) or React infinite-loops.
- **The backend ranker returns score only** — `match_reason` is never populated by
  the live path. Match highlighting is therefore honest **client-side query-term
  overlap**, not a fabricated rationale. Don't present it as the model's reasoning.
- **Per-fic rich metadata lives in `Fic.meta`** — a platform-tagged union
  (AO3/FFN/Wattpad, discriminated by `meta.type`) with author, rating, chapters,
  completion, dates, native stats. Every field is optional and `meta` is null for
  legacy rows. **Don't switch on `meta.type` in the UI** — read it through the
  normalized, null-tolerant accessors in `src/lib/results/meta.ts`
  (`ficAuthor`, `ficRating` → `G/T/M/E/Not Rated`, `ficComplete`, …). Facets
  (rating/status) are built from these.
- **Platform link badges** use each site's real favicon (via Google's favicon
  service) with an original lettermark SVG fallback. Do **not** hand-reproduce the
  sites' trademarked logos.
- **Node-24 + Windows build bug:** `fs.readlink` on a regular file throws `EISDIR`,
  which breaks `next build`. `npm run build`/`start` run through
  `scripts/next.cjs`, which preloads `scripts/node24-readlink-shim.cjs`. `dev` is
  unaffected. After moving page files, clear `.next` — stale generated route types
  break `typecheck` until regenerated. If the dev server shows "Internal Server
  Error" / missing-manifest after lots of rebuilds, kill node + `rm -rf .next` +
  restart (Windows webpack cache corruption, not your code).
- **Env:** server-only `BACKEND_URL` (default `http://localhost:8000`), optional
  `ADMIN_API_TOKEN`; public `NEXT_PUBLIC_GOOGLE_CLIENT_ID`,
  `NEXT_PUBLIC_ENABLE_DEMOS`. See `.env.example`.
