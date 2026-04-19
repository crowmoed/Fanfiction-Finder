# FicFinder

Semantic search for fanfiction. Search with natural language instead of tags.

---

## Jumping to the project

The repo lives on an external HD at `D:\Fanfiction-Finder`. Add this to your PowerShell `$PROFILE` so `ff` jumps there from anywhere:

```powershell
function ff { Set-Location 'D:\Fanfiction-Finder' }
```

Bash/Git Bash equivalent in `~/.bashrc`:

```bash
alias ff='cd /d/Fanfiction-Finder'
```

---

## Setup

Create `backend/.env` with the required env vars — see [ARCHITECTURE.md §15](ARCHITECTURE.md#15--environment-variables) for the full list.

---

## Backend — FastAPI + Uvicorn

Serves the search API on `http://localhost:8000`.

```bash
cd D:\Fanfiction-Finder\backend
pip install -r requirements.txt
python db/postgres.py
uvicorn api:app --reload --host 0.0.0.0 --port 8000
```

---

## Frontend — Next.js

Dev server on `http://localhost:3000`.

```bash
cd D:\Fanfiction-Finder\frontend
npm install
npm run dev
```

---

## Indexer — Selenium + Chrome (AO3/FFN) & headless Wattpad

Run **outside Docker** — AO3 and FFN need a real Chrome window to bypass bot detection. Wattpad runs headlessly.

```bash
cd D:\Fanfiction-Finder\backend

python indexer.py                             # all fandoms (AO3 + FFN + Wattpad)
python indexer.py "Naruto"                    # one fandom
python indexer.py "Naruto" --clear            # re-index from scratch
python indexer.py "Naruto" --start-page 664   # resume AO3 from a page
python indexer.py "Naruto" --ffn-only         # run FFN only
python indexer.py "Naruto" --wattpad-only     # run Wattpad only
python indexer.py "Naruto" --wattpad-quality 5   # set Wattpad quality offset
```

> First page has a 15s pause — use it to click through any bot/age interstitials.

---

## Devtool — Textual TUI

Clickable terminal UI for swapping fandom data between local storage and the live Neon database, plus scraping controls.

```bash
cd D:\Fanfiction-Finder\fanfic-devtool
pip install -r requirements.txt
python app.py
```

---

## Deploy — Docker + AWS ECR → App Runner

Frontend auto-deploys on push to `main` via Vercel. Backend is a manual push:

```bash
cd D:\Fanfiction-Finder\backend
docker build -t fanficfinder-backend .
docker tag fanficfinder-backend:latest 473157802304.dkr.ecr.us-east-1.amazonaws.com/fanficfinder-backend:latest
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 473157802304.dkr.ecr.us-east-1.amazonaws.com
docker push 473157802304.dkr.ecr.us-east-1.amazonaws.com/fanficfinder-backend:latest
```

Lazy frontend push (triggers the Vercel deploy):

```bash
cd D:\Fanfiction-Finder
git add .
git commit -m "changes im lazy"
git push
```

---

## Swapping infrastructure

Database (Neon → RDS) and backend host (App Runner → elsewhere) swap procedures live in [ARCHITECTURE.md §3](ARCHITECTURE.md#3--swapping-infrastructure).
