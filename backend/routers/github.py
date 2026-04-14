import asyncio
import json
from typing import Optional
from fastapi import APIRouter, Cookie, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import httpx

from auth_store import get_auth_session
from github_fetcher import fetch_repo_engineers
from session_store import create_session, get_engineers, get_engineer, update_verdict, get_verdicts
from agents.scanner import run_scanner, run_scanner_deep
from agents.advocate import run_advocate
from agents.challenger import run_challenger
from agents.synthesizer import run_synthesizer

router = APIRouter()


class GitHubImportRequest(BaseModel):
    repo: str                          # "owner/repo" or full URL
    token: Optional[str] = None        # GitHub PAT for higher rate limits
    max_contributors: int = 6


def _sse(event: str, payload: dict) -> str:
    return f"event: {event}\ndata: {json.dumps(payload)}\n\n"


def _sse_text(event: str, text: str) -> str:
    return f"event: {event}\ndata: {json.dumps({'text': text})}\n\n"


@router.post("/import/github")
async def import_github(
    body: GitHubImportRequest,
    orq_session: str | None = Cookie(default=None),
):
    # Accept "owner/repo", "https://github.com/owner/repo", etc.
    repo_str = body.repo.rstrip("/")
    if "github.com/" in repo_str:
        repo_str = repo_str.split("github.com/")[-1]
    parts = repo_str.split("/")
    if len(parts) < 2:
        raise HTTPException(status_code=400, detail="repo must be 'owner/repo' or a github.com URL")
    owner, repo = parts[0], parts[1]

    # Prefer the OAuth session token; fall back to explicit token in body for non-authenticated calls.
    auth_session = get_auth_session(orq_session)
    effective_token = (auth_session["access_token"] if auth_session else None) or body.token

    try:
        engineers = await fetch_repo_engineers(
            owner, repo,
            token=effective_token,
            max_contributors=min(body.max_contributors, 12),
        )
    except httpx.HTTPStatusError as e:
        if e.response.status_code == 404:
            raise HTTPException(status_code=404, detail=f"Repo '{owner}/{repo}' not found or not public")
        if e.response.status_code in (403, 429):
            raise HTTPException(
                status_code=429,
                detail="GitHub rate limit hit — provide a token for 5000 req/hr instead of 60",
            )
        raise HTTPException(status_code=502, detail=f"GitHub API error: {e.response.status_code}")
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="GitHub API timed out")

    if not engineers:
        raise HTTPException(status_code=404, detail="No contributors found in this repo")

    session_id = create_session(engineers)

    return {
        "session_id": session_id,
        "repo": f"{owner}/{repo}",
        "contributors": [
            {
                "id": e["id"],
                "name": e["name"],
                "prs_opened": e["summary"]["prs_opened"],
                "prs_merged": e["summary"]["prs_merged"],
                "commits": e["summary"]["commits"],
            }
            for e in engineers
        ],
    }


async def _stream_review(session_id: str, engineer_id: str):
    engineer = get_engineer(session_id, engineer_id)
    if not engineer:
        yield _sse("error", {"message": f"Contributor '{engineer_id}' not found in session '{session_id}'"})
        return

    # Emit the raw evidence first so the UI can render commits/PRs on the left
    # while the scanner agent narrates them on the right.
    for commit in engineer.get("recent_commits", []):
        yield _sse("commit", commit)
        await asyncio.sleep(0.12)

    for pr in engineer.get("notable_prs", []):
        yield _sse("pr", pr)
        await asyncio.sleep(0.12)

    async for chunk in run_scanner(engineer):
        yield _sse_text("scanning", chunk)

    async for chunk in run_scanner_deep(engineer):
        yield _sse_text("thinking", chunk)

    async for chunk in run_advocate(engineer):
        yield _sse_text("advocate", chunk)

    async for chunk in run_challenger(engineer):
        yield _sse_text("challenger", chunk)

    async for chunk in run_advocate(engineer, is_reply=True):
        yield _sse_text("advocate_reply", chunk)

    verdict = await run_synthesizer(engineer)
    update_verdict(session_id, engineer_id, verdict["score"], verdict["text"])
    yield _sse("verdict", {
        "score": verdict["score"],
        "text": verdict["text"],
        "engineer_id": engineer_id,
    })
    yield _sse("done", {"engineer_id": engineer_id})


@router.get("/github/{session_id}/review/{engineer_id}/stream")
async def stream_review(session_id: str, engineer_id: str):
    if get_engineers(session_id) is None:
        raise HTTPException(status_code=404, detail=f"Session '{session_id}' not found")
    return StreamingResponse(
        _stream_review(session_id, engineer_id),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.get("/github/{session_id}/engineer/{engineer_id}")
async def get_engineer_profile(session_id: str, engineer_id: str):
    """Fetch the full engineer profile (PRs, commits, metrics) for the UI."""
    if get_engineers(session_id) is None:
        raise HTTPException(status_code=404, detail=f"Session '{session_id}' not found")
    engineer = get_engineer(session_id, engineer_id)
    if not engineer:
        raise HTTPException(status_code=404, detail=f"Contributor '{engineer_id}' not found")
    return engineer


@router.get("/github/{session_id}/ranking")
async def get_ranking(session_id: str):
    engineers = get_engineers(session_id)
    if engineers is None:
        raise HTTPException(status_code=404, detail=f"Session '{session_id}' not found")

    verdicts = get_verdicts(session_id)
    entries = []
    for e in engineers:
        verdict = verdicts.get(e["id"])
        kpis = e.get("kpis", {})
        entries.append({
            "id": e["id"],
            "name": e["name"],
            "score": verdict["score"] if verdict else None,
            "verdict": verdict["text"] if verdict else "Review not yet run",
            "stats": (
                f"{e['summary']['prs_merged']}/{e['summary']['prs_opened']} PRs merged · "
                f"{e['summary']['commits']} commits · "
                f"{e['summary']['reviews_given']} reviews given"
            ),
            "evidence": {
                "pr_count": e["summary"]["prs_opened"],
                "kpi_completion": kpis.get("goals_completed", ""),
                "ai_sessions": "N/A",
            },
        })

    entries.sort(key=lambda x: (x["score"] or 0), reverse=True)
    for i, entry in enumerate(entries, 1):
        entry["rank"] = i

    return {"session_id": session_id, "rankings": entries}
