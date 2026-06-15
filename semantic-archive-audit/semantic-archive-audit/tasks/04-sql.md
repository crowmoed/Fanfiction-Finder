# TASK 04 — Data Layer & SQL Injection (audit → fix → verify, one run)
Work ONLY within scope. Leave changes staged, do not commit. Do NOT change
query semantics or retrieval behavior — only how values reach the query.

<scope>
postgres.py (both search functions), schema.py, swap_tool.py, any module
issuing raw SQL / text() / .execute(). Pin paths: [fill in]
</scope>

## Step 1 — AUDIT (read-only)
1. Grep for f-strings / .format() / concatenation building SQL, incl. the CTE
   construction (prior C2 flag — confirm/locate).
2. Each raw query: user values passed as bound params (:param) or interpolated?
3. Dynamic identifiers (table/column, ORDER BY, strict-mode WHERE: min/
   max_word_count, excluded_tags) — allow-listed, or built from user input?
4. pgvector similarity queries — any user-controlled fragment interpolated?
Write to `findings/SQL-findings.md`: every raw-SQL site SAFE/UNSAFE, IDs
SQL-1..n; C2 explicitly located.

## Step 2 — FIX (all UNSAFE sites)
- Convert interpolated user values to bound parameters.
- Validate dynamic identifiers/ORDER BY against a hard-coded allow-list.
- Preserve exact query behavior — same results for the same inputs. This is a
  safety refactor of value-passing only, not a logic change.
- If a construction can't be parameterized without changing behavior and the
  safe rewrite is non-obvious → mark `NEEDS-DECISION`, don't guess.
- Update findings file: each SQL-# → FIXED / SKIPPED-NEEDS-DECISION.

## Step 3 — VERIFY
Confirm no user value is interpolated and every dynamic identifier is allow-
listed. Sanity-check that a normal search query still builds the same SQL.

## Step 4 — REPORT
Files changed, per-ID status, staged diff. Do not commit.
