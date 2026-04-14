"""Lightweight git helpers for the post-commit hook."""

from __future__ import annotations

import subprocess
from datetime import datetime, timezone
from pathlib import Path


def _run(args: list[str], cwd: Path) -> str:
    return subprocess.check_output(args, cwd=str(cwd), text=True).strip()


def repo_root(start: Path) -> Path:
    out = _run(["git", "rev-parse", "--show-toplevel"], start)
    return Path(out)


def head_sha(repo: Path) -> str:
    return _run(["git", "rev-parse", "HEAD"], repo)


def short_sha(repo: Path, sha: str) -> str:
    return _run(["git", "rev-parse", "--short", sha], repo)


def commit_info(repo: Path, sha: str) -> dict:
    fmt = "%an%x1f%ae%x1f%cI%x1f%s%x1f%P"
    out = _run(["git", "show", "-s", f"--format={fmt}", sha], repo)
    parts = out.split("\x1f")
    name, email, iso, subject, parents = parts + [""] * (5 - len(parts))
    ts = datetime.fromisoformat(iso.replace("Z", "+00:00")) if iso else datetime.now(timezone.utc)
    return {
        "sha": sha,
        "author_name": name,
        "author_email": email,
        "committed_at": ts.isoformat(),
        "subject": subject,
        "parents": parents.split() if parents else [],
    }


def diff_stats(repo: Path, sha: str) -> dict:
    """Return additions/deletions/files_changed for a commit against its parent."""
    parents = commit_info(repo, sha)["parents"]
    base = f"{sha}^" if parents else "4b825dc642cb6eb9a060e54bf8d69288fbee4904"
    numstat = _run(["git", "diff", "--numstat", base, sha], repo)
    add = delete = files = 0
    for line in numstat.splitlines():
        a, d, *_ = (line.split("\t") + ["", ""])[:3]
        try:
            add += int(a)
        except ValueError:
            pass
        try:
            delete += int(d)
        except ValueError:
            pass
        files += 1
    return {"additions": add, "deletions": delete, "files_changed": files}


def diff_patch(repo: Path, sha: str, max_bytes: int = 120_000) -> str:
    """Return the unified patch for a commit, truncated to max_bytes."""
    parents = commit_info(repo, sha)["parents"]
    base = f"{sha}^" if parents else "4b825dc642cb6eb9a060e54bf8d69288fbee4904"
    patch = _run(["git", "diff", base, sha], repo)
    if len(patch) > max_bytes:
        patch = patch[:max_bytes] + "\n[... truncated ...]"
    return patch


def parent_commit_time(repo: Path, sha: str) -> datetime | None:
    parents = commit_info(repo, sha)["parents"]
    if not parents:
        return None
    out = _run(["git", "show", "-s", "--format=%cI", parents[0]], repo)
    return datetime.fromisoformat(out.replace("Z", "+00:00"))
