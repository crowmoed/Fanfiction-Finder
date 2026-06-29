# FicFinder frontend (skeleton)

A deliberately **unstyled, fully-functional** Next.js frontend for FicFinder. The
goal of this build is *optimal architecture*: every backend capability is wired,
typed, and demoable, with zero design committed — so the visual layer can be
dropped on top later without re-plumbing anything.

## Run

```powershell
cd D:\Fanfiction-Finder\frontend_2
npm install
copy .env.example .env.local   # then set BACKEND_URL, NEXT_PUBLIC_GOOGLE_CLIENT_ID
npm run dev                     # http://localhost:3000
npm run build                   # production build
npm run lint
npm run typecheck
```

The backend (FastAPI) runs separately on `:8000`. See the repo root README.

## Architecture

```
browser ──same-origin──> Next server routes (/api/*) ──> FastAPI backend (:8000)
```

The browser **never** sees the backend URL. `BACKEND_URL` is read only on the
server (`src/lib/server/backend.ts`), and every backend call is proxied through a
route in `src/app/api/*`.

### Layers

| Layer | Path | Responsibility |
|-------|------|----------------|
| Contracts | `src/lib/contracts.ts` | Single source of truth for backend wire types **and** the SSE pipeline protocol. Dependency-free; imported by both server and client. |
| Backend client | `src/lib/server/backend.ts`, `forward.ts` | The only code that knows `BACKEND_URL`. Typed fetch, error normalization, Bearer forwarding. `server-only`. |
| Server routes | `src/app/api/*` | Same-origin proxies. `fandoms`, `auth/login`, `auth/me`, `billing/*`, `admin/stats` are plain proxies; `search` is an **SSE stream**. |
| Client API | `src/lib/client/api.ts`, `token.ts` | Browser's typed client for our own `/api/*`. JWT persistence. |
| Client state | `src/lib/client/auth.tsx`, `useSearch.ts`, `useFandoms.ts`, `history.ts` | Auth context, the SSE-consuming search state machine, fandom loading, local search history. |
| Components | `src/components/*` | Presentational, restyle-ready: `SearchForm`, `FicCard`, `MatchScore`, `PipelineStatus`, `ResultsView`, `SiteNav`, `GoogleSignIn`. |
| Surfaces | `src/app/(page|results|history|account)` | Real wired pages. |
| Demos | `src/app/demos/*`, `src/lib/demo/*` | Every surface and state, backend-free — including the live loading scene. |

### The search SSE protocol

`GET /search` on the backend is one slow request returning `Fic[]`. The
`/api/search` route wraps it in Server-Sent Events emitting per-stage pipeline
events (`enhance → embed → retrieve → rank`) so the loading scene can be
choreographed to real progress. The protocol is defined once in `contracts.ts`
(`SearchStreamEvent`), consumed by `useSearch` in production and replayed by
`useSimulatedSearch` in demos. If the backend later streams its own stage events,
only `src/app/api/search/route.ts` changes — the wire contract stays identical.

### Why no design yet

`globals.css` is plain, neutral CSS — readable defaults and a handful of
structural utility classes (`.stack`, `.row`, `.card`, `.muted`). There are no
tokens, no theme, no animation. Components carry semantic structure and the full
data surface; the design pass replaces the markup/styles without touching the
data layer, routes, or contracts.

### Demos (`/demos`)

- **`/demos/search`** — drives the real loading + results components through
  every phase via simulated SSE events: success, many results, empty, error, slow.
- **`/demos/results`** — `FicCard` field permutations (high/mid/unranked score,
  missing fields, every platform).
- **`/demos/components`** — atoms frozen at each state, incl. the pipeline at
  every stage.
```
