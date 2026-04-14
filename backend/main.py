"""Orquesta — FastAPI Backend with SSE streaming for AI performance reviews."""

import json
import asyncio
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from reviews import REVIEWS, REVIEW_ORDER, SCHEDULE, TEAM_STATS

app = FastAPI(title="Orquesta API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load engineer data
with open("data/engineers.json", "r", encoding="utf-8") as f:
    ENGINEERS = json.load(f)

ENGINEERS_BY_ID = {e["id"]: e for e in ENGINEERS}


@app.get("/api/team")
async def get_team():
    """Return team profiles for Screen 1."""
    return {
        "engineers": [
            {
                "id": e["id"],
                "name": e["name"],
                "role": e["role"],
                "avatar": e["avatar"],
                "tenure": e["tenure"],
            }
            for e in ENGINEERS
        ],
        "quarter": "Q1 2026",
        "team_size": len(ENGINEERS),
    }


@app.get("/api/engineer/{engineer_id}")
async def get_engineer(engineer_id: str):
    """Return full engineer data."""
    eng = ENGINEERS_BY_ID.get(engineer_id)
    if not eng:
        return {"error": "Not found"}, 404
    return eng


@app.get("/api/review/{engineer_id}")
async def stream_review(engineer_id: str):
    """Stream a single engineer's review process via SSE."""

    async def generate():
        review = REVIEWS.get(engineer_id)
        eng = ENGINEERS_BY_ID.get(engineer_id)
        if not review or not eng:
            yield f"data: {json.dumps({'type': 'error', 'content': 'Engineer not found'})}\n\n"
            return

        # Phase 1: Send engineer profile data
        yield f"data: {json.dumps({'type': 'profile', 'data': {'name': eng['name'], 'role': eng['role'], 'id': eng['id'], 'tenure': eng['tenure'], 'summary': eng['summary']}})}\n\n"
        await asyncio.sleep(0.3)

        # Phase 2: Send notable PRs (for code diff display)
        for pr in eng.get("notable_prs", []):
            yield f"data: {json.dumps({'type': 'pr', 'data': pr})}\n\n"
            await asyncio.sleep(0.2)

        # Phase 3: Send KPI data
        yield f"data: {json.dumps({'type': 'kpis', 'data': eng['kpis']})}\n\n"
        await asyncio.sleep(0.2)

        # Phase 4: Send AI usage data
        yield f"data: {json.dumps({'type': 'ai_usage', 'data': eng['anthropic_usage']})}\n\n"
        await asyncio.sleep(0.3)

        # Phase 5: Stream thinking (character by character simulation)
        for i, paragraph in enumerate(review["thinking"]):
            yield f"data: {json.dumps({'type': 'thinking_start', 'index': i})}\n\n"
            # Stream in chunks for realistic effect
            chunk_size = 8
            for j in range(0, len(paragraph), chunk_size):
                chunk = paragraph[j : j + chunk_size]
                yield f"data: {json.dumps({'type': 'thinking_chunk', 'index': i, 'content': chunk})}\n\n"
                await asyncio.sleep(0.02)
            yield f"data: {json.dumps({'type': 'thinking_end', 'index': i})}\n\n"
            await asyncio.sleep(0.4)

        yield f"data: {json.dumps({'type': 'thinking_complete'})}\n\n"
        await asyncio.sleep(0.5)

        # Phase 6: Stream advocate
        for i, paragraph in enumerate(review["advocate"]):
            yield f"data: {json.dumps({'type': 'advocate_start', 'index': i})}\n\n"
            chunk_size = 8
            for j in range(0, len(paragraph), chunk_size):
                chunk = paragraph[j : j + chunk_size]
                yield f"data: {json.dumps({'type': 'advocate_chunk', 'index': i, 'content': chunk})}\n\n"
                await asyncio.sleep(0.02)
            yield f"data: {json.dumps({'type': 'advocate_end', 'index': i})}\n\n"
            await asyncio.sleep(0.5)

        # Phase 7: Stream challenger
        for i, paragraph in enumerate(review["challenger"]):
            yield f"data: {json.dumps({'type': 'challenger_start', 'index': i})}\n\n"
            chunk_size = 8
            for j in range(0, len(paragraph), chunk_size):
                chunk = paragraph[j : j + chunk_size]
                yield f"data: {json.dumps({'type': 'challenger_chunk', 'index': i, 'content': chunk})}\n\n"
                await asyncio.sleep(0.02)
            yield f"data: {json.dumps({'type': 'challenger_end', 'index': i})}\n\n"
            await asyncio.sleep(0.5)

        # Phase 8: Stream advocate rebuttal (if exists)
        if review.get("advocate_rebuttal"):
            yield f"data: {json.dumps({'type': 'rebuttal_start'})}\n\n"
            chunk_size = 8
            text = review["advocate_rebuttal"]
            for j in range(0, len(text), chunk_size):
                chunk = text[j : j + chunk_size]
                yield f"data: {json.dumps({'type': 'rebuttal_chunk', 'content': chunk})}\n\n"
                await asyncio.sleep(0.02)
            yield f"data: {json.dumps({'type': 'rebuttal_end'})}\n\n"
            await asyncio.sleep(0.5)

        # Phase 9: Send verdict
        yield f"data: {json.dumps({'type': 'verdict', 'data': review['verdict']})}\n\n"
        await asyncio.sleep(0.3)

        # Done
        yield f"data: {json.dumps({'type': 'complete'})}\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")


