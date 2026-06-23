# START HERE — handoff for a fresh session

You're picking up a backend audit + hardening effort for **FicFinder** (semantic fanfiction search). This folder is self-contained — you do **not** need the prior chat. Read this file, then the others in order.

## What this is

A multi-agent audit of the FastAPI backend produced two pieces of work:
1. **Phase 1 — Cleanup**: remove over-engineering / dead code (subtractive, zero behavior change).
2. **Phase 2 — API standards**: bring the API up to industry standards (additive: RFC 9457 errors, pagination, OpenTelemetry, CORS, versioning, rate limiting).

Every Phase-1 cut was adversarially grep-verified across the whole repo before landing here. Every Phase-2 item is backed by a verified, current industry source.

## Current status

**Planning complete. NOTHING has been applied to the backend yet.** No code changed; these are plan-of-record docs. The working tree's uncommitted changes are all frontend (unrelated to this audit).

## Read in this order

1. `00-START-HERE.md` — this file.
2. `backend-map.md` — how the backend works (architecture, the live search path, doc-drift/gotchas). Read this so you understand the codebase without re-reading ~5000 lines.
3. `README.md` — the master plan, ground rules, and stage tracker.
4. `01-cleanup-cuts.md` — Phase 1 execution checklist (Tiers 1–4).
5. `02-cleanup-rejected.md` — 19 things that LOOK like dead code but are load-bearing. Do not cut these.
6. `03-api-backlog.md` — Phase 2 backlog (Stages A/B/C).
7. `04-api-resources.md` — the cited reading list behind Phase 2.

## Working agreement (how to operate here)

- **Do not apply code changes without an explicit go-ahead.** Present the plan; wait for "go."
- **Phase 1 before Phase 2.** Never mix deletions and behavior changes in one diff.
- **`pytest` green between every stage.** `cd backend; python -m pytest` (install pytest first — it's not in requirements.txt). If a change touches the frontend contract, also `cd frontend; npm run lint; npm run build`.
- **Two cuts are deliberately SKIPPED in Phase 1** because the standards lens says they're deferred features, not dead code — `check_search_limit` (rate-limit seam) and `add_search_text_column`/`search_text` (hybrid-search seed). See the README's "lens collision" section. Don't delete them.
- **Multi-site cuts are atomic** — several deletions orphan a companion `__main__` block / import / CLI branch; each is flagged in `01`. Remove the whole group or none.
- **Usage discipline.** Match effort to the task. Heavy adversarial fan-out (an agent per finding) is justified for "is this safe to delete" but is wasteful for light tasks like gathering a reading list — do those inline. (The prior session over-spent by fanning out ~50 verifier agents for a link list.)

## Environment

- Repo root: `D:\Fanfiction-Finder` · Windows / **PowerShell** (use `cd D:\path`, not cmd-style prefixes).
- Backend server entrypoint: `api:app` (`backend/api.py`) — **not** `main.py` (that's a throwaway test runner).
- Env loads from the **repo-root `.env`** via `config.py` (not `backend/.env`).
- No PRs, no "Co-Authored-By: Claude" trailers — commit directly if asked to commit (global preference).

## Resume point

When given the go-ahead, start **Phase 1 → Tier 1** from `01-cleanup-cuts.md`, then run `pytest`. Update the stage tracker in `README.md` as you complete each tier.
