# Per-fic metadata (`meta`) — how the wiring works

Adds a rich, platform-specific metadata blob to every fic (author, native stats,
full tag taxonomy, dates, …) so search results and detail views can show *much* more
than the old `title / kudos / hits / tags`. Built 2026-06-23.

> **Heads-up on stale docs:** the cloud DB is **on AWS now, not Neon** — older
> comments/README/ARCHITECTURE that say "Neon" are out of date. Everything here is
> plain Postgres (connection via `DATABASE_URL` through `config.py`); `JSONB` +
> pgvector behave the same on AWS RDS/Aurora.

---

## 1. The data model — `data/schema.py`

`Fic` gained one field:

```python
Fic.meta: Optional[FicMeta]
```

`FicMeta` is a **discriminated union** keyed by `type` (== the fic's `platform`). The
frontend switches on `meta.type` to parse. Every field is Optional, so a partially
scraped or legacy (`NULL`) blob is always valid.

| `type` | model | fields |
|---|---|---|
| `"ao3"` | `AO3Meta` | author, rating, categories[], warnings[], fandoms[], relationships[], characters[], freeforms[], language, chapters `"5/12"`, complete, kudos, hits, bookmarks, comments, published, updated, series[], collections[] |
| `"ffn"` | `FFNMeta` | author, rating, genres[], characters[], language, chapters, complete, favs, follows, reviews, updated, published |
| `"wattpad"` | `WattpadMeta` | author, author_username, author_followers, mature, complete, parts, votes, reads, comments, cover, language, published, updated |

> The field is named **`meta`**, not `metadata` — `metadata` collides with
> SQLAlchemy's reserved declarative attribute.

---

## 2. Where `meta` is produced — `scrapers/`

Two extraction contexts, because the individual fic page is far richer than the
search-result blurb:

**Index-time (search/list pages — runs inside the indexer):**
- `ao3.parse_results` — classifies the blurb's lumped tags into
  `relationships`/`characters`/`freeforms` by their `<li>` class + grabs `fandoms`.
  Blurbs **truncate**, so AO3's lists are partial here (the backfill completes them).
- `ffn.parse_results` — captures the full FFN field set (the z-list row already has
  everything: rating, genres, characters, chapters, reviews, favs, follows, dates…).
  It used to parse-then-`continue` past most of these.
- `wattpad.parse_story` — the v4 search `FIELDS` now also requests `cover`,
  `language(name)`, `user(username,numFollowers)`, `firstPublishedPart` (published),
  and `parse_story` captures them. The API always had this; we were dropping it.

**Backfill (individual fic page — max data):**
- `ao3.parse_work_page(html)` — parses a full `/works/ID` page: the COMPLETE,
  separated tag taxonomy + series + collections + published date. **AO3 is the only
  platform where per-fic page-scraping unlocks new fields.**
- FFN/Wattpad have no per-page win → the backfill reuses their search parsers.

All new extraction is **defensive**: a missed/changed selector degrades to
`None`/`[]`, never a crash.

---

## 3. How `meta` reaches the cloud DB — `db/postgres.py`

- `FicRecord.meta = Column(JSONB)` — one JSONB column.
- `upsert_fic()` writes `fic.meta.model_dump(mode="json")` (used by the indexer's
  Neon/AWS fallback path).
- `search_rrf()` SELECTs `f.meta` and reconstructs `Fic(meta=<dict>)` — Pydantic's
  discriminator picks the right platform model from the plain dict.
- **Migration:** `python db/postgres.py add-meta` — idempotent
  `ALTER TABLE fics ADD COLUMN meta JSONB`. Non-destructive: existing rows get
  `NULL`, no embedding rebuild.
- `get_fics_needing_meta` / `update_fic_meta` — cloud-side `WHERE meta IS NULL` query +
  single-row meta update. **Not used by the backfill** (which is local-driven via the
  `*_local` helpers below); kept as generic helpers for direct-AWS diagnostics.

`api.py` needs **no change** — `/search` is `response_model=list[Fic]`, so `meta`
flows out automatically.

### Local store + devtool (the full persistence flow)

Indexing writes **local parquet first**; the cloud DB is populated from local via the
`fanfic-devtool`. `meta` rides as a **JSON string** in parquet ↔ **JSONB** in Postgres,
wired end-to-end so it can't be dropped (or silently wiped on a re-push):

```
indexer ──► db/local_storage._row_from_fic  (parquet "meta" column, JSON string)
                       │
                       ▼  fanfic-devtool/swap_tool.py
   push / push-combined  ──► INSERT … meta  (CAST(:meta AS jsonb));  push-combined
                              also CREATEs the table with a `meta JSONB` column
   pull                  ◄── SELECT … meta::text  (cloud → local round-trip)

backfill_meta.py ──► reads the LOCAL work-list (get_local_fics_needing_meta) and writes
                     LOCAL only (update_meta_local → canonical parquet). The local
                     store is the source; `swap_tool push` then publishes to AWS.
```

`compact()` already uses `pl.concat(how="diagonal_relaxed")`, so new parts with a
`meta` column merge cleanly with old metaless ones (missing → null). The backfill is
**local-only** (the corpus is built locally and pushed out, so enriching AWS directly
is pointless — the next push overwrites it). `push` is a full rebuild from local, so it
carries meta out — but the AWS `fics` table must already have a `meta` column
(`python db/postgres.py add-meta`, or drop the table so `push-combined` recreates it).

---

## 4. The backfill tool — `backfill_meta.py`

Enriches fics in the **local store** (`meta` null) **without re-embedding or
re-indexing**; a later `swap_tool push` publishes them to AWS. Differentiated per platform:

| Platform | Method | Cost |
|---|---|---|
| **AO3** | fetch each work page (real Chrome) → `parse_work_page` → update | slow: 1 page/fic |
| **FFN** | re-run per-fandom **search** (real Chrome) → match by URL → update | ~20 fics/page |
| **Wattpad** | re-run per-fandom **search** (HTTP) → match by URL → update | fast |

- Runs on the **host with real Chrome** (like `indexer.py`), **not** Docker.
- **Resumable** — enriched rows drop out of the next run's work-list.
- AO3 + FFN share one browser session (re-opening re-triggers the interstitial).

```powershell
cd D:\Fanfiction-Finder\backend
python backfill_meta.py                          # everything with NULL meta
python backfill_meta.py --platform ao3           # one platform
python backfill_meta.py --fandom "Naruto"
python backfill_meta.py --platform ao3 --limit 5 # VALIDATE on a few first
```

---

## 5. Frontend contract

`/search` returns `Fic[]` with an optional `meta`. The proxy is a passthrough, so it
arrives untouched. Consume it by narrowing on `meta.type`:

```ts
type FicMeta =
  | { type: "ao3";     author?: string; rating?: string; relationships?: string[]; /* … */ }
  | { type: "ffn";     author?: string; favs?: number; follows?: number; reviews?: number; /* … */ }
  | { type: "wattpad"; author?: string; votes?: number; reads?: number; parts?: number; /* … */ };

// fic.meta?.type === fic.platform  // the discriminator mirrors `platform`
```

---

## 6. Status & TODO

**Done + tested (6 tests in `tests/test_metadata.py`, suite green):** schema · all 3
index-time scrapers · AO3 work-page parser · JSONB column + upsert + `search_rrf` +
`add-meta` migration · `get_fics_needing_meta` / `update_fic_meta` · `backfill_meta.py`.

**Now done (the local-store + devtool wiring):**
- ✅ Index-time `meta` → local parquet (`_row_from_fic`).
- ✅ Backfill syncs local too (`update_meta_local`) — local ↔ cloud stay matched.
- ✅ Devtool `pull` / `push` / `push-combined` all carry `meta` (incl. the
  `CREATE TABLE`), so the local→cloud bridge no longer drops it.

**Open:**
- ⚠ **Validate AO3 & FFN selectors against live HTML.** The research fetches were
  bot-blocked, so those selectors are best-effort from documented structure. Run
  `backfill_meta.py --platform ao3 --limit 5`, inspect the rows, then go full.
- ⚠ **Local-store change not run-verified here.** My env has no `polars`, so I couldn't
  execute the `update_meta_local` parquet round-trip — only the syntax (compiles) and
  the `meta` serialization (unit-tested). Confirm on your machine (a `--limit` backfill
  on an already-compacted fandom will exercise it).
- **Frontend rendering** — only the contract/type above is specified; no components
  built (locked design surface).
- **AWS, not Neon** — sweep stale "Neon" references in docs/comments when convenient
  (e.g. `swap_tool.py` prints "Pushed … to Neon").