@app.get("/api/review/start/all")
async def stream_all_reviews():
    """Stream the full review cycle for all engineers via SSE."""

    async def generate():
        yield f"data: {json.dumps({'type': 'cycle_start', 'order': REVIEW_ORDER, 'total': len(REVIEW_ORDER)})}\n\n"
        await asyncio.sleep(0.5)

        for idx, engineer_id in enumerate(REVIEW_ORDER):
            review = REVIEWS.get(engineer_id)
            eng = ENGINEERS_BY_ID.get(engineer_id)
            if not review or not eng:
                continue

            yield f"data: {json.dumps({'type': 'engineer_start', 'index': idx, 'id': engineer_id, 'name': eng['name'], 'role': eng['role'], 'tenure': eng['tenure']})}\n\n"
            await asyncio.sleep(0.3)

            # Profile + data
            yield f"data: {json.dumps({'type': 'profile', 'data': {'name': eng['name'], 'role': eng['role'], 'id': eng['id'], 'tenure': eng['tenure'], 'summary': eng['summary']}})}\n\n"
            await asyncio.sleep(0.3)

            # PRs
            for pr in eng.get("notable_prs", []):
                yield f"data: {json.dumps({'type': 'pr', 'data': pr})}\n\n"
                await asyncio.sleep(0.15)

            # KPIs
            yield f"data: {json.dumps({'type': 'kpis', 'data': eng['kpis']})}\n\n"
            await asyncio.sleep(0.15)

            # AI usage
            yield f"data: {json.dumps({'type': 'ai_usage', 'data': eng['anthropic_usage']})}\n\n"
            await asyncio.sleep(0.2)

            # Thinking
            for i, paragraph in enumerate(review["thinking"]):
                yield f"data: {json.dumps({'type': 'thinking_start', 'index': i})}\n\n"
                chunk_size = 10
                for j in range(0, len(paragraph), chunk_size):
                    chunk = paragraph[j : j + chunk_size]
                    yield f"data: {json.dumps({'type': 'thinking_chunk', 'index': i, 'content': chunk})}\n\n"
                    await asyncio.sleep(0.015)
                yield f"data: {json.dumps({'type': 'thinking_end', 'index': i})}\n\n"
                await asyncio.sleep(0.3)

            yield f"data: {json.dumps({'type': 'thinking_complete'})}\n\n"
            await asyncio.sleep(0.4)

            # Advocate
            for i, paragraph in enumerate(review["advocate"]):
                yield f"data: {json.dumps({'type': 'advocate_start', 'index': i})}\n\n"
                chunk_size = 10
                for j in range(0, len(paragraph), chunk_size):
                    chunk = paragraph[j : j + chunk_size]
                    yield f"data: {json.dumps({'type': 'advocate_chunk', 'index': i, 'content': chunk})}\n\n"
                    await asyncio.sleep(0.015)
                yield f"data: {json.dumps({'type': 'advocate_end', 'index': i})}\n\n"
                await asyncio.sleep(0.4)

            # Challenger
            for i, paragraph in enumerate(review["challenger"]):
                yield f"data: {json.dumps({'type': 'challenger_start', 'index': i})}\n\n"
                chunk_size = 10
                for j in range(0, len(paragraph), chunk_size):
                    chunk = paragraph[j : j + chunk_size]
                    yield f"data: {json.dumps({'type': 'challenger_chunk', 'index': i, 'content': chunk})}\n\n"
                    await asyncio.sleep(0.015)
                yield f"data: {json.dumps({'type': 'challenger_end', 'index': i})}\n\n"
                await asyncio.sleep(0.4)

            # Rebuttal
            if review.get("advocate_rebuttal"):
                yield f"data: {json.dumps({'type': 'rebuttal_start'})}\n\n"
                chunk_size = 10
                text = review["advocate_rebuttal"]
                for j in range(0, len(text), chunk_size):
                    chunk = text[j : j + chunk_size]
                    yield f"data: {json.dumps({'type': 'rebuttal_chunk', 'content': chunk})}\n\n"
                    await asyncio.sleep(0.015)
                yield f"data: {json.dumps({'type': 'rebuttal_end'})}\n\n"
                await asyncio.sleep(0.4)

            # Verdict
            yield f"data: {json.dumps({'type': 'verdict', 'data': review['verdict']})}\n\n"
            await asyncio.sleep(0.5)

            yield f"data: {json.dumps({'type': 'engineer_complete', 'id': engineer_id, 'score': review['verdict']['score']})}\n\n"
            await asyncio.sleep(0.8)

        # Cycle complete
        yield f"data: {json.dumps({'type': 'cycle_complete', 'stats': TEAM_STATS})}\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")


@app.get("/api/ranking")
async def get_ranking():
    """Return final ranking data."""
    ranked = sorted(ENGINEERS, key=lambda e: e["score"], reverse=True)
    return {
        "ranking": [
            {
                "rank": i + 1,
                "id": e["id"],
                "name": e["name"],
                "role": e["role"],
                "score": e["score"],
                "tagline": e["verdict_tagline"],
                "prs": e["summary"]["prs_opened"],
                "kpis": e["kpis"]["goals_completed"],
                "ai_adoption": e["summary"]["ai_tool_adoption"],
                "performance_metrics": e.get("performance_metrics", {}),
                "evidence_positive": REVIEWS[e["id"]]["verdict"]["evidence_positive"],
                "evidence_negative": REVIEWS[e["id"]]["verdict"]["evidence_negative"],
                "summary": REVIEWS[e["id"]]["verdict"]["summary"],
            }
            for i, e in enumerate(ranked)
        ],
        "stats": TEAM_STATS,
    }


@app.get("/api/schedule")
async def get_schedule():
    """Return simulated cal.com schedule."""
    return {"meetings": SCHEDULE}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
