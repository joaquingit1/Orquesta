"""post-commit hook logic: collect tokens used since previous commit and POST to backend."""

from __future__ import annotations

import json
import sys
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

from .config import load_config, load_state, save_state
from .git_utils import (
    commit_info,
    diff_patch,
    diff_stats,
    head_sha,
    parent_commit_time,
    repo_root,
)
from .parser import usage_in_window
from .pricing import cost_usd


def _post(url: str, payload: dict, token: str | None = None) -> dict:
    data = json.dumps(payload).encode("utf-8")
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(url, data=data, headers=headers, method="POST")
    with urllib.request.urlopen(req, timeout=10) as resp:
        body = resp.read().decode("utf-8")
        return json.loads(body) if body else {}


def run(cwd: Path | None = None) -> int:
    cwd = cwd or Path.cwd()
    try:
        repo = repo_root(cwd)
    except Exception:
        print("codemetrics: not a git repo, skipping", file=sys.stderr)
        return 0

    cfg = load_config(repo)
    if not cfg:
        print("codemetrics: no config, run `codemetrics init`", file=sys.stderr)
        return 0

    backend = cfg.get("backend_url", "").rstrip("/")
    token = cfg.get("token")
    project_id = cfg.get("project_id", repo.name)
    user_email = cfg.get("user_email", "")

    state = load_state(repo)
    last_ts_str = state.get("last_event_ts")
    last_ts = None
    if last_ts_str:
        try:
            last_ts = datetime.fromisoformat(last_ts_str)
        except ValueError:
            last_ts = None

    sha = head_sha(repo)
    info = commit_info(repo, sha)
    stats = diff_stats(repo, sha)

    window_start = last_ts or parent_commit_time(repo, sha)
    window_end = datetime.now(timezone.utc)

    usage = usage_in_window(str(repo), window_start, window_end)
    usage_dict = usage.to_dict()
    model = usage_dict.get("model", "")
    cost = cost_usd(usage_dict, model)

    payload = {
        "project_id": project_id,
        "user_email": user_email or info["author_email"],
        "commit": {
            **info,
            **stats,
        },
        "usage": usage_dict,
        "cost_usd": round(cost, 4),
        "window": {
            "from": window_start.isoformat() if window_start else None,
            "to": window_end.isoformat(),
        },
        "diff_patch": diff_patch(repo, sha),
    }

    print(
        f"codemetrics: {info['sha'][:7]} "
        f"+{stats['additions']}/-{stats['deletions']} "
        f"{usage_dict['total_tokens']} tok ${cost:.3f}"
    )

    if not backend:
        print("codemetrics: no backend_url, skipping upload", file=sys.stderr)
    else:
        try:
            _post(f"{backend}/commits", payload, token)
        except urllib.error.URLError as e:
            print(f"codemetrics: upload failed: {e}", file=sys.stderr)

    state["last_event_ts"] = window_end.isoformat()
    state["last_commit_sha"] = sha
    save_state(repo, state)
    return 0


if __name__ == "__main__":
    sys.exit(run())
