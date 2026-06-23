# Phase 1 — Rejected cuts (do NOT delete)

These 19 findings were surfaced by the ponytail audit and then **rejected by adversarial verification** — each one is load-bearing despite looking like bloat. Recorded so they aren't re-proposed in a future pass.

| # | Proposed cut | Why it's kept |
|---|---|---|
| 1 | `strict` query param + hard-filter block (`api.py`) | **Live feature.** `frontend/hooks/useSearch.ts:77` hardcodes `strict:true` on every search; also threaded into analytics (`_log`, `record_search_event`) and a passing test. |
| 2 | `mins`/`maxs` word-count merge (`api.py:311-316`) | **Load-bearing.** The enhancer populates *both* ao3 and ffn bounds with different values; `search_rrf` takes one scalar, so the loosest-bound merge is required. |
| 3 | stdout UTF-8 reconfigure (`api.py:10-17`) | **Needed.** `print({q!r})` + a box-drawing request line run every search; non-ASCII queries crash on the cp1252 dev console without it. |
| 4 | `_invoke_enhancer` tenacity + botocore double retry (`query_enhancer.py`) | **Deliberate.** Documented denial-of-wallet hardening — botocore capped to 2 so the two layers don't multiply; tenacity covers errors botocore's taxonomy doesn't. |
| 5 | `add-search-text` CLI branch (`postgres.py:528-529`) | Parasitic on the shaky `add_search_text_column` deletion; it's a live migration tool for a deferred feature. (See the hybrid-search HOLD in [README](README.md).) |
| 6 | `DB_POOL_SIZE`/`DB_MAX_OVERFLOW` env overrides (`postgres.py:14-21`) | **Operational knob.** Set in the App Runner console (outside the repo); lets an operator raise the pool under load without a redeploy. Git history shows it was a purpose-built launch change. |
| 7 | `query` param on `ao3.build_search_url` (`ao3.py:21`) | **Breaks the indexer.** `indexer.py:153` passes it positionally; removing the param collides with the `fandom=` keyword → TypeError. (Only the broken `__main__` is safe — handled in Tier 1.) |
| 8 | Wattpad age-window sharding (`wattpad.py:107-192`) | **Real coverage.** The age shards let an overflowing 1-part bucket exceed Wattpad's 10k offset cap; deleting them hard-caps the largest buckets. |
| 9 | `index_ao3_only`/`ffn_only`/`wattpad_only` + `--*-only` flags (`indexer.py`) | **Not a drop-in for `--sources`.** They bypass the `progress.is_done` skip-guard (force-rescrape), differ on `--clear` and `--min-words`, and are documented user surface. |
| 10 | Manual arg parser → argparse (`indexer.py:540-705`) | **Live CLI contract.** fanfic-devtool spawns indexer as a subprocess with these exact flags; an argparse port must declare all ~12 or it rejects them. |
| 11 | `_Tee` class → stdlib (`indexer.py:548-607`) | **Not equivalent.** `_Tee` mirrors to terminal *and* logfile; `redirect_stdout`/`logging` capture only one and miss bare `print()` + SeleniumBase stdout. |
| 12 | `index_all` AO3+FFN dedup vs `index_fandom` (`indexer.py:417-478`) | **`--clear` data loss.** The naive delegation re-runs `clear_fandom` in the Wattpad pass, deleting the AO3+FFN rows pass 1 just wrote. |
| 13 | `_ProgressLock` stale-lock detection (`progress.py:36-82`) | **Crash recovery + cross-platform.** Real callers (~15); the stale-age branch unwedges resume after a Chrome crash; `os.replace` doesn't solve the read-modify-write race. |
| 14 | `http_`/`unhandled_exception_handler` dedup (`api.py:109-143`) | **Not real duplicates.** Two required handlers, different status/detail/logging; a helper nets ~1 line and risks the request-id header tests. |
| 15 | `httpx`/`anyio` pins (`requirements.txt`) | **The de-facto lockfile.** No lockfile exists; these are deliberate transitive pins required-by google-genai/starlette. |
| 16 | `match_reason` field (`schema.py:15`) | **Rendered by frontend_2.** Consumed in 7+ places (FicCard, FicDetail, ResultsTable…) as forward-looking contract for the ranker-reasoning feature. |
| 17 | `fmt()` number formatter (`rq.py:116-123`) | **Not equivalent to `{:,}`.** Handles `None`→"—" (call sites pass None) and SI compaction for fixed-width columns; `{:,}` crashes / overflows. |
| 18 | `google.genai` conftest stub (`conftest.py:31-36`) | **Load-bearing.** Proven: removing it makes `import api` fail with `ValueError: No API key` in a clean checkout — the stub is what makes the suite hermetic. |
| 19 | `get_db_counts` guarded dict init (`rq.py:30-40`) | Strips a deliberate "only the 3 known platforms" guard that matches `get_admin_stats`'s house pattern; ~3 lines for less safety. |
