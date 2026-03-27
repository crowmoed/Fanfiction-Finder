# FicFinder

A semantic search engine for fanfiction. Search across AO3 and FanFiction.net using natural language — "enemies to lovers slow burn with a redemption arc" — instead of keyword tags.

## How it works

1. **Indexer** scrapes fic metadata (title, summary, tags, word count, kudos) from AO3 and FFN using SeleniumBase.
2. **Embedder** generates 768-dim vectors via `gemini-embedding-001`, stored in PostgreSQL with pgvector.
3. **Search** uses HyDE (Hypothetical Document Embeddings) — the query is expanded into a fake fic description, embedded, blended 70/30 with the raw query embedding, then used to retrieve top candidates via cosine similarity.
4. **Ranker** re-ranks the top 200 candidates with an AI pass before returning the final results.
5. **Frontend** is a Next.js app deployed via GitHub → Vercel/AWS.

## Stack

| Layer | Tech |
| ----- | ---- |
| Backend | Python, FastAPI, SQLAlchemy |
| Embeddings | Google Gemini (`gemini-embedding-001`, 768 dims) |
| Database | PostgreSQL + pgvector |
| Scraping | SeleniumBase (undetected Chrome) |
| Frontend | Next.js 16, TypeScript, Tailwind CSS |
| Hosting | AWS App Runner (backend), GitHub push (frontend), AWS RDS (database) |

---

## Environment variables

Create a `.env` file in `backend/`:

```env
GEMINI_API_KEY=your_gemini_api_key
DATABASE_URL=postgresql://user:password@host:5432/dbname
```

---

## Running locally

### Backend

```bash
cd backend

# Option 1: Docker Compose (recommended)
docker compose up --build

# Option 2: Plain Python
pip install -r requirements.txt
python db/postgres.py        # initialise DB schema
uvicorn api:app --reload --host 0.0.0.0 --port 8000
```

API available at `http://localhost:8000`. Interactive docs at `http://localhost:8000/docs`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend available at `http://localhost:3000`.

---

## Indexing fics

The indexer scrapes and embeds fics into the database. Run it locally (not in Docker — needs a real Chrome window for bot detection bypass).

```bash
cd backend

# Index all fandoms
python indexer.py

# Index a single fandom
python indexer.py "Harry Potter"

# Re-index (clear existing data first)
python indexer.py "Harry Potter" --clear
```

> The first page of each site has a 15-second pause — use it to click through any bot/age interstitials manually.

---

## API endpoints

| Method | Path | Description |
| ------ | ---- | ----------- |
| GET | `/search?q=...&fandom=...&limit=20` | Semantic search |
| GET | `/fandoms` | List supported fandoms and collection status |
| GET | `/health` | Health check |
| GET | `/admin/stats` | Per-fandom DB stats |

---

## Deployment

### Backend — AWS App Runner via ECR

```bash
cd C:\Users\notcr\OneDrive\Desktop\Fanfiction-Finder

# Build and push image to ECR
docker build -t fanficfinder-backend ./backend
docker tag fanficfinder-backend:latest 473157802304.dkr.ecr.us-east-1.amazonaws.com/fanficfinder-backend:latest
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 473157802304.dkr.ecr.us-east-1.amazonaws.com
docker push 473157802304.dkr.ecr.us-east-1.amazonaws.com/fanficfinder-backend:latest
```

App Runner automatically deploys the new image once the push is complete.

### Frontend — GitHub push

```bash
git add .
git commit -m "general changes"
git push
```

The frontend CI/CD picks up the push automatically.
