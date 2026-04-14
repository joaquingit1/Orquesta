import json
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from data_loader import load_engineer
from agents.scanner import run_scanner, run_scanner_deep
from agents.advocate import run_advocate
from agents.challenger import run_challenger
from agents.synthesizer import run_synthesizer
from routers.ranking import update_verdict

router = APIRouter()


def _sse(event: str, payload: dict) -> str:
    return f"event: {event}\ndata: {json.dumps(payload)}\n\n"


def _sse_text(event: str, text: str) -> str:
    return f"event: {event}\ndata: {json.dumps({'text': text})}\n\n"


async def _stream_review(engineer_id: str):
    try:
        engineer = load_engineer(engineer_id)
    except FileNotFoundError:
        yield _sse("error", {"message": f"Engineer '{engineer_id}' not found"})
        return

    # 1. Scanning — surface-level narration of PR data
    async for chunk in run_scanner(engineer):
        yield _sse_text("scanning", chunk)

    # 2. Thinking — deep analysis with Opus adaptive thinking
    async for chunk in run_scanner_deep(engineer):
        yield _sse_text("thinking", chunk)

    # 3. Advocate — argues FOR the engineer
    async for chunk in run_advocate(engineer):
        yield _sse_text("advocate", chunk)

    # 4. Challenger — argues AGAINST the engineer
    async for chunk in run_challenger(engineer):
        yield _sse_text("challenger", chunk)

    # 5. Advocate reply — defends against challenger's criticisms
    async for chunk in run_advocate(engineer, is_reply=True):
        yield _sse_text("advocate_reply", chunk)

    # 6. Synthesizer — final score and verdict
    verdict = await run_synthesizer(engineer)
    update_verdict(engineer_id, verdict["score"], verdict["text"])
    yield _sse("verdict", {"score": verdict["score"], "text": verdict["text"], "engineer_id": engineer_id})

    # 7. Done
    yield _sse("done", {"engineer_id": engineer_id})


@router.get("/review/{engineer_id}/stream")
async def stream_review(engineer_id: str):
    return StreamingResponse(
        _stream_review(engineer_id),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
