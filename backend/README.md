# codemetrics — backend

FastAPI + SQLite. Ingests commits from the local agent and serves the dashboard.

## Setup

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# edit .env and set ANTHROPIC_API_KEY
uvicorn main:app --reload
```

## Endpoints

- `POST /commits` — agent ingestion
- `GET /overview` — KPIs + 30d series
- `GET /engineers` — per-engineer aggregates
- `GET /engineers/{id}` — engineer detail + commits
- `GET /commits` — recent commits (filterable by engineer)
- `GET /commits/{id}` — commit detail w/ diff + quality issues
- `POST /commits/{id}/reanalyze` — re-run quality analysis
