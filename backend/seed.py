"""Seed the DB with realistic-looking demo data so the dashboard has something to show.

Usage:
    cd backend
    python seed.py
"""

from __future__ import annotations

import json
import os
import random
from datetime import datetime, timedelta
from pathlib import Path

from db import Commit, Engineer, Project, get_session, init_db
from pricing import cost_usd


random.seed(42)

ENGINEERS = [
    ("Valentina Ríos", "valentina@acme.io"),
    ("Marcos Pérez", "marcos@acme.io"),
    ("Lu Fernández", "lu@acme.io"),
    ("Tomás Álvarez", "tomas@acme.io"),
    ("Sofía Castro", "sofia@acme.io"),
]

PROJECTS = [("acme-backend", "acme-backend"), ("acme-web", "acme-web")]

SUBJECTS = [
    "fix: handle null user in auth middleware",
    "feat: add stripe webhook handler",
    "refactor: extract pricing into shared module",
    "test: cover edge cases in invoice parser",
    "chore: bump deps",
    "fix: race condition in job scheduler",
    "feat: dashboard engineer leaderboard",
    "docs: update onboarding guide",
    "perf: cache feed query by user",
    "fix: incorrect rounding on subtotal",
    "feat: export commits to CSV",
    "refactor: split monolithic api router",
    "feat: oauth login with github",
    "fix: memory leak in websocket reconnect",
    "test: add integration tests for billing",
]

MODELS = [
    ("claude-sonnet-4-6", 0.65),
    ("claude-opus-4-6", 0.25),
    ("claude-haiku-4-5", 0.10),
]

QUALITY_ISSUES_SAMPLES = [
    [
        {"severity": "low", "title": "Missing JSDoc", "detail": "Public function lacks parameter documentation."},
    ],
    [
        {"severity": "medium", "title": "Broad catch", "detail": "try/except Exception swallows root causes."},
        {"severity": "low", "title": "Magic number", "detail": "Hard-coded 300 should be a named constant."},
    ],
    [
        {"severity": "high", "title": "Potential SQL injection", "detail": "User input concatenated into query."},
    ],
    [],
    [{"severity": "medium", "title": "No tests added", "detail": "New branch in critical path without coverage."}],
]


def pick_model() -> str:
    r = random.random()
    acc = 0.0
    for m, p in MODELS:
        acc += p
        if r <= acc:
            return m
    return MODELS[0][0]


def main() -> None:
    db_path = Path("codemetrics.db")
    if db_path.exists():
        db_path.unlink()
    init_db()
    with get_session() as s:
        projects = {}
        for slug, name in PROJECTS:
            p = Project(slug=slug, name=name)
            s.add(p)
            s.commit()
            s.refresh(p)
            projects[slug] = p

        engineers = []
        for name, email in ENGINEERS:
            e = Engineer(email=email, name=name)
            s.add(e)
            s.commit()
            s.refresh(e)
            engineers.append(e)

        now = datetime.utcnow()
        commits_created = 0
        for day_offset in range(28):
            day = now - timedelta(days=day_offset)
            num_commits = random.randint(2, 7)
            for _ in range(num_commits):
                eng = random.choice(engineers)
                proj = random.choice(list(projects.values()))
                subject = random.choice(SUBJECTS)
                model = pick_model()

                additions = random.randint(5, 350)
                deletions = random.randint(0, int(additions * 0.6))
                files_changed = max(1, random.randint(1, 8))

                # token shape: mostly cache reads, some input/output
                input_tokens = random.randint(50, 500)
                output_tokens = random.randint(300, 3500)
                cache_read = random.randint(5000, 60000)
                cache_creation = random.randint(500, 8000)

                cost = cost_usd(input_tokens, output_tokens, cache_creation, cache_read, model)

                # quality: mostly 6-9, a few outliers
                score = random.choices(
                    [random.uniform(7.5, 9.5), random.uniform(5.5, 7.5), random.uniform(2.5, 5.0)],
                    weights=[0.55, 0.35, 0.10],
                )[0]
                issues = random.choice(QUALITY_ISSUES_SAMPLES)
                summary_map = {
                    True: "Clean change, good structure and naming.",
                    False: "Works but introduces smells that will cost later.",
                }
                dims = {
                    "clarity": round(max(1, min(10, score + random.uniform(-1, 1))), 1),
                    "correctness": round(max(1, min(10, score + random.uniform(-1, 1))), 1),
                    "security": round(max(1, min(10, score + random.uniform(-2, 1))), 1),
                    "maintainability": round(max(1, min(10, score + random.uniform(-1, 1))), 1),
                    "testing": round(max(1, min(10, score + random.uniform(-2, 2))), 1),
                }

                fake_sha = "".join(random.choices("0123456789abcdef", k=40))
                committed_at = day - timedelta(
                    hours=random.randint(0, 23), minutes=random.randint(0, 59)
                )

                c = Commit(
                    sha=fake_sha,
                    subject=subject,
                    project_id=proj.id,
                    engineer_id=eng.id,
                    committed_at=committed_at,
                    additions=additions,
                    deletions=deletions,
                    files_changed=files_changed,
                    input_tokens=input_tokens,
                    output_tokens=output_tokens,
                    cache_creation_input_tokens=cache_creation,
                    cache_read_input_tokens=cache_read,
                    total_tokens=input_tokens + output_tokens + cache_creation + cache_read,
                    events=random.randint(4, 40),
                    model=model,
                    cost_usd=round(cost, 6),
                    quality_score=round(score, 1),
                    quality_summary=summary_map[score >= 7.0],
                    quality_issues_json=json.dumps({"issues": issues, "dimensions": dims}),
                )
                s.add(c)
                commits_created += 1
            s.commit()

        print(f"✓ seeded {len(engineers)} engineers, {len(projects)} projects, {commits_created} commits")


if __name__ == "__main__":
    main()
