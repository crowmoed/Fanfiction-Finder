# Fanfiction Finder

Semantic search engine for fanfiction. Scrapes AO3 and FanFiction.net, generates vector embeddings via Google Gemini, stores them in PostgreSQL+pgvector, and ranks results with an LLM.

---

## Prerequisites

Before running anything, you need:

1. **Python 3.12+**
2. **Node.js 18+** and **npm**
3. **PostgreSQL 16** with the **pgvector extension** installed
4. **Google Chrome** (used by the scrapers via SeleniumBase)
5. **A Google Gemini API key** — get one free at [aistudio.google.com](https://aistudio.google.com/app/apikey)

> Alternatively, use **Docker** to skip the PostgreSQL setup (see Docker section below).

---

## Setup

### 1. Clone the repo

```bash
git clone https://github.com/your-username/Fanfiction-Finder.git
cd Fanfiction-Finder
```

### 2. Configure backend environment

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env` and fill in your values:

| Variable | Description |
|---|---|
| `GEMINI_API_KEY` | Your Google Gemini API key |
| `DATABASE_URL` | PostgreSQL connection string |

### 3. Configure frontend environment (optional)

```bash
cp frontend/.env.local.example frontend/.env.local
```

Only needed if your backend is not running on `http://localhost:8000`.

### 4. Install backend dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 5. Install frontend dependencies

```bash
cd frontend
npm install
```

### 6. Set up the database

If running PostgreSQL locally, make sure the `pgvector` extension is available:

```sql
CREATE DATABASE ficfinder;
\c ficfinder
CREATE EXTENSION IF NOT EXISTS vector;
```

The backend will create the `fic_records` table automatically on first run.

---

## Running (without Docker)

### Start the backend API

```bash
cd backend
uvicorn api:app --reload
```

Backend will be available at `http://localhost:8000`.

### Start the frontend

```bash
cd frontend
npm run dev
```

Frontend will be available at `http://localhost:3000`.

### Index a fandom (required before searching)

The database starts empty. Run the indexer to scrape and embed fics for a fandom:

```bash
cd backend
python indexer.py "Harry Potter"
```

This will scrape 5 pages from both AO3 and FFN (~250 fics), embed them, and store them in the database. Supported fandom names are listed in [backend/data/fandoms.py](backend/data/fandoms.py).

---

## Running with Docker

Docker handles PostgreSQL (with pgvector) automatically.

```bash
cd backend

# Copy and fill in your .env (only GEMINI_API_KEY needed — DATABASE_URL is set by compose)
cp .env.example .env

docker-compose up --build
```

The API will be available at `http://localhost:8000`. Start the frontend separately as above.

---

## Supported Fandoms

Books: Harry Potter, Percy Jackson, Twilight, Hunger Games
Anime: Naruto, Attack on Titan, My Hero Academia, Fullmetal Alchemist, Death Note
TV: Supernatural, Sherlock, Doctor Who, The 100
Movies: Marvel, Star Wars
Games/Cartoons: Undertale, Legend of Zelda, Minecraft, Avatar, Steven Universe

---

## API Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/health` | Status check |
| GET | `/fandoms` | List indexed fandoms |
| GET | `/search?q=&fandom=&limit=` | Semantic search |
