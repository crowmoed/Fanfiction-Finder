# SQL Findings & Fix Log
Run: 2026-06-13 · Task: tasks/04-sql.md

**Verdict: no UNSAFE sites found. No fixes required — this domain is a confirm-clean pass.**
Every raw-SQL site builds SQL *structure* only from server-controlled constants and
binds every user/data value as a parameter. The prior "C2" flag (the `search_rrf` CTE
construction) is located and confirmed SAFE.

| ID | file:line | SAFE/UNSAFE | Why | Status |
|----|-----------|-------------|-----|--------|
| SQL-1 (C2) | backend/db/postgres.py:344-389 `search_rrf` CTE/UNION/SELECT build | **SAFE** | CTE names `r_{e_idx}_{platform}` are built from a loop int + the hardcoded `PLATFORMS=("ao3","ffn","wattpad")` tuple (not user input). Every value — embeddings (`:emb{i}`), `platform` (`:plat_*`), `fandom` (`:fandom`), `per_limit`, `total_limit`, and all filters — is a **bound param**. `RRF_K` is a module int constant. | NO-FIX (SAFE) |
| SQL-2 | backend/db/postgres.py:316-341 filter/fandom clause build | **SAFE** | `fandom_clause` and each `filter_clause` are static literal strings; user values bound via `:fandom`, `:min_word_count`, `:max_word_count`, `:excluded_tags`. Filter dict keys read are hardcoded literals, so unknown/user keys can't inject clauses. | NO-FIX (SAFE) |
| SQL-3 | backend/db/postgres.py:354,360 pgvector `<=>` ORDER BY | **SAFE** | Similarity ordering uses `CAST(:emb{i} AS vector)` — the embedding is a bound param; no user-controlled fragment interpolated into the vector op or ORDER BY. | NO-FIX (SAFE) |
| SQL-4 | backend/db/postgres.py:92 `ALTER TABLE ... vector({EMBEDDING_DIMS})` | **SAFE** | DDL type modifier from the module constant `EMBEDDING_DIMS=768` (int, not user input). Type modifiers can't be bound params; value is not user-controlled. Admin migration path. | NO-FIX (SAFE) |
| SQL-5 | backend/db/postgres.py — `search_similar`, `get_fic_count`, `get_indexed_fandoms`, `get_admin_stats`, `clear_fandom`, `upsert_fic` | **SAFE** | Use the SQLAlchemy ORM query builder (`.filter(FicRecord.fandom == fandom)` etc.) — fully parameterized; no raw text(). | NO-FIX (SAFE) |
| SQL-6 | fanfic-devtool/swap_tool.py:443-471, 605-637 bulk INSERT | **SAFE** | VALUES placeholders are built via f-strings of **param names** (`:b{j}_id`, `:b{j}_emb`, …) where `j` is a loop int; every row value is bound in `params`. DDL (`CREATE TABLE`, `TRUNCATE`, `DROP INDEX`, `CREATE INDEX`) is static. Inputs are local parquet/npy files, not request data. | NO-FIX (SAFE) |
| SQL-7 | fanfic-devtool/swap_tool.py:119,143,261 export/preview SELECTs | **SAFE** | Fandom value bound via `:f`; the rest is static SQL. | NO-FIX (SAFE) |

## Dynamic-identifier / ORDER BY / strict-mode review (audit step 3)
- **Dynamic identifiers:** the only "dynamic" identifiers are CTE names and the platform
  loop, both derived from server-side constants (`PLATFORMS`, loop indices) — effectively
  an implicit allow-list. No table/column/ORDER BY identifier is built from user input.
- **strict-mode WHERE (min/max_word_count, excluded_tags):** values arrive from the
  enhancer (`filters` dict, set by the API layer) and are **bound params** in static
  clauses. Keys are matched against hardcoded literals. Safe even if the enhancer (an LLM)
  emits adversarial content — it can only populate *values*, which are bound (cross-ref
  LLM-4/LLM-5: LLM output is never used to build SQL strings).
- **pgvector similarity:** no user-controlled fragment interpolated (SQL-3).

## Observed but OUT OF SCOPE (task-04 scope = postgres.py, schema.py, swap_tool.py)
- `backend/migrate_to_neon.py:63` interpolates `'{embedding_str}'::vector` via f-string.
  `embedding_str` is a pgvector text value read from the **source** DB (`row[10]`), not
  user/request input, and this is a one-shot migration utility outside the task scope.
  Low risk, but worth parameterizing later for hygiene (note for the human).

## NEEDS-DECISION
- None. No safe-rewrite ambiguity arose because nothing needed rewriting.
