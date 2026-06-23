# Backend Audit & Hardening

> **Fresh session / new chat? Read [`00-START-HERE.md`](00-START-HERE.md) first**, then [`backend-map.md`](backend-map.md). This folder is a self-contained handoff — it needs no prior conversation.

Working folder for two separate, sequenced passes over the FicFinder backend:

1. **Phase 1 — Cleanup** (subtractive): remove over-engineering / dead code found by the ponytail audit. Zero behavior change, `pytest`-verifiable.
2. **Phase 2 — API standards** (additive): bring the API up to industry standards (RFC 9457 errors, pagination, OpenTelemetry, CORS, versioning, rate limiting). Changes behavior/contracts.

Both passes were derived from a multi-agent audit (ponytail over-engineering pass, each finding adversarially grep-verified) and a verified industry-standard API research pass. This folder is the plan of record.

## Ground rules

- **Do the phases separately, Phase 1 first.** Deletions and behavior changes must not share a diff — if a test breaks you need to know which half did it. Cleanup first also shrinks the surface Phase 2 works on.
- **`pytest` green between every stage.** Run `cd backend && python -m pytest` (pytest is not in requirements.txt — `pip install pytest` first). If a stage touches the frontend contract, also `cd frontend && npm run lint && npm run build`.
- **Honor the audit's verification.** The 19 findings in [`02-cleanup-rejected.md`](02-cleanup-rejected.md) were checked and are NOT safe to cut — don't re-propose them.
- **Multi-site cuts are atomic.** Several deletions orphan companion code (a `__main__` block, an import, a CLI branch). Each is flagged in [`01-cleanup-cuts.md`](01-cleanup-cuts.md); remove the whole group or nothing.

## ⚠️ Where the two lenses collide (decide before cutting)

The cleanup lens says "delete"; the standards lens says "that's a deferred feature, keep it." Two cases:

1. **`check_search_limit`** (auth/dependencies.py) — ponytail flagged the no-op pass-through for deletion (low confidence). **KEEP IT.** Re-enabling rate limiting is OWASP API #4, and that seam is exactly where the 429 belongs. → Phase 2 stage C2.
2. **`add_search_text_column` / the `search_text` tsvector column** (db/postgres.py) — ponytail flagged it as an unbuilt BM25 feature (~72 lines). But hybrid keyword+vector retrieval is a legitimate, industry-standard search improvement, and this column is its seed. The audit's own verifiers **disagreed** on it. **HOLD — do not delete in Phase 1.** Decide in Phase 2 (stage B4/C3): wire it into `search_rrf` for hybrid search, or then delete.

## Stage tracker

| Stage | What | Doc | Status |
|---|---|---|---|
| 1 | Cleanup — Tier 1 (dead features & files) | [01](01-cleanup-cuts.md) | ✅ done — pytest 30✓ |
| 2 | Cleanup — Tier 2 (dead scaffolding/methods) | [01](01-cleanup-cuts.md) | ✅ done — pytest 30✓ |
| 3 | Cleanup — Tier 3 (micro-shrinks) | [01](01-cleanup-cuts.md) | ✅ done — pytest 30✓ |
| 4 | Cleanup — Tier 4 (dead imports) | [01](01-cleanup-cuts.md) | ✅ done — pytest 30✓ |
| 5 | API standards — Stage A (quick edits) | [03](03-api-backlog.md) | ☐ not started |
| 6 | API standards — Stage B (features) | [03](03-api-backlog.md) | ☐ not started |
| 7 | API standards — Stage C (decisions) | [03](03-api-backlog.md) | ☐ not started |

## Files

- [`00-START-HERE.md`](00-START-HERE.md) — handoff/orientation for a cold session: status, read order, working agreement, resume point. **Read first.**
- [`backend-map.md`](backend-map.md) — how the backend works: architecture, the live search path, module map, and verified doc-drift/gotchas. Read second so you understand the codebase without re-deriving it.
- [`01-cleanup-cuts.md`](01-cleanup-cuts.md) — the confirmed ponytail cuts as an ordered execution checklist (Tiers 1–4), with line numbers, replacements, and orphan-ripple notes.
- [`02-cleanup-rejected.md`](02-cleanup-rejected.md) — the 19 findings the verifier rejected, with why. Don't re-cut these.
- [`03-api-backlog.md`](03-api-backlog.md) — API-standards work, bucketed into stages A (quick edits), B (features), C (decisions).
- [`04-api-resources.md`](04-api-resources.md) — the verified, cited industry-standard reading list backing Phase 2.

## Scale (rough)

Phase 1 confirmed cuts total ~400 lines. Holding `check_search_limit` (−7) and `add_search_text_column` (−72) for the standards phase, and accounting for a few overlapping cuts, the immediate Phase-1 cleanup is **~310–315 lines, zero behavior change**. Phase 2 is feature/decision work, not a line count.
