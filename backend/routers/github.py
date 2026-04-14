import asyncio
import json
from typing import Optional
from fastapi import APIRouter, Cookie, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import httpx

from auth_store import get_auth_session
from github_fetcher import fetch_repo_engineers, fetch_project_context
from session_store import create_session, get_engineers, get_engineer, update_verdict, get_verdicts, get_project
from agents.scanner import run_scanner, run_scanner_deep
from agents.advocate import run_advocate
from agents.challenger import run_challenger
from agents.synthesizer import run_synthesizer
from agents.project import run_project_analyst
from agents.auditor import run_code_auditor

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
        engineers, project_context = await asyncio.gather(
            fetch_repo_engineers(
                owner, repo,
                token=effective_token,
                max_contributors=min(body.max_contributors, 12),
            ),
            fetch_project_context(owner, repo, token=effective_token),
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

    project_summary = await run_project_analyst(project_context)

    session_id = create_session(engineers, project=project_summary)

    return {
        "session_id": session_id,
        "repo": f"{owner}/{repo}",
        "project": project_summary,
        "contributors": [
            {
                "id": e["id"],
                "name": e["name"],
                "prs_opened": e["summary"]["prs_opened"],
                "prs_merged": e["summary"]["prs_merged"],
                "commits": e["summary"]["commits"],
                "impact_score": e.get("impact_score"),
            }
            for e in engineers
        ],
    }


async def _stream_review(session_id: str, engineer_id: str):
    engineer = get_engineer(session_id, engineer_id)
    if not engineer:
        yield _sse("error", {"message": f"Contributor '{engineer_id}' not found in session '{session_id}'"})
        return

    project_summary = get_project(session_id)

    # Emit the raw evidence first so the UI can render commits/PRs on the left
    # while the scanner agent narrates them on the right.
    raw_commits = engineer.get("recent_commits", [])
    commits_list = raw_commits if isinstance(raw_commits, list) else []
    print(f"[stream_review] {engineer_id}: emitting {len(commits_list)} commits, {len(engineer.get('notable_prs', []))} PRs")
    for i, commit in enumerate(commits_list):
        yield _sse("commit", commit)
        # Animate only the first 30 for visual effect; dump the rest as fast as possible.
        if i < 30:
            await asyncio.sleep(0.06)

    for pr in engineer.get("notable_prs", []):
        yield _sse("pr", pr)
        await asyncio.sleep(0.08)

    async for chunk in run_scanner(engineer, project_summary):
        yield _sse_text("scanning", chunk)

    async for chunk in run_scanner_deep(engineer, project_summary):
        yield _sse_text("thinking", chunk)

    audit_text_parts: list[str] = []
    async for chunk in run_code_auditor(engineer, project_summary):
        audit_text_parts.append(chunk)
        yield _sse_text("audit", chunk)

    advocate_text_parts: list[str] = []
    async for chunk in run_advocate(engineer, project_summary=project_summary):
        advocate_text_parts.append(chunk)
        yield _sse_text("advocate", chunk)

    challenger_text_parts: list[str] = []
    async for chunk in run_challenger(engineer, project_summary=project_summary):
        challenger_text_parts.append(chunk)
        yield _sse_text("challenger", chunk)

    rebuttal_text_parts: list[str] = []
    async for chunk in run_advocate(engineer, is_reply=True, project_summary=project_summary):
        rebuttal_text_parts.append(chunk)
        yield _sse_text("advocate_reply", chunk)

    verdict = await run_synthesizer(
        engineer,
        advocate_text="".join(advocate_text_parts),
        challenger_text="".join(challenger_text_parts),
        rebuttal_text="".join(rebuttal_text_parts),
        audit_text="".join(audit_text_parts),
        project_summary=project_summary,
    )
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
