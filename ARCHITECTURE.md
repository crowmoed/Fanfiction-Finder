# FicFinder — System Architecture

> Last updated: April 2026. Use this document as context when prompting AI assistants about the codebase.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Directory Structure](#2-directory-structure)
3. [Infrastructure](#3-infrastructure)
4. [Database](#4-database)
5. [Search Pipeline](#5-search-pipeline)
6. [Query Enhancer](#6-query-enhancer)
7. [Embedder](#7-embedder)
8. [Ranker](#8-ranker)
9. [Indexer & Scrapers](#9-indexer--scrapers)
10. [Frontend](#10-frontend)
11. [Auth (Planned)](#11-auth-planned)
12. [Environment Variables](#12-environment-variables)
13. [Dependencies](#13-dependencies)
14. [Known Issues & Gotchas](#14-known-issues--gotchas)
15. [Key Technical Decisions](#15-key-technical-decisions)
16. [Recent Changes Log](#16-recent-changes-log)

---

## 1. Project Overview

FicFinder is a semantic search engine for fanfiction. Users submit natural language queries ("Drarry slow burn enemies to lovers no MCD") and get ranked results from three platforms:

- **AO3** — Archive of Our Own (`archiveofourown.org`)
- **FFN** — FanFiction.net (`fanfiction.net`)
- **Wattpad** — Wattpad (`wattpad.com`)

### Index-then-search architecture

FicFinder does **not** scrape at query time. The flow is:

1. **Offline indexing** — `indexer.py` scrapes both platforms, generates embeddings via Gemini, and stores fics + embeddings in a Neon PostgreSQL database with pgvector.
2. **Online search** — At query time, the API enhances the query via Claude Haiku (Bedrock), embeds the result, blends it with a raw query embedding, and runs cosine similarity search against the pre-indexed corpus. An LLM ranker re-scores the top candidates.

This means search is fast (sub-second vector lookup) but the corpus is a snapshot, not real-time.

### Supported platforms

| Platform | How scraped | Sorted by |
|---|---|---|
| AO3 | SeleniumBase UC mode, BeautifulSoup | kudos |
| FFN | SeleniumBase UC mode, BeautifulSoup | favorites (stored as `kudos`) |
| Wattpad | Pure HTTP requests (v4 internal API) | vote/read ratio (quality filter) |

---

## 2. Directory Structure

```
FicFinder/
├── backend/                    Python FastAPI backend
│   ├── api.py                  FastAPI app, all HTTP endpoints, search orchestration
│   ├── indexer.py              CLI scraper+embedder that populates the DB
│   ├── docker-compose.yml      Local dev: runs init_db then uvicorn
│   ├── Dockerfile              python:3.12-slim, EXPOSE 8000, uvicorn entrypoint
│   ├── requirements.txt        Python dependencies (UTF-16 encoded — see §14)
│   ├── cleanup.py              Runs VACUUM FULL ANALYZE on the DB
│   ├── migrate_to_neon.py      One-time migration script: RDS → Neon (batched, 500/batch)
│   ├── check_embeddings.py     Debug: prints embedding dimension and fic counts per fandom
│   ├── ai/
│   │   ├── query_enhancer.py   HyDE expansion via Claude Haiku 4.5 on AWS Bedrock
│   │   ├── embedder.py         Gemini gemini-embedding-001, 768 dims, L2-normalized
│   │   └── ranker.py           Gemini 2.5 Flash re-ranks top-50 candidates 0-100
│   ├── db/
│   │   └── postgres.py         SQLAlchemy ORM, FicRecord model, all DB functions
│   ├── scrapers/
│   │   ├── ao3.py              AO3 URL builder + BeautifulSoup parser
│   │   └── ffn.py              FFN URL builder + BeautifulSoup parser
│   ├── data/
│   │   ├── schema.py           Pydantic Fic model (shared by scrapers, DB, API)
│   │   └── fandoms.py          FANDOMS dict: display name → {ao3 tag, ffn slug}
│   └── auth/
│       └── auth.py             Empty placeholder for future JWT auth
├── frontend/                   Next.js 16 frontend (TypeScript, Tailwind)
│   ├── app/
│   │   ├── layout.tsx          Root layout, Google Fonts, metadata
│   │   ├── page.tsx            Main search page (empty/loading/results states)
│   │   ├── globals.css         CSS variables (light theme), Tailwind directives
│   │   └── api/
│   │       ├── search/route.ts     POST — SSE stream, proxies to Python backend
│   │       ├── fandoms/route.ts    GET — proxies /fandoms from Python backend
│   │       └── admin/stats/route.ts GET — proxies /admin/stats from Python backend
│   │   └── ops/page.tsx        Internal ops dashboard (not linked from main app)
│   ├── components/
│   │   ├── SearchBar.tsx       Query input, fandom dropdown, typewriter placeholder
│   │   ├── ResultsTable.tsx    Virtual-scrolled table, sortable/filterable
│   │   ├── TableToolbar.tsx    Filter controls for the results table
│   │   ├── ResultsCard.tsx     Mobile card view for individual results
│   │   ├── StatusIndicator.tsx Pipeline progress bar with step statuses
│   │   ├── QuickFilters.tsx    Predefined filter chips appended to query
│   │   ├── SearchHistory.tsx   Recent searches from IndexedDB
│   │   ├── ExportButton.tsx    XLSX/CSV export via xlsx library
│   │   ├── PlatformBadge.tsx   "AO3" / "FFN" colored badge
│   │   ├── RatingBadge.tsx     "G" / "T" / "M" / "E" badge
│   │   ├── ScoreBar.tsx        Visual 0-100 match score bar
│   │   ├── TagList.tsx         Tag list with truncation
│   │   └── Toast.tsx           Notification component
│   ├── hooks/
│   │   ├── useSearch.ts        SSE streaming, pipeline state, AbortController
│   │   ├── useSearchHistory.ts IndexedDB read/write/cache (Dexie)
│   │   └── useMediaQuery.ts    Mobile detection (max-width: 768px)
│   ├── lib/
│   │   ├── schema/types.ts     All TypeScript interfaces (FicResult, PipelineStep, etc.)
│   │   ├── utils/export.ts     exportResults() → XLSX/CSV
│   │   ├── utils/format.ts     formatWordCount, formatRelativeTime, formatElapsed, etc.
│   │   └── storage/db.ts       Dexie DB singleton, searchHistory table
│   ├── package.json
│   ├── tailwind.config.ts      Custom color palette via CSS variables
│   └── tsconfig.json           Strict mode, bundler module resolution, @/* alias
└── ARCHITECTURE.md             This file
```

---

## 3. Infrastructure

### Components and where they run

| Component | Service | Region | Notes |
|---|---|---|---|
| Backend API | AWS App Runner | us-east-1 | Auto-deploys from ECR image |
| Container registry | AWS ECR | us-east-1 | Image: `ficfinder-backend` |
| Database | Neon PostgreSQL | us-east-1 (AWS) | Managed, serverless, auto-scales |
| Frontend | Vercel | Global CDN | Auto-deploys on `git push` to `main` |
| Query enhancement | AWS Bedrock | us-east-1 | Claude Haiku 4.5, IAM role auth |
| Embeddings | Google Gemini API | Google Cloud | `gemini-embedding-001`, API key auth |
| LLM ranking | Google Gemini API | Google Cloud | `gemini-2.5-flash`, API key auth |

### IAM / credentials

- **Bedrock** — No hardcoded credentials. The App Runner task role grants `bedrock:InvokeModel` on the Haiku model. `boto3` picks up credentials automatically from the instance metadata endpoint. No `AWS_ACCESS_KEY_ID` needed in environment.
- **Gemini** — API key in `GEMINI_API_KEY` environment variable.
- **Neon** — Connection string in `DATABASE_URL` environment variable (use pooler URL — see §14).

### Deploy process (manual)

There is no CI/CD pipeline. Deploy is manual:

```bash
# 1. Build the image
docker build -t ficfinder-backend ./backend

# 2. Tag for ECR
docker tag ficfinder-backend:latest \
  <account_id>.dkr.ecr.us-east-1.amazonaws.com/ficfinder-backend:latest

# 3. Authenticate to ECR
aws ecr get-login-password --region us-east-1 \
  | docker login --username AWS --password-stdin \
    <account_id>.dkr.ecr.us-east-1.amazonaws.com

# 4. Push
docker push <account_id>.dkr.ecr.us-east-1.amazonaws.com/ficfinder-backend:latest

# 5. Trigger App Runner redeployment (via console or CLI)
```

Vercel picks up frontend changes automatically on push to `main`.

---

## 4. Database

### Connection

- **Provider**: Neon (`neon.tech`)
- **Host pattern**: `ep-<endpoint-name>-pooler.us-east-1.aws.neon.tech`
- **Database**: `neondb`
- **User**: `neondb_owner`
- **SSL**: required (`?sslmode=require`)
- **Always use the pooler URL** (contains `-pooler` in the hostname). The direct connection URL hits Neon's concurrent connection limit quickly. The pooler handles multiplexing.

Connection string pattern:
```
postgresql://neondb_owner:<password>@ep-<name>-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require
```

### SQLAlchemy pool settings

```python
pool_pre_ping=True    # test connection liveness before use
pool_recycle=300      # recycle connections every 5 minutes
pool_size=5
max_overflow=2
```

`pool_pre_ping` is critical — Neon suspends idle compute and drops connections silently. Without it, the first request after idle period fails with a stale-connection error.

### Schema

Single table: `fics`

| Column | Type | Notes |
|---|---|---|
| `id` | TEXT (PK) | `{platform}:{url}` — e.g. `ao3:https://archiveofourown.org/works/12345` |
| `title` | TEXT NOT NULL | |
| `url` | TEXT NOT NULL | Full URL to the fic |
| `platform` | TEXT NOT NULL | `"ao3"` or `"ffn"` |
| `summary` | TEXT | Plot summary scraped from the platform |
| `tags` | TEXT | Comma-separated tag string (e.g. `"Hurt/Comfort, Slow Burn"`) |
| `word_count` | INTEGER | |
| `kudos` | INTEGER | AO3 kudos or FFN favorites |
| `hits` | INTEGER | AO3 hits; NULL for FFN |
| `fandom` | TEXT | Display name matching a key in `FANDOMS` dict |
| `embedding` | vector(768) | pgvector column — Gemini 768-dim L2-normalized embedding |
| `indexed_at` | TIMESTAMPTZ | Set to `NOW()` on each upsert |

### pgvector setup

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

Run automatically by `init_db()`. The `embedding` column is declared as `Vector(768)` via `pgvector.sqlalchemy`.

Similarity search uses **cosine distance**:
```python
.order_by(FicRecord.embedding.cosine_distance(query_embedding))
```

### Embedding dimensions

Currently **768 dims** (`gemini-embedding-001` Matryoshka truncation). Previously 3072. `migrate_embedding_dimensions()` handles transitions — it drops and recreates the embedding column, which **nulls all existing embeddings** and requires a full re-index.

### Corpus stats (approximate)

| Fandom | ~Count |
|---|---|
| Naruto | ~34,000 |
| Others | varies |

Word count floor: **20,000 words** (`MIN_WORDS = 20000` in `indexer.py`).

---

## 5. Search Pipeline

```
User query: "Drarry angst slow burn no MCD"
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│ Step 1 — Query Enhancement                              │
│ enhance_query(q, fandom)                                │
│ → Claude Haiku 4.5 on Bedrock (IAM role, us-east-1)    │
│ → EnrichedQuery.semantic_descriptions (3 HyDE summaries)│
│   + structured fields (tags, ships, excluded, etc.)    │
└──────────────────────────┬──────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│ Step 2 — Raw Query Embedding (once, shared)             │
│ embed_query(raw_query) → raw_embedding                  │
│ gemini-embedding-001, RETRIEVAL_QUERY, 768 dims         │
└──────────────────────────┬──────────────────────────────┘
                           │
         ┌─────────────────┴──────────────────┐
         │  4 parallel searches (3 normal case)│
         └─────────────────┬──────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│ Step 3 — Multi-Angle HyDE Searches (×3) + Pure Raw      │
│                                                         │
│ Search 1: embed(desc[0]) → blend 0.8×hyde + 0.2×raw    │
│           L2 renormalize → search_similar(limit=50)     │
│                                                         │
│ Search 2: embed(desc[1]) → blend 0.7×hyde + 0.3×raw    │
│           L2 renormalize → search_similar(limit=50)     │
│                                                         │
│ Search 3: embed(desc[2]) → blend 0.5×hyde + 0.5×raw    │
│           L2 renormalize → search_similar(limit=50)     │
│                                                         │
│ Search 4: raw_embedding (no blend) →                    │
│           search_similar(limit=50)                      │
│                                                         │
│ → up to 200 raw results total                           │
└──────────────────────────┬──────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│ Step 4 — Merge & Deduplicate                            │
│ Deduplicate by fic_id (platform:url)                    │
│ Keep highest similarity (lowest position) per fic       │
│ Sort by best position, cap at 100 unique candidates     │
└──────────────────────────┬──────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│ Step 5 — LLM Ranker                                     │
│ rank(candidates, original_raw_query)                    │
│ → Bedrock Haiku scores each fic 0-100                   │
│ → Sorted by match_score descending                      │
│ → Ranker receives raw query, NOT HyDE descriptions      │
│ → Fics omitted by LLM get match_score = None            │
│ → Fallback: sort by kudos                               │
└──────────────────────────┬──────────────────────────────┘
                           │
                           ▼
                  Return ranked[:limit] as JSON
```

**Code path**: `api.py:/search` → `enhance_query()` → `embed_query()` (raw, once) → 3 blended searches at varying ratios + 1 pure raw search → merge/dedup → `rank()` → response.

**Blend ratios**: Each HyDE description uses a different ratio to balance expansion quality vs. query fidelity: desc[0] uses 0.8/0.2 (trusts HyDE most), desc[1] uses 0.7/0.3 (balanced), desc[2] uses 0.5/0.5 (equal weight). The pure raw search acts as an anchor, ensuring the result set always includes high-similarity fics even if all three HyDE expansions drift.

**Fallback behavior**: If `enhance_query()` fails, `semantic_descriptions` is a single-item list containing the raw query. In this case only 2 searches run: the single description blended at 0.7/0.3 and the pure raw search. The other two blended searches are skipped.

The frontend calls `/search` via the Next.js proxy route (`/api/search/route.ts`) which wraps the response in an SSE stream and emits per-stage status events for the UI pipeline indicator.

---

## 6. Query Enhancer

**File**: `backend/ai/query_enhancer.py`

### Model

- **Service**: AWS Bedrock (`bedrock-runtime`, region `us-east-1`)
- **Model ID**: `us.anthropic.claude-haiku-4-5-20251001-v1:0`
- **Auth**: IAM instance role — no hardcoded credentials, no `AWS_ACCESS_KEY_ID`
- **Temperature**: `0.1`
- **Max tokens**: `1024`

### API call format

```python
payload = {
    "anthropic_version": "bedrock-2023-05-31",
    "max_tokens": 1024,
    "temperature": 0.1,
    "system": SYSTEM_PROMPT,
    "messages": [{"role": "user", "content": f'Enhance this fanfiction search query: "{query_text}"'}],
}
bedrock.invoke_model(
    modelId="us.anthropic.claude-haiku-4-5-20251001-v1:0",
    body=json.dumps(payload),
    contentType="application/json",
    accept="application/json",
)
# Parse: json.loads(response["body"].read())["content"][0]["text"]
```

### EnrichedQuery schema (Pydantic)

```python
class EnrichedQuery(BaseModel):
    semantic_descriptions: list[str]  # 3 hypothetical fic summaries at different angles (HyDE-style)
    ao3_tags: list[str]              # Canonical AO3 freeform tag suggestions
    ao3_filters: dict                # rating, warnings, category, completion_status, min/max word_count
    ffn_keywords: list[str]          # FFN-compatible keyword search terms
    ffn_filters: dict                # rating, genre, status, min/max words
    detected_fandoms: list[str]      # Extracted fandom references
    detected_ships: list[str]        # "/" for romantic, "&" for platonic — canonical AO3 format
    detected_characters: list[str]   # Individual characters mentioned
    excluded_tags: list[str]         # Things to avoid ("Major Character Death", "Non-Consensual")
```

Only `semantic_descriptions` is consumed by the current search pipeline (one vector search per description). The structured fields (`ao3_tags`, `ao3_filters`, `detected_ships`, etc.) are logged but not yet used for filtering.

### System prompt approach

The system prompt instructs Claude to:
- Generate **3 different hypothetical fic summaries** (each 2-4 sentences), each targeting a **different sub-audience**:
  - Description 1: primary/obvious interpretation of the query
  - Description 2: unusual or niche angle
  - Description 3: emphasis on emotional tone or atmosphere rather than plot
- Expand portmanteau ship names: `"Drarry"` → `"Draco Malfoy/Harry Potter"`, `"Destiel"` → `"Dean Winchester/Castiel"`
- Map informal tropes to canonical AO3 tags: `"coffee shop AU"` → `"Alternate Universe - Coffee Shops & Cafés"`, `"5+1"` → `"5+1 Things"`
- Include adjacent/co-occurring tropes: `"enemies to lovers"` implies `"Slow Burn"`, `"Mutual Pining"`
- Interpret exclusions: `"no MCD"` → `excluded_tags: ["Major Character Death"]`
- Respond **only** with the JSON object — no markdown, no backticks, no preamble

The diversity constraint (different sub-audiences) is enforced via the `MUST` instruction in the system prompt. This ensures the three HyDE embeddings cover meaningfully different regions of the vector space, complementing the varying blend ratios in Step 3 of the search pipeline.

The prompt ends with: `"Respond ONLY with the JSON object. No markdown, no backticks, no preamble."` — this is what makes clean JSON parsing reliable without schema enforcement.

Two few-shot examples are baked into the system prompt: `"hurt/comfort enemies to lovers"` and `"long completed Drarry slow burn explicit"`, each showing 3 descriptions as a JSON array.

`max_tokens` is set to `2048` (up from `1024`) to accommodate the three descriptions.

### Fandom context injection

If `fandom` is passed (always true in normal search flow):
```python
query_text = f"[Fandom: {fandom}] {user_query}"
```

### Fallback behavior

On any exception (network error, malformed JSON, Bedrock throttle), returns a minimal `EnrichedQuery` with `semantic_descriptions = [user_query]` (single-item list) and all other fields empty. The search pipeline handles this gracefully — the loop runs once with the raw query as the HyDE text.

---

## 7. Embedder

**File**: `backend/ai/embedder.py`

### Model

- **Model**: `gemini-embedding-001`
- **Dimensions**: `768` (Matryoshka truncation via `output_dimensionality=768`)
- **Client**: `google.genai.Client(api_key=GEMINI_API_KEY)`
- **Post-processing**: L2-normalized after every call (Gemini does NOT pre-normalize at sub-max dims)

### Task type asymmetry

| Use case | Task type | Notes |
|---|---|---|
| Indexing fics | `RETRIEVAL_DOCUMENT` | Optimized for document representation |
| Search queries | `RETRIEVAL_QUERY` | Optimized for query-to-document matching |

This asymmetry is intentional and critical — using the wrong task type for queries degrades retrieval quality.

### Text format for fics

```
Tags: Hurt/Comfort, Slow Burn, Enemies to Lovers
Fandom: Harry Potter
Summary: <full summary text>
```

Tags go first because transformers give disproportionate attention to early tokens, and Gemini truncates at ~2048 tokens. Tags are the primary matching signal.

### Title parameter

For single-fic embedding (`embed_fic()`), title is passed as a dedicated API parameter:
```python
config=types.EmbedContentConfig(
    task_type="RETRIEVAL_DOCUMENT",
    output_dimensionality=768,
    title=title,   # structured signal, not concatenated into text
)
```

For batch embedding (`embed_fics_batch()`), the batch API does not support per-item title params, so title is prepended as `"Title: {fic.title}\n"` into the content string.

### Batch embedding

`embed_fics_batch(fics, batch_size=25)` — sends up to 25 fics per Gemini API call with a 1-second sleep between batches. Used exclusively by the indexer; search uses `embed_query()` (single call).

### L2 normalization

```python
def _normalize(vector):
    arr = np.array(vector, dtype=np.float64)
    norm = np.linalg.norm(arr)
    return (arr / norm).tolist()
```

Applied to every embedding before storage and before search. Required for cosine similarity to be well-behaved.

---

## 8. Ranker

**File**: `backend/ai/ranker.py`

### Model

- **Model**: `us.anthropic.claude-haiku-4-5-20251001-v1:0`
- **Client**: `boto3.client("bedrock-runtime", region_name="us-east-1")` (IAM role auth, no API key)

### What it does

Takes up to 100 vector search candidates (merged and deduplicated from 4 searches) and asks Claude Haiku to score each 0-100 based on how well it matches the **original raw user query** (not the HyDE descriptions). Returns fics sorted by `match_score` descending.

Input to Claude per fic: `title`, `summary`, first 20 `tags`.

The prompt explicitly instructs absolute scoring (not spread scores artificially across the range), so most strong matches score 70-90, weak matches score low. Fics omitted from the LLM response (truncated output, etc.) receive `match_score = None` rather than `0` to avoid false-zero artifacts in sorting.

### Fallback

On any exception (malformed JSON, timeout, quota): sorts by `kudos` descending and returns without scores.

### Known issue

See §14 — the ranker can cause intermittent timeouts on the App Runner endpoint when the candidate set is large. When it fails, the fallback path returns results in vector similarity order (which is reasonable quality on its own).

---

## 9. Indexer & Scrapers

### Indexer CLI (`backend/indexer.py`)

```bash
python indexer.py                                # Index all 21 fandoms (AO3 + FFN + Wattpad)
python indexer.py "Naruto"                       # Index one fandom (AO3 + FFN + Wattpad)
python indexer.py "Naruto" --clear               # Clear fandom from DB first, then re-index
python indexer.py "Naruto" --start-page 664      # Resume AO3 from a specific page
python indexer.py "Naruto" --ffn-only            # FFN only for this fandom
python indexer.py "Naruto" --wattpad-only        # Wattpad only for this fandom
```

`index_all()` calls `migrate_embedding_dimensions()` first — handles the case where the DB was built with different dims.

### SeleniumBase setup

All scraping uses `SB(uc=True, headless=False)`:
- `uc=True` — UndetectedChromeDriver mode, bypasses bot detection on AO3 and FFN
- `headless=False` — Required; headless mode is more detectable
- A single SB session is shared across all fandoms in `index_all()` for efficiency

### AO3 scraper (`backend/scrapers/ao3.py`)

URL pattern:
```
https://archiveofourown.org/works?commit=Sort+and+Filter
  &work_search[sort_column]=kudos_count
  &work_search[words_from]=20000
  &page={page}
  &tag_id={encoded_fandom_tag}
```

**Critical URL encoding** (see §14 for gotchas):
- Fandom tag spaces → `+`
- `&` in fandom tag → `*a*` (NOT `%26` — AO3 rejects percent-encoded ampersands in tag IDs)
- The `commit` parameter value (`Sort and Filter`) must be `+`-encoded, not `%20`-encoded

CSS selectors:
- Work container: `li.work.blurb.group`
- Title/URL: `h4.heading a:first-child`
- Summary: `blockquote.summary`
- Tags: `ul.tags li`
- Stats (kudos, hits, words): `dl.stats` → `dd.kudos`, `dd.hits`, `dd.words`

Timing:
- First fandom, first page: 15s manual pause (click through age/bot interstitial)
- Subsequent fandoms, first page: 5s pause
- Between pages: 8s

### FFN scraper (`backend/scrapers/ffn.py`)

URL pattern:
```
https://www.fanfiction.net/{ffn_slug}/?srt=3&r=10&len={word_len}&p={page}
```

- `srt=3` — sort by favorites
- `r=10` — all ratings
- `len=10` — stories 40k-100k words
- `len=20` — stories 100k+ words

The indexer runs both `len=10` and `len=20` buckets per fandom to capture the full word-count range above the 20k floor.

CSS selectors:
- Story container: `div.z-list`
- Title/URL: `a.stitle`
- Summary: `div.z-padtop`
- Stats line: `div.z-padtop2` — parsed as dash-separated parts

FFN stores word count as `"Words: 123,456"` and favorites as `"Favs: 1,234"`. Both mapped to `word_count` and `kudos` in the `Fic` model.

Timing:
- First page of each fandom: 5-15s pause
- Between pages: random 5-10s

### Embed-during-scrape pattern

Embeddings are generated immediately after each page is scraped (before moving to the next page). This uses the rate-limit wait time productively — while the scraper waits for the next page, the embedder is calling Gemini.

### Wattpad scraper (`backend/scrapers/wattpad.py`)

Unlike AO3/FFN, Wattpad has no fandom taxonomy — scraping is **keyword-based** (search `"naruto"` instead of browsing a category). No Selenium required; uses pure HTTP requests against Wattpad's internal v4 JSON API.

**Endpoint:**
```
https://www.wattpad.com/v4/search/stories/?query={keyword}&limit=50&offset={offset}&fields=...
```

**Pagination:** offset/limit (50 results per page). Continues until `nextUrl` is absent or offset ≥ total.

**Two-phase quality filter:**

1. **Calibration** (first 10 pages sampled): computes vote/read ratio distribution across valid English, non-paywalled stories with ≥1,000 reads. Selects a percentile cutoff based on fandom size:

   | Fandom size | Percentile cutoff | Effect |
   |---|---|---|
   | < 5,000 stories | P40 | Keep top 60% |
   | 5,000–20,000 | P60 | Keep top 40% |
   | 20,000–50,000 | P75 | Keep top 25% |
   | 50,000+ | P85 | Keep top 15% |

2. **Scraping** (all pages): applies the calibrated min ratio to filter stories.

**Field mapping:**

| Wattpad field | Fic model field |
|---|---|
| `voteCount` | `kudos` |
| `readCount` | `hits` |
| `description` | `summary` |
| `tags` | `tags` |
| `word_count` | `None` (Wattpad `length` is character count, not reliable) |

**Rate limiting:** 1.5–3s random delay between pages (handled internally — no extra sleep needed in indexer).

**Fandom keywords** are stored in `FANDOMS[name]["wattpad"]` (e.g. `"naruto"`, `"bnha"`, `"genshin impact"`).

### Fandom config (`backend/data/fandoms.py`)

```python
FANDOMS = {
    "Harry Potter": {"ao3": "Harry Potter - J. K. Rowling", "ffn": "book/harry-potter", "wattpad": "harry potter"},
    "Naruto":       {"ao3": "Naruto (Anime & Manga)",       "ffn": "anime/naruto",       "wattpad": "naruto"},
    # ...
}
```

21 fandoms total across: Books (4), Anime (6), TV (4), Movies (2), Games (3), Cartoons (2), K-pop (1).

To add a new fandom: add an entry to `FANDOMS` (with `ao3`, `ffn`, and `wattpad` keys), then run `python indexer.py "New Fandom"`.

---

## 10. Frontend

**Framework**: Next.js 16.2.1, React 18.3.1, TypeScript 5.8.3, Tailwind CSS 3.4.17
**Hosting**: Vercel (auto-deploy on push to `main`)

### Key pages

| Route | File | Description |
|---|---|---|
| `/` | `app/page.tsx` | Main search page — empty/loading/results states |
| `/ops` | `app/ops/page.tsx` | Internal ops dashboard — not linked from main app |

### Next.js API routes (server-side proxies)

| Route | Method | Description |
|---|---|---|
| `/api/search` | POST | SSE stream — proxies to `BACKEND_URL/search`, emits pipeline status events |
| `/api/fandoms` | GET | Proxies `BACKEND_URL/fandoms`, returns fandom list with `collected` flag |
| `/api/admin/stats` | GET | Proxies `BACKEND_URL/admin/stats`, powers the ops dashboard |

The backend URL is never exposed to the browser — all calls go through these server-side routes.

### SSE event types (from `/api/search`)

```typescript
type SearchEvent =
  | { type: 'status'; step: 'tag-map'|'llm-parse'|'ao3-fetch'|'ffn-fetch'|'ranking'; status: 'active'|'complete'|'skipped'|'error' }
  | { type: 'results'; platform: 'ao3'|'ffn'; results: FicResult[] }
  | { type: 'ranked'; results: FicResult[] }
  | { type: 'done'; totalMs: number }
  | { type: 'error'; message: string }
```

Steps: `tag-map` (200ms delay, always completes), `llm-parse` (always skipped), `ao3-fetch` + `ffn-fetch` (active while backend call is in flight), `ranking` (300ms delay after backend returns).

### FicResult type

```typescript
interface FicResult {
  id: string;          // = url
  platform: 'ao3' | 'ffn';
  title: string;
  author: string;      // always "Unknown Author" — backend doesn't scrape author
  url: string;
  authorUrl: string;   // same as url
  rating: 'G'|'T'|'M'|'E';  // always "T" — backend doesn't scrape rating
  wordCount: number;
  chapters: string;    // always "?" — backend doesn't scrape chapters
  status: 'complete'|'in-progress';  // always "complete"
  tags: string[];
  summary: string;
  stats: { kudos?: number; hits?: number; };
  matchScore: number | null;
  updatedAt: string;   // set to current time — backend doesn't scrape date
}
```

Several fields (`author`, `rating`, `chapters`, `status`, `updatedAt`) are hardcoded defaults because the backend doesn't scrape them. This is visible in `app/api/search/route.ts:mapToFicResult()`.

### Search history & caching (IndexedDB)

`useSearchHistory` stores each completed search in IndexedDB via Dexie:
- Key: `(prompt, fandom)`
- TTL: 24 hours
- On cache hit: results displayed instantly, then a fresh search runs in background

IndexedDB is client-only — Dexie is lazily imported to avoid SSR errors.

### ResultsTable

Virtual scrolling via TanStack React Virtual — handles 1000s of results without DOM overload.
Filters: platform, status, rating, word count (7 tiers), kudos (4 tiers), tag.
Sort fields: match score, word count, title, updated date.

### Ops dashboard (`/ops`)

Internal-only page (not linked from the main app). Shows per-fandom indexing status, coverage bar charts, and auto-generated recommendations (`python indexer.py "Fandom"` commands). Fetches from `/api/admin/stats` which proxies to the backend.

---

## 11. Auth (Planned)

Not yet implemented. `backend/auth/auth.py` is an empty placeholder.

Planned design:
- **Provider**: AWS Cognito User Pool with Google as IdP
- **Flow**: Frontend redirects to Cognito hosted UI → Google OAuth → Cognito issues JWT → frontend stores in cookie/localStorage → sends as `Authorization: Bearer <token>` header
- **Backend verification**: FastAPI middleware validates Cognito JWT (signature + claims)
- **Users table** (planned schema):
  - `id` TEXT PK (Cognito `sub`)
  - `email` TEXT
  - `tier` TEXT — `"free"` or `"paid"`
  - `created_at` TIMESTAMPTZ
- **Tiers**: free (limited searches/day), paid (unlimited)
- **Payments**: Stripe webhooks update `tier` in `users` table on subscription events

---

## 12. Environment Variables

### Backend (`backend/.env`)

| Variable | Description | Required |
|---|---|---|
| `DATABASE_URL` | Neon PostgreSQL connection string (pooler URL with `?sslmode=require`) | Yes |
| `GEMINI_API_KEY` | Google Gemini API key (for `gemini-embedding-001` and `gemini-2.5-flash`) | Yes |

AWS credentials for Bedrock are **not** in `.env` — they come from the IAM instance role attached to the App Runner service. Locally, `boto3` falls back to `~/.aws/credentials` or environment variables.

### Frontend (`frontend/.env.local`)

| Variable | Description | Required |
|---|---|---|
| `BACKEND_URL` | Full URL to the Python backend (e.g. `https://your-app.us-east-1.awsapprunner.com`) | Yes |

If `BACKEND_URL` is unset, the Next.js server routes default to `http://localhost:8000`.

---

## 13. Dependencies

### Python (key packages)

| Package | Version | Purpose |
|---|---|---|
| `fastapi` | 0.135.1 | Web framework |
| `uvicorn` | 0.42.0 | ASGI server |
| `pydantic` | 2.12.5 | Data models (`Fic`, `EnrichedQuery`) |
| `sqlalchemy` | 2.0.48 | ORM, connection pooling |
| `psycopg2-binary` | 2.9.11 | PostgreSQL driver |
| `pgvector` | 0.4.2 | `Vector(768)` column type for SQLAlchemy |
| `boto3` | latest | AWS Bedrock client |
| `google-genai` | 1.68.0 | Gemini embeddings + Flash ranker |
| `seleniumbase` | latest | UC-mode scraping (AO3 + FFN) |
| `beautifulsoup4` | 4.13.4 | HTML parsing |
| `httpx` | 0.28.1 | Async HTTP client |
| `numpy` | (transitive) | L2 normalization, embedding blend |
| `tenacity` | 9.1.4 | Retry logic |
| `python-dotenv` | 1.1.0 | `.env` loading |
| `anyio` | 4.12.1 | Async support |

### Node (key packages)

| Package | Version | Purpose |
|---|---|---|
| `next` | 16.2.1 | Framework |
| `react` | 18.3.1 | UI |
| `typescript` | 5.8.3 | Type safety |
| `tailwindcss` | 3.4.17 | Styling |
| `@tanstack/react-table` | 8.20.5 | Sortable/filterable results table |
| `@tanstack/react-virtual` | 3.11.2 | Virtual scrolling |
| `dexie` | 3.2.7 | IndexedDB wrapper (search history cache) |
| `xlsx` | 0.18.5 | XLSX/CSV export |

---

## 14. Known Issues & Gotchas

### LLM ranker — intermittent timeouts

`rank()` calls `gemini-2.5-flash` synchronously inside the `/search` endpoint. On larger candidate sets or slow Gemini responses, this can push the total request time past the App Runner / frontend 60-second timeout. When it fails, the fallback sorts by kudos. The fix is to either make ranking async/optional or increase the timeout budget.

### Neon idle connection drops

Neon suspends compute after ~5 minutes of inactivity. The first request after idle will hit a dropped connection. Mitigated with `pool_pre_ping=True` (retests the connection before use) and `pool_recycle=300`. If you remove these settings, you'll see `OperationalError: SSL connection has been closed unexpectedly` on cold starts.

### AO3 URL encoding quirks

The AO3 tag filter URL has non-obvious encoding rules:

1. **`&` in fandom tags must be `*a*`**, not `%26` or `&`. Example: `"Naruto (Anime & Manga)"` → `Naruto+(Anime+*a*+Manga)`. AO3 uses `*a*` as its own encoding for `&` in tag slugs.
2. **Spaces in tags must be `+`**, not `%20`.
3. **`commit` parameter value (`Sort and Filter`) must be `+`-encoded** — using `urlencode(..., quote_via=quote_plus)` handles this. If you switch to `urllib.parse.urlencode` defaults, the `+` in the commit value breaks.
4. **`words_from`** is the correct parameter name for minimum word count, not `word_count` or `min_words`.

### `docker compose down -v` is destructive

Running `docker compose down -v` removes named volumes including any local PostgreSQL data. Only use this if you intend to wipe and recreate the database. In production, the database is Neon (external), so this is only a risk for local development.

### Neon pooler URL required

The Neon dashboard shows two connection strings: a direct URL and a pooler URL. **Always use the pooler URL** (`-pooler` in the hostname). The direct URL will exhaust Neon's connection limit under any meaningful load.

### psycopg2 embedding binding quirk

When migrating embeddings from RDS to Neon (`migrate_to_neon.py`), the embedding is fetched as a text string (`embedding::text`) and re-inserted with `'...'::vector` casting. This is because psycopg2's binary protocol can't pass a pgvector type directly across two different engine connections. If you write your own migration script, use the same cast pattern.

### Matryoshka 768-dim tradeoff

`gemini-embedding-001` supports multiple output dimensions (256, 768, 1536, 3072) via Matryoshka Representation Learning. We chose **768** as a balance:
- 3072 dims: best quality, but 4× storage and 4× cosine distance compute
- 768 dims: ~95% of the quality at ¼ the cost
- 256 dims: noticeably worse retrieval, not worth the saving

Changing dims requires dropping and recreating the `embedding` column (`migrate_embedding_dimensions()`) and re-embedding every fic.

### Structured enhancer fields not consumed

`EnrichedQuery` contains `ao3_tags`, `ao3_filters`, `detected_ships`, `detected_characters`, `excluded_tags`, etc. The current pipeline only uses `semantic_description` for the HyDE embedding. The structured fields are printed to logs but not passed to `search_similar()` as metadata filters. Connecting them to BM25 or SQL `WHERE` clauses is future work.

### Credential rotation reminders

- `GEMINI_API_KEY` — rotate periodically; if this leaks, all embedding and ranking calls are billed to your project
- Bedrock — uses IAM role, no rotation needed
- `DATABASE_URL` — Neon password can be rotated in the Neon console; update App Runner env var and redeploy

---

## 15. Key Technical Decisions

**HyDE (Hypothetical Document Embedding)**: Rather than embedding the user's short query directly, we ask an LLM to generate a hypothetical fanfic summary matching the query, then embed that. The embedding of a detailed document matches the embedding space of indexed fics better than a 5-word query. Tradeoff: adds one LLM call to every search.

**0.7/0.3 HyDE/raw blend**: Pure HyDE can drift — if the LLM generates an inaccurate expansion, the vector points away from what the user wanted. Blending 70% HyDE with 30% raw query embedding keeps the result grounded. After blending, the vector is L2-renormalized before the cosine search.

**pgvector over a dedicated vector DB**: Avoids operational complexity of running Pinecone/Weaviate alongside PostgreSQL. Neon + pgvector is sufficient for the current corpus size (~100k fics target). The tradeoff is slower approximate nearest-neighbor at very large scale, but exact cosine search at current scale is fast enough.

**SeleniumBase UC mode**: AO3 and FFN both have bot detection. Requests-based scrapers get blocked immediately. UC mode (undetected ChromeDriver) spoofs fingerprints. Tradeoff: requires a real Chrome install, can't run headless, and occasionally requires a manual click-through for age/bot interstitials on the first page.

**Offline indexing**: Scraping a fandom takes hours. Running this synchronously at query time is not viable. The pre-computed index approach means search is always fast but the corpus is a snapshot. New fics added to AO3/FFN after the last index run won't appear until the next manual re-index.

**No scheduler**: All indexing is manual. No cron job, no Lambda trigger, no SQS queue. This is intentional for now — the corpus doesn't go stale quickly and automated scraping at scale increases bot-detection risk.

---

## 16. Recent Changes Log

### April 2026 — Multi-angle HyDE search pipeline with varying blend ratios

**Before**: `enhance_query()` returned a single `semantic_description: str`. The pipeline embedded it once, blended 0.7/0.3 with the raw query embedding, ran one `search_similar()` call (top 50), then ranked those 50 candidates.

**After**: `enhance_query()` returns `semantic_descriptions: list[str]` — exactly 3 hypothetical fic summaries, each targeting a **different sub-audience** (primary interpretation / niche angle / emotional tone). The system prompt uses a `MUST` constraint to enforce diversity across the three descriptions. The pipeline now runs 4 searches total:

1. Embeds the raw query once (shared across all searches).
2. Search 1: embed(desc[0]) → blend **0.8/0.2** HyDE/raw → `search_similar(limit=50)`
3. Search 2: embed(desc[1]) → blend **0.7/0.3** HyDE/raw → `search_similar(limit=50)`
4. Search 3: embed(desc[2]) → blend **0.5/0.5** HyDE/raw → `search_similar(limit=50)`
5. Search 4: pure raw embedding (no blend) → `search_similar(limit=50)`
6. Merge all results, deduplicate by `fic_id` (`platform:url`), keep highest similarity (lowest position) per fic.
7. Cap at 100 unique candidates.
8. Pass candidates to `rank()` with the **original raw query** (not the HyDE descriptions).

**Fallback**: if `enhance_query()` fails, `semantic_descriptions` is `[raw_query]` (single item). In this case only 2 searches run: the single description at 0.7/0.3 and the pure raw search. The other two blended searches are skipped.

`max_tokens` in the query enhancer Bedrock payload was increased from `1024` to `2048` to accommodate three descriptions.

---

### April 2026 — Ranker migrated from Gemini Flash to Bedrock Haiku 4.5

**Before**: `ranker.py` used `google.genai` with `gemini-2.5-flash` via `client.models.generate_content()`. Fics omitted from the LLM response defaulted to `match_score = 0`.

**After**: Uses `boto3` `bedrock-runtime` client with model `us.anthropic.claude-haiku-4-5-20251001-v1:0`. System prompt: `"You are a fanfiction recommendation engine. Return ONLY a JSON array. No markdown, no backticks, no explanation."` `max_tokens: 4096` (needed for up to 100 scores), `temperature: 0.1`. Auth via IAM instance role. Response parsed as `response["body"].read()` → `body["content"][0]["text"]` → `json.loads`. Fics omitted from the LLM response now get `match_score = None` (not 0) to avoid false-zero sorting artifacts.

---

### April 2026 — Query enhancer migrated from Gemini Flash to Bedrock Haiku 4.5

**Before**: `query_enhancer.py` used `google.genai` with `gemini-2.5-flash` and structured JSON output via `response_schema`. This required the `_clean_schema()` helper to strip unsupported Pydantic schema keys before passing to the Gemini API.

**After**: Uses `boto3` `bedrock-runtime` client with model `us.anthropic.claude-haiku-4-5-20251001-v1:0`. No structured output enforcement — clean JSON is elicited via the system prompt suffix `"Respond ONLY with the JSON object. No markdown, no backticks, no preamble."` Auth is via IAM instance role (no API key needed for Bedrock). The `_clean_schema()` helper and all `google.genai` imports were removed from `query_enhancer.py`.

**Note**: `google-genai` is still in `requirements.txt` — it is still used by `embedder.py` (Gemini embeddings).

### March 2026 — Database migrated from AWS RDS to Neon

**Before**: PostgreSQL on AWS RDS (same region as App Runner, us-east-1). RDS was over-provisioned and expensive for a mostly-idle workload.

**After**: Neon managed PostgreSQL. Neon's serverless auto-scaling means the compute scales to zero when idle (near-zero cost during dev periods) and wakes on connection. The `migrate_to_neon.py` script moved all fic records in batches of 500 with embeddings cast as `::vector`. Always connect via the Neon pooler URL.

### March 2026 — Embedding dimensions changed from 3072 to 768

**Before**: `gemini-embedding-001` at 3072 dims (max for this model).

**After**: 768 dims via `output_dimensionality=768` (Matryoshka truncation). This reduced embedding storage by 4× and cosine search time proportionally with minimal retrieval quality loss. Required `migrate_embedding_dimensions()` to drop and recreate the `embedding` column, followed by a full re-index of all fandoms. The `EMBEDDING_DIMS = 768` constant is defined in both `embedder.py` and `db/postgres.py` and must stay in sync.
