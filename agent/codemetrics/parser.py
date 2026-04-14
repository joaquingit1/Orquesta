"""Parser for Claude Code session JSONL files.

Claude Code stores sessions under ~/.claude/projects/<escaped-cwd>/<sessionId>.jsonl.
Each line is a JSON event. Assistant messages include a `message.usage` object with
token counts. We sum tokens across events inside a given time window and filter by
the project's cwd.
"""

from __future__ import annotations

import json
import os
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable


def escape_cwd(cwd: str) -> str:
    """Convert /Users/foo/bar into -Users-foo-bar (Claude Code convention)."""
    return cwd.replace("/", "-")


def claude_projects_dir() -> Path:
    return Path.home() / ".claude" / "projects"


def project_session_files(cwd: str) -> list[Path]:
    escaped = escape_cwd(os.path.abspath(cwd))
    root = claude_projects_dir() / escaped
    if not root.exists():
        return []
    return sorted(root.glob("*.jsonl"))


@dataclass
class TokenUsage:
    input_tokens: int = 0
    output_tokens: int = 0
    cache_creation_input_tokens: int = 0
    cache_read_input_tokens: int = 0
    model: str = ""
    events: int = 0
    models_seen: set[str] = field(default_factory=set)

    def add(self, usage: dict, model: str = "") -> None:
        self.input_tokens += int(usage.get("input_tokens", 0) or 0)
        self.output_tokens += int(usage.get("output_tokens", 0) or 0)
        self.cache_creation_input_tokens += int(
            usage.get("cache_creation_input_tokens", 0) or 0
        )
        self.cache_read_input_tokens += int(
            usage.get("cache_read_input_tokens", 0) or 0
        )
        if model:
            self.models_seen.add(model)
            self.model = model
        self.events += 1

    def total(self) -> int:
        return (
            self.input_tokens
            + self.output_tokens
            + self.cache_creation_input_tokens
            + self.cache_read_input_tokens
        )

    def to_dict(self) -> dict:
        return {
            "input_tokens": self.input_tokens,
            "output_tokens": self.output_tokens,
            "cache_creation_input_tokens": self.cache_creation_input_tokens,
            "cache_read_input_tokens": self.cache_read_input_tokens,
            "total_tokens": self.total(),
            "events": self.events,
            "model": self.model or next(iter(self.models_seen), ""),
            "models_seen": sorted(self.models_seen),
        }


def _parse_ts(s: str) -> datetime | None:
    if not s:
        return None
    try:
        return datetime.fromisoformat(s.replace("Z", "+00:00"))
    except ValueError:
        return None


def iter_events(path: Path) -> Iterable[dict]:
    with path.open("r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                yield json.loads(line)
            except json.JSONDecodeError:
                continue


def usage_in_window(
    cwd: str,
    since: datetime | None,
    until: datetime | None = None,
) -> TokenUsage:
    """Sum Claude Code token usage for a project in a time window.

    `since` and `until` are timezone-aware datetimes. If `since` is None, counts
    from the beginning of all sessions. Useful for first-commit scenarios.
    """
    if until is None:
        until = datetime.now(timezone.utc)
    usage = TokenUsage()
    for session_file in project_session_files(cwd):
        for event in iter_events(session_file):
            ts = _parse_ts(event.get("timestamp", ""))
            if ts is None:
                continue
            if since is not None and ts <= since:
                continue
            if ts > until:
                continue
            message = event.get("message") or {}
            u = message.get("usage")
            if not u:
                continue
            model = message.get("model", "")
            usage.add(u, model=model)
    return usage


def last_event_timestamp(cwd: str) -> datetime | None:
    latest: datetime | None = None
    for session_file in project_session_files(cwd):
        for event in iter_events(session_file):
            ts = _parse_ts(event.get("timestamp", ""))
            if ts and (latest is None or ts > latest):
                latest = ts
    return latest
