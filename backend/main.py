"""FastAPI app: ingests commits from agent, serves dashboard API."""

from __future__ import annotations

import json
from datetime import datetime, timedelta
from typing import Optional

from dotenv import load_dotenv
from fastapi import BackgroundTasks, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlmodel import select

from db import Commit, Engineer, Project, get_session, init_db
from pricing import cost_usd
from quality import analyze_diff

load_dotenv()

app = FastAPI(title="codemetrics", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup() -> None:
    init_db()


# ---------- schemas ----------


class CommitMeta(BaseModel):
    sha: str
    author_name: str = ""
    author_email: str = ""
    committed_at: str
    subject: str = ""
    additions: int = 0
    deletions: int = 0
    files_changed: int = 0


class UsagePayload(BaseModel):
    input_tokens: int = 0
    output_tokens: int = 0
    cache_creation_input_tokens: int = 0
    cache_read_input_tokens: int = 0
    total_tokens: int = 0
    events: int = 0
    model: str = ""


class CommitPayload(BaseModel):
    project_id: str
    user_email: str = ""
    commit: CommitMeta
    usage: UsagePayload
    cost_usd: float = 0.0
    diff_patch: Optional[str] = None


# ---------- helpers ----------


def _upsert_project(slug: str):
    with get_session() as s:
        p = s.exec(select(Project).where(Project.slug == slug)).first()
        if p:
            return p
        p = Project(slug=slug, name=slug)
        s.add(p)
        s.commit()
        s.refresh(p)
        return p


def _upsert_engineer(email: str, name: str = ""):
    email = email.strip().lower() or "unknown@unknown"
    with get_session() as s:
        e = s.exec(select(Engineer).where(Engineer.email == email)).first()
        if e:
            if name and not e.name:
                e.name = name
                s.add(e)
                s.commit()
                s.refresh(e)
            return e
        e = Engineer(email=email, name=name or email.split("@")[0])
        s.add(e)
        s.commit()
        s.refresh(e)
        return e


def _quality_job(commit_id: int) -> None:
    with get_session() as s:
        c = s.get(Commit, commit_id)
        if not c or not c.diff_patch:
            return
        result = analyze_diff(c.diff_patch, model=None)
        c.quality_score = result.score or None
        c.quality_summary = result.summary
        c.quality_issues_json = json.dumps(
            {"issues": result.issues, "dimensions": result.dimensions}
        )
        s.add(c)
        s.commit()


# ---------- endpoints ----------


@app.get("/health")
def health():
    return {"ok": True}


@app.post("/commits")
def post_commit(payload: CommitPayload, bg: BackgroundTasks):
    project = _upsert_project(payload.project_id)
    engineer = _upsert_engineer(payload.user_email, name=payload.commit.author_name)

    committed_at = datetime.fromisoformat(payload.commit.committed_at.replace("Z", "+00:00"))
    authoritative_cost = cost_usd(
        payload.usage.input_tokens,
        payload.usage.output_tokens,
        payload.usage.cache_creation_input_tokens,
        payload.usage.cache_read_input_tokens,
        payload.usage.model,
    )

    with get_session() as s:
        existing = s.exec(select(Commit).where(Commit.sha == payload.commit.sha)).first()
        if existing:
            return {"status": "duplicate", "id": existing.id}
        c = Commit(
            sha=payload.commit.sha,
            subject=payload.commit.subject,
            project_id=project.id,
            engineer_id=engineer.id,
            committed_at=committed_at.replace(tzinfo=None),
            additions=payload.commit.additions,
            deletions=payload.commit.deletions,
            files_changed=payload.commit.files_changed,
            input_tokens=payload.usage.input_tokens,
            output_tokens=payload.usage.output_tokens,
            cache_creation_input_tokens=payload.usage.cache_creation_input_tokens,
            cache_read_input_tokens=payload.usage.cache_read_input_tokens,
            total_tokens=payload.usage.total_tokens
            or (
                payload.usage.input_tokens
                + payload.usage.output_tokens
                + payload.usage.cache_creation_input_tokens
                + payload.usage.cache_read_input_tokens
            ),
            events=payload.usage.events,
            model=payload.usage.model,
            cost_usd=round(authoritative_cost, 6),
            diff_patch=payload.diff_patch,
        )
        s.add(c)
        s.commit()
        s.refresh(c)

    if payload.diff_patch:
        bg.add_task(_quality_job, c.id)

    return {"status": "ok", "id": c.id}


@app.get("/overview")
def overview():
    with get_session() as s:
        commits = s.exec(select(Commit)).all()
        engineers = s.exec(select(Engineer)).all()
        projects = s.exec(select(Project)).all()

    total_cost = sum(c.cost_usd for c in commits)
    total_tokens = sum(c.total_tokens for c in commits)
    total_commits = len(commits)
    quality_scored = [c.quality_score for c in commits if c.quality_score]
    avg_quality = sum(quality_scored) / len(quality_scored) if quality_scored else 0.0

    cutoff = datetime.utcnow() - timedelta(days=30)
    recent = [c for c in commits if c.committed_at >= cutoff]
    cost_30d = sum(c.cost_usd for c in recent)

    # daily series last 30d
    day_map: dict[str, dict] = {}
    for c in recent:
        key = c.committed_at.strftime("%Y-%m-%d")
        d = day_map.setdefault(key, {"date": key, "cost": 0.0, "tokens": 0, "commits": 0})
        d["cost"] += c.cost_usd
        d["tokens"] += c.total_tokens
        d["commits"] += 1
    timeseries = sorted(day_map.values(), key=lambda x: x["date"])

    return {
        "totals": {
            "commits": total_commits,
            "tokens": total_tokens,
            "cost_usd": round(total_cost, 2),
            "cost_usd_30d": round(cost_30d, 2),
            "avg_quality": round(avg_quality, 2),
            "engineers": len(engineers),
            "projects": len(projects),
        },
        "timeseries": timeseries,
    }


@app.get("/engineers")
def list_engineers():
    with get_session() as s:
        engineers = s.exec(select(Engineer)).all()
        commits = s.exec(select(Commit)).all()
    by_eng: dict[int, list[Commit]] = {}
    for c in commits:
        by_eng.setdefault(c.engineer_id, []).append(c)

    out = []
    for e in engineers:
        cs = by_eng.get(e.id, [])
        tokens = sum(c.total_tokens for c in cs)
        cost = sum(c.cost_usd for c in cs)
        lines = sum(c.additions + c.deletions for c in cs)
        scored = [c.quality_score for c in cs if c.quality_score]
        quality = sum(scored) / len(scored) if scored else 0.0
        efficiency = (lines / cost) if cost > 0 else 0.0
        out.append(
            {
                "id": e.id,
                "email": e.email,
                "name": e.name,
                "commits": len(cs),
                "tokens": tokens,
                "cost_usd": round(cost, 2),
                "lines": lines,
                "avg_quality": round(quality, 2),
                "efficiency": round(efficiency, 2),
            }
        )
    out.sort(key=lambda x: x["cost_usd"], reverse=True)
    return out


@app.get("/engineers/{engineer_id}")
def get_engineer(engineer_id: int):
    with get_session() as s:
        e = s.get(Engineer, engineer_id)
        if not e:
            raise HTTPException(404)
        commits = s.exec(
            select(Commit).where(Commit.engineer_id == engineer_id).order_by(Commit.committed_at.desc())
        ).all()

    tokens = sum(c.total_tokens for c in commits)
    cost = sum(c.cost_usd for c in commits)
    scored = [c.quality_score for c in commits if c.quality_score]
    quality = sum(scored) / len(scored) if scored else 0.0

    day_map: dict[str, dict] = {}
    for c in commits:
        key = c.committed_at.strftime("%Y-%m-%d")
        d = day_map.setdefault(key, {"date": key, "cost": 0.0, "tokens": 0, "commits": 0})
        d["cost"] += c.cost_usd
        d["tokens"] += c.total_tokens
        d["commits"] += 1
    timeseries = sorted(day_map.values(), key=lambda x: x["date"])

    return {
        "engineer": {"id": e.id, "email": e.email, "name": e.name},
        "summary": {
            "commits": len(commits),
            "tokens": tokens,
            "cost_usd": round(cost, 2),
            "avg_quality": round(quality, 2),
        },
        "timeseries": timeseries,
        "commits": [_serialize_commit(c) for c in commits],
    }


def _serialize_commit(c: Commit) -> dict:
    return {
        "id": c.id,
        "sha": c.sha,
        "short_sha": c.sha[:7],
        "subject": c.subject,
        "project_id": c.project_id,
        "engineer_id": c.engineer_id,
        "committed_at": c.committed_at.isoformat(),
        "additions": c.additions,
        "deletions": c.deletions,
        "files_changed": c.files_changed,
        "total_tokens": c.total_tokens,
        "input_tokens": c.input_tokens,
        "output_tokens": c.output_tokens,
        "cache_read_input_tokens": c.cache_read_input_tokens,
        "cache_creation_input_tokens": c.cache_creation_input_tokens,
        "model": c.model,
        "cost_usd": c.cost_usd,
        "quality_score": c.quality_score,
        "quality_summary": c.quality_summary,
        "quality_issues": json.loads(c.quality_issues_json) if c.quality_issues_json else None,
    }


@app.get("/commits")
def list_commits(limit: int = 100, engineer_id: Optional[int] = None):
    with get_session() as s:
        q = select(Commit).order_by(Commit.committed_at.desc()).limit(limit)
        if engineer_id:
            q = (
                select(Commit)
                .where(Commit.engineer_id == engineer_id)
                .order_by(Commit.committed_at.desc())
                .limit(limit)
            )
        commits = s.exec(q).all()
        engineers = {e.id: e for e in s.exec(select(Engineer)).all()}

    out = []
    for c in commits:
        d = _serialize_commit(c)
        eng = engineers.get(c.engineer_id)
        d["engineer"] = {"id": eng.id, "email": eng.email, "name": eng.name} if eng else None
        out.append(d)
    return out


@app.get("/commits/{commit_id}")
def get_commit(commit_id: int):
    with get_session() as s:
        c = s.get(Commit, commit_id)
        if not c:
            raise HTTPException(404)
        eng = s.get(Engineer, c.engineer_id)
    d = _serialize_commit(c)
    d["engineer"] = {"id": eng.id, "email": eng.email, "name": eng.name} if eng else None
    d["diff_patch"] = c.diff_patch
    return d


@app.post("/commits/{commit_id}/reanalyze")
def reanalyze(commit_id: int, bg: BackgroundTasks):
    with get_session() as s:
        c = s.get(Commit, commit_id)
        if not c:
            raise HTTPException(404)
    bg.add_task(_quality_job, commit_id)
    return {"status": "queued"}
