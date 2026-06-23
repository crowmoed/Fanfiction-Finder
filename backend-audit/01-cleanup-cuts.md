# Phase 1 — Cleanup (ponytail cuts)

Subtractive only. Every item below was adversarially grep-verified across the whole repo (backend, frontend, frontend_2, fanfic-devtool, tests) before landing here. Ordered biggest-cut-first within each tier. Check items off as applied; run `pytest` after each tier.

**Skipped on purpose** (see [README](README.md#️-where-the-two-lenses-collide-decide-before-cutting)):
- `check_search_limit` (auth/dependencies.py:34-40) — keep for the planned 429 gate.
- `add_search_text_column` + `search_text` column (db/postgres.py:175-244, 528-531) — HOLD for the hybrid-search decision in Phase 2.

> Line numbers are from the audit snapshot; re-confirm live before editing (the file may have shifted). `Edit` requires reading the file first anyway.

---

## Tier 1 — dead features & files (~168 immediate; add_search_text_column held)

- [x] **`backend/main.py`** — delete the whole file. Throwaway "quick test runner", zero importers, duplicates the live api.py path. *(−42)*
- [x] **`ffn.search()`** `scrapers/ffn.py:121-159` — only caller is the dead main.py; indexer reimplements its own loop. **Also removed** the now-orphaned `build_category_url` (22-24), the `__main__` block (162-165), and the orphaned `import time` + `from seleniumbase import SB` + `from data.fandoms import FANDOMS` (all used only inside `search()` — audit had missed these three; `import random` left for Tier 4). *(−39, actual −57)*
- [x] **`search_similar()`** `db/postgres.py:272-301` — legacy single-vector retrieval, zero callers (live path is `search_rrf`). *(−31)*
- [x] **`ao3.search()`** `scrapers/ao3.py:87-112` — only caller is dead main.py; its `__main__` is broken (`for fic in fic`), proving it never ran. **Also removed** the `__main__` block (122-125), `import time` (line 4), and the orphaned `from seleniumbase import SB` (line 1, used only inside `search()` — audit had missed it). *(−31, actual −36)*
- [x] **5 unused `EnrichedQuery` fields** `ai/query_enhancer.py` — `ao3_tags`, `ffn_keywords`, `detected_fandoms`, `detected_ships`, `detected_characters`. Prompted for but read nowhere downstream (api.py uses only `semantic_descriptions`, `ao3_filters`, `ffn_filters`, `excluded_tags`). Trimmed the model fields, the 5 prompt sections (renumbered 1–4), both prompt examples, the fallback `EnrichedQuery(...)`, and the 2 log lines. Key-rules block + module docstrings still mention removed concepts but were left (out of audit scope; still aid description quality). *(−27)*
- [ ] **HELD — `add_search_text_column()`** `db/postgres.py:175-244` + CLI branch `528-529` + usage string `531`. **Do not delete in Phase 1.** Decide in Phase 2 (hybrid search). *(−72 if cut)*

## Tier 2 — dead scaffolding, methods, redundant logging (~97)

- [x] **`migrate_tags_to_array()` verification blocks** `db/postgres.py:115-172` — kept the ALTER/UPDATE/RENAME; dropped the post-migration count/null/empty/sample SELECT+print scaffolding (140-141, 155-172). *(−20)*
- [x] **`upsert_fic_local()`** `db/local_storage.py:239-250` — no caller; indexer uses the batch writer (docstring says "prefer the batch API"). *(−13)*
- [x] **`embed_fic()`** `ai/embedder.py:112-120` + its title-param branch in `_embed_single` (the `if title is not None` block + the `title=` param) — zero call sites (indexer=batch, api=query). Touched up the `embed_fics_batch` docstring. *(−12)*
- [x] **`EARLY_STOP_ENABLED` dead branch** `scrapers/wattpad.py:67-68, 379, 437-444` — flag hardcoded `False`; branch unreachable; removed `consecutive_empty`/`MAX_EMPTY_PAGES` + the section-header comment. *(−12)*
- [x] **eager `search()` wrapper** `scrapers/wattpad.py:467-477` — one-caller shim; inlined `[fic for batch in search_iter("naruto", max_pages=20) for fic in batch]` into `__main__`. *(−12)*
- [x] **`median_ratio` / `p75_ratio`** `scrapers/wattpad.py` — computed + printed in `calibrate()` but never drive filtering. Dropped them (compute, the 2 keys in **both** the return dict and the fallback dict, the 2 prints, the docstring lines) and the now-dead `import statistics`. *(−12)*
- [x] **`BrowserSession.tick()`** `indexer.py:78-85` + its 3 call sites + the class-docstring ref — self-documented no-op kept "for compat". *(−11)*
- [x] **9 `print("[search]…")` lines** `api.py` (audit said 6 — actual was **9**: the request header block, enhanced/raw-embedding/RRF/ranking traces, and the in-loop filter trace). Removed all 9, **plus the dead 3-line `for key in (...)` diagnostic loop** that only existed to emit the in-loop print, and de-staled its comment. Left the UTF-8 stdout reconfigure (rejected #3) and the structured `_log` path. *(−9, actual ≈−13)*
- [x] **`BrowserSession.clear_browser_state()`** `indexer.py:101-107` — never called; trimmed the docstring ref. *(−8)*

## Tier 3 — micro-shrinks (~36; check_search_limit skipped)

- [x] **`bar()` ASCII progress bar** `rq.py` — decorative for a dev count tool. 4-site removal: fn + `progress = bar(...)` + `{progress}` token + `Progress` header word. *(−7)*
- [x] ~~**`delay=0`/`sleep(0)` no-op throttles**~~ — **subsumed by Tier 1** (lived inside the deleted `ffn.search()`/`ao3.search()`); nothing left to cut. *(n/a)*
- [x] **`lifespan` no-op** `api.py` — dropped the function + the `lifespan=` arg + the now-dead `ensure_vector_index` import + `asynccontextmanager` import. (The `ensure_vector_index` *function* in postgres.py is left in place — a usable manual HNSW-index utility, now uncalled, like the held `add_search_text_column`.) *(−5)*
- [x] **`request_context` try/except** `api.py` — caught `Exception` only to `raise` it. Dropped the try, de-indented the `call_next`. *(−5)*
- [x] **```-fence stripping duplication** `ai/query_enhancer.py` + `ai/ranker.py` — extracted a shared `strip_fences()` helper into new module **`ai/_json_utils.py`** (using `str.removeprefix`); both call sites now call it. Verified byte-equivalent to the old inline logic. *(refactor — net ~neutral, DRY)*
- [x] **`applied_log` list** `db/postgres.py` — built only to print one debug line in `search_rrf`. Dropped the decl, 3 appends, and the print. *(−4)*
- [x] **Stripe `StripeError`→502 duplication** `api.py` — identical block in `checkout` + `billing_portal`. Extracted one `_stripe_url(fn, *args)` helper. *(−3)*
- [x] **`_PLACEHOLDER_JWT_SECRET`** `auth/auth.py` — inlined `JWT_SECRET == "change-me-in-production"` into the guard (literal matches the `os.environ.get` default). *(−3)*
- [ ] ~~`check_search_limit`~~ **SKIP** — keep for the 429 gate (Phase 2 C2).

## Tier 4 — dead imports (~11)

- [x] `import time` (`ai/embedder.py`) and `from typing import Optional` (`ai/ranker.py`) — both unused. *(−2)*
- [x] `import logging` + `import random` (`indexer.py`) — unused. *(−2)*
- [x] `interstitial_seconds` ctor param (`indexer.py`) — removed the param; hard-coded `self.interstitial_seconds = 15` (kept as a single source of truth rather than inlining `15` across the 3 read sites). *(−1)*
- [x] `engine`, `text` (`api.py`) — unused; leftover from a removed raw-SQL path. Dropped `, engine` and deleted the `from sqlalchemy import text` line. *(−2)*
- [x] `ensure_vector_index` import (`api.py`) — done as part of the lifespan cut in Tier 3. *(−1)*
- [x] `import random` (`scrapers/ffn.py`) — unused. *(−1)*
- [x] `import random` (`scrapers/wattpad.py`) — unused. *(−1)*
- [x] function-local `import boto3` (`auth/stripe_handler.py`, in `_downgrade_by_customer_id`) — unused. *(−1)*

---

### Verify when done
```powershell
cd D:\Fanfiction-Finder\backend
python -m pytest
```
All tests must pass — the cuts are zero-behavior-change by construction.
