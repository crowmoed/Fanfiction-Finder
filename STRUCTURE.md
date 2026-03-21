# Fanfiction-Finder — System Structure

## Overview

Semantic search engine for fanfiction (AO3 + FFN). Scrapes fic metadata, generates vector embeddings via Gemini, stores in PostgreSQL+pgvector, and ranks results with an LLM.

---

## Directory Structure

```
Fanfiction-Finder/
├── ficfinder-plan.docx
├── STRUCTURE.md                       ← this file
└── backend/
    ├── .env                           ← Gemini API key + DB connection string
    ├── requirements.txt
    ├── Dockerfile
    ├── docker-compose.yml
    ├── api.py                         ← FastAPI REST server
    ├── main.py                        ← CLI test runner
    ├── indexer.py                     ← Bulk scrape + embed + store
    ├── ai/
    │   ├── embedder.py                ← Gemini embedding generation
    │   └── ranker.py                  ← Gemini LLM ranking/scoring
    ├── data/
    │   ├── schema.py                  ← Pydantic Fic model
    │   └── fandoms.py                 ← AO3/FFN slug mappings (17 fandoms)
    ├── db/
    │   └── postgres.py                ← SQLAlchemy ORM + pgvector queries
    └── scrapers/
        ├── ao3.py                     ← Archive of Our Own scraper
        └── ffn.py                     ← FanFiction.net scraper
```

---

## Data Flow

### Indexing (`python indexer.py "Harry Potter"`)
```
AO3 Scraper ──┐
              ├──> Fic objects ──> Gemini Embeddings ──> PostgreSQL (pgvector)
FFN Scraper ──┘
```

### Search (`GET /search?q=...&fandom=...`)
```
Query string
  └──> Gemini embed query
       └──> pgvector cosine similarity search (top 50 candidates)
            └──> Gemini 2.5 Flash ranking (0-100 scores + reasons)
                 └──> Return top N Fic objects
```

---

## Tech Stack

| Layer | Tech |
|---|---|
| Language | Python 3.12 |
| Web framework | FastAPI + Uvicorn |
| Scraping | SeleniumBase (undetected Chrome) + BeautifulSoup4 |
| AI | Google Gemini (`gemini-embedding-001` + `gemini-2.5-flash`) |
| Database | PostgreSQL 16 + pgvector extension |
| ORM | SQLAlchemy 2.0 |
| Validation | Pydantic v2 |
| Infrastructure | Docker + docker-compose |

---

## API Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/health` | Status check |
| GET | `/fandoms` | List all indexed fandoms |
| GET | `/search` | Semantic search (`?q=`, `?fandom=`, `?limit=`) |

---

## Components

### `indexer.py`
- Entry point for bulk indexing a fandom
- Scrapes `PAGES_PER_PLATFORM = 5` pages from both AO3 and FFN
- Batches fics into groups of 25 for embedding
- Upserts into DB (skips duplicates by URL)

### `scrapers/ao3.py`
- SeleniumBase with undetected Chrome
- 10s wait on first page load (for interstitials)
- Parses title, URL, summary, tags, kudos, hits, word count
- No inter-page delay (RATE_LIMIT_SECONDS = 0)

### `scrapers/ffn.py`
- Same SeleniumBase approach
- 10s wait on first page load
- Parses favs as kudos, extracts genre tags from stats bar
- No inter-page delay

### `ai/embedder.py`
- Model: `gemini-embedding-001` (3072 dimensions)
- Embeds fics as: `"{title} {summary} {tags joined}"`
- `embed_fics_batch()` processes in batches of 25

### `ai/ranker.py`
- Model: `gemini-2.5-flash`
- Sends top 50 candidates as JSON, receives scored list
- Fallback: sort by kudos if LLM call fails

### `db/postgres.py`
- `FicRecord` table: id, title, url, platform, summary, tags, word_count, kudos, hits, embedding (vector 3072)
- `upsert_fic()` — insert or update by URL
- `search_similar()` — cosine distance query, returns top N

---

## Supported Fandoms (17)

Books: Harry Potter, Percy Jackson, Twilight, Hunger Games
Anime: Naruto, Attack on Titan, My Hero Academia, Fullmetal Alchemist, Death Note
TV: Supernatural, Sherlock, Doctor Who, The 100
Movies: Marvel, Star Wars
Games/Cartoons: Undertale, Legend of Zelda, Minecraft, Avatar, Steven Universe

---

## Status

### Done
- [x] AO3 scraper
- [x] FFN scraper
- [x] Gemini embedding pipeline
- [x] PostgreSQL + pgvector storage
- [x] Semantic vector search
- [x] LLM ranking with scores + explanations
- [x] FastAPI REST server
- [x] Docker setup
- [x] Fandom slug mapping

### Not Yet Done
- [ ] Frontend UI
- [ ] Search pagination (offset/cursor)
- [ ] API authentication
- [ ] Indexing scheduler (currently manual one-shot)
- [ ] Query embedding cache
- [ ] Database migrations (currently `CREATE IF NOT EXISTS` only)
- [ ] Test suite
