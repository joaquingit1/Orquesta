# Workstation 2 — Backend: FastAPI + AI Agent Engine

## Your Job
Build the Python backend. FastAPI server with 5 endpoints, Claude API integration (Opus + Sonnet), and SSE streaming for the live review. You read JSON files from `/data/` (produced by Workstation 1 — use the mock data below if those files aren't ready yet).

---

## Stack
- Python 3.11+
- FastAPI + uvicorn
- `anthropic` SDK
- `python-dotenv`

---

## File Structure to Create

```
/backend/
  main.py
  requirements.txt
  .env.example
  data_loader.py
  agents/
    __init__.py
    scanner.py      ← Claude Opus with extended thinking
    advocate.py     ← Claude Sonnet, argues FOR the engineer
    challenger.py   ← Claude Sonnet, argues AGAINST
    synthesizer.py  ← Claude Opus, produces final score + verdict
  routers/
    __init__.py
    team.py         ← GET /api/team
    review.py       ← POST /api/review/start  +  GET /api/review/{id}/stream
    ranking.py      ← GET /api/ranking
    schedule.py     ← POST /api/schedule
```

---

## `requirements.txt`
```
fastapi
uvicorn[standard]
anthropic
python-dotenv
```

## `.env.example`
```
ANTHROPIC_API_KEY=sk-ant-...
```

---

## `main.py`
```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import team, review, ranking, schedule

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

app.include_router(team.router,     prefix="/api")
app.include_router(review.router,   prefix="/api")
app.include_router(ranking.router,  prefix="/api")
app.include_router(schedule.router, prefix="/api")
```

---

## `data_loader.py`
```python
import json, pathlib

DATA_DIR = pathlib.Path(__file__).parent.parent / "data"

def load_engineer(engineer_id: str) -> dict:
    return json.loads((DATA_DIR / "engineers" / f"{engineer_id}.json").read_text())

def load_all_engineers() -> list[dict]:
    return [load_engineer(e) for e in ["ana", "diego", "carlos", "sofia"]]

def load_kpis() -> dict:
    return json.loads((DATA_DIR / "kpis.json").read_text())

def load_anthropic_usage() -> dict:
    return json.loads((DATA_DIR / "anthropic_usage.json").read_text())

def load_calendar() -> dict:
    return json.loads((DATA_DIR / "calendar.json").read_text())
```

---

## API Contracts (match these shapes exactly — frontend depends on them)

### `GET /api/team`
```json
{
  "engineers": [
    { "id": "ana", "name": "Ana Oliveira", "role": "Senior Engineer", "avatar": null }
  ]
}
```

### `GET /api/ranking`
```json
{
  "rankings": [
    {
      "rank": 1, "id": "ana", "name": "Ana Oliveira",
      "score": 8.4, "verdict": "Exceptional engineer constrained by process.",
      "stats": "47 PRs · 3 architectural wins · 89% AI adoption",
      "evidence": { "prs": 47, "commits": 186, "reviews_given": 34, "ai_adoption": "89%" }
    }
  ],
  "meta": {
    "total_cost": "$4.82",
    "duration_seconds": 204,
    "human_equivalent": "~40 hours"
  }
}
```

### `POST /api/review/start`
```json
{ "status": "started" }
```

### `POST /api/schedule`
Request: `{ "engineer_id": "carlos" }`
Response:
```json
{ "engineer_id": "carlos", "slot": { "date": "2026-04-27", "time": "10:00" }, "status": "booked" }
```

---

## SSE Stream Format — `GET /api/review/{engineer_id}/stream`

This is the most important endpoint. The frontend listens to it and renders events live.
Events arrive in this order. Each `data:` line is JSON.

```
event: scanning
data: {"text": "Reading PR #342 — auth/middleware.ts..."}

event: thinking
data: {"text": "This async refactor eliminates 4 levels of nesting — this is deliberate simplification."}

event: advocate
data: {"text": "Ana's auth refactor shows deep systems understanding — she reduced latency 58% with zero behavior change."}

event: challenger
data: {"text": "But her test coverage dropped from 78% to 61% in Q2 — velocity over quality?"}

event: advocate_reply
data: {"text": "The coverage drop was a deliberate tradeoff — she was on a deadline with a prod incident."}

event: verdict
data: {"score": 8.4, "text": "Exceptional engineer constrained by process.", "engineer_id": "ana"}

event: done
data: {"engineer_id": "ana"}
```

### SSE implementation skeleton:
```python
import asyncio, json
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from data_loader import load_engineer
from agents.scanner import run_scanner
from agents.advocate import run_advocate
from agents.challenger import run_challenger
from agents.synthesizer import run_synthesizer

router = APIRouter()

@router.post("/review/start")
async def start_review():
    return {"status": "started"}

@router.get("/review/{engineer_id}/stream")
async def stream_review(engineer_id: str):
    async def event_stream():
        engineer = load_engineer(engineer_id)

        # SCANNING phase
        async for text in run_scanner(engineer):
            yield f"event: scanning\ndata: {json.dumps({'text': text})}\n\n"

        # THINKING phase (Opus extended thinking)
        async for text in run_scanner_deep(engineer):
            yield f"event: thinking\ndata: {json.dumps({'text': text})}\n\n"

        # ADVOCATE
        async for text in run_advocate(engineer):
            yield f"event: advocate\ndata: {json.dumps({'text': text})}\n\n"

        # CHALLENGER
        async for text in run_challenger(engineer):
            yield f"event: challenger\ndata: {json.dumps({'text': text})}\n\n"

        # ADVOCATE REPLY
        async for text in run_advocate(engineer, is_reply=True):
            yield f"event: advocate_reply\ndata: {json.dumps({'text': text})}\n\n"

        # VERDICT
        result = await run_synthesizer(engineer)
        yield f"event: verdict\ndata: {json.dumps(result)}\n\n"

        yield f"event: done\ndata: {json.dumps({'engineer_id': engineer_id})}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})
```

---

## Agent Implementation Pattern

Each agent uses the `anthropic` SDK. Use streaming. Example for `advocate.py`:

```python
import anthropic, os
from typing import AsyncGenerator

client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

ADVOCATE_PROMPT = """You are the Advocate in a performance review debate.
Your job: make the strongest possible case FOR this engineer based on their data.
Be specific — cite PR numbers, metrics, commit details.
Be concise — each argument is 1-2 sentences.
Start arguing immediately. No preamble."""

async def run_advocate(engineer: dict, is_reply: bool = False) -> AsyncGenerator[str, None]:
    context = format_engineer_context(engineer)
    prompt = f"{context}\n\n{'Respond to the challenger. Defend the engineer.' if is_reply else 'Make the case for this engineer.'}"

    with client.messages.stream(
        model="claude-sonnet-4-5",
        max_tokens=400,
        messages=[{"role": "user", "content": prompt}],
        system=ADVOCATE_PROMPT,
    ) as stream:
        for text in stream.text_stream:
            yield text

def format_engineer_context(engineer: dict) -> str:
    return f"""Engineer: {engineer['name']} ({engineer['role']})
PRs: {engineer['summary']['prs_opened']} opened, {engineer['summary']['prs_merged']} merged
Test coverage trend: {engineer['summary']['test_coverage_trend']}
AI adoption: {engineer['summary']['ai_tool_adoption']}
Goals: {engineer['kpis']['goals_completed']}
Notable PRs: {[pr['title'] for pr in engineer['notable_prs']]}"""
```

For `scanner.py` (Opus with extended thinking):
```python
# Use claude-opus-4-5 with betas=["interleaved-thinking-2025-05-14"]
# Stream thinking blocks as "thinking" events, text blocks as "scanning" events
```

For `synthesizer.py`, return:
```python
{"score": 8.4, "text": "Exceptional engineer constrained by process.", "engineer_id": engineer["id"]}
```

---

## Running Locally
```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # add your key
uvicorn main:app --reload --port 8000
```

---

## Done When
- `uvicorn main:app` starts without errors
- `curl http://localhost:8000/api/team` returns valid JSON
- `curl -N http://localhost:8000/api/review/ana/stream` emits SSE events in order
- CORS allows requests from `http://localhost:3000`

## Data Dependency
Reads from `/data/engineers/*.json`. If Workstation 1 isn't done, stub `data_loader.py` to return hardcoded dicts matching the schema above.
