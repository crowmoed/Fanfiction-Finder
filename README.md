# FicFinder

Semantic search for fanfiction. Search with natural language instead of tags.

## Setup

Create `backend/.env`:

```env
GEMINI_API_KEY=your_gemini_api_key
DATABASE_URL=postgresql://user:password@host:5432/dbname
```

## Running locally

```bash
# Backend
cd backend
pip install -r requirements.txt
python db/postgres.py
uvicorn api:app --reload --host 0.0.0.0 --port 8000

# Frontend
cd frontend
npm install
npm run dev
```

## Indexing

Run outside Docker — needs a real Chrome window to bypass bot detection.

```bash
cd backend

python indexer.py                        # all fandoms
python indexer.py "Naruto"               # one fandom
python indexer.py "Naruto" --clear       # re-index from scratch
python indexer.py "Naruto" --start-page 664   # resume AO3 from a page
python indexer.py "Naruto" --ffn-only    # run FFN only
```

> First page has a 15s pause — use it to click through any bot/age interstitials.

## Deploy

```bash
# Backend (AWS App Runner via ECR)
docker build -t fanficfinder-backend ./backend
docker tag fanficfinder-backend:latest 473157802304.dkr.ecr.us-east-1.amazonaws.com/fanficfinder-backend:latest
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 473157802304.dkr.ecr.us-east-1.amazonaws.com
docker push 473157802304.dkr.ecr.us-east-1.amazonaws.com/fanficfinder-backend:latest

# Frontend (auto-deploys on push)
git add .
git commit -m "changes im lazy"
git push
```
