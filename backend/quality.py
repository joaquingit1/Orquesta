"""Claude-powered quality analysis.

Two entrypoints:
- analyze_diff: score a single commit's diff (fast)
- analyze_project: periodic global repo score (not wired by default)
"""

from __future__ import annotations

import json
import os
import re
from dataclasses import dataclass


SYSTEM = """You are a senior staff engineer reviewing a git diff.
Rate the change on a rubric and return STRICT JSON with this shape:

{
  "score": number from 1 to 10,
  "summary": "one concise sentence",
  "issues": [
    {"severity": "low|medium|high", "title": "...", "detail": "..."}
  ],
  "dimensions": {
    "clarity": 1-10,
    "correctness": 1-10,
    "security": 1-10,
    "maintainability": 1-10,
    "testing": 1-10
  }
}

Scoring guide:
- 9-10 excellent, idiomatic, clearly correct, well-tested.
- 7-8 solid, minor nits.
- 5-6 acceptable but with notable smells.
- 3-4 risky or hard-to-maintain changes.
- 1-2 broken, insecure, or clearly wrong.

Do not include any prose outside the JSON."""


@dataclass
class QualityResult:
    score: float
    summary: str
    issues: list[dict]
    dimensions: dict


def _fallback(summary: str = "quality analysis unavailable") -> QualityResult:
    return QualityResult(
        score=0.0,
        summary=summary,
        issues=[],
        dimensions={},
    )


def _extract_json(text: str) -> dict | None:
    m = re.search(r"\{.*\}", text, flags=re.S)
    if not m:
        return None
    try:
        return json.loads(m.group(0))
    except json.JSONDecodeError:
        return None


def analyze_diff(diff: str, model: str | None = None) -> QualityResult:
    if not diff or not diff.strip():
        return _fallback("empty diff")

    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        return _fallback("ANTHROPIC_API_KEY not set")

    try:
        from anthropic import Anthropic
    except ImportError:
        return _fallback("anthropic SDK not installed")

    client = Anthropic(api_key=api_key)
    model = model or os.getenv("QUALITY_MODEL", "claude-sonnet-4-6")

    truncated = diff[:60_000]
    try:
        resp = client.messages.create(
            model=model,
            max_tokens=1024,
            system=SYSTEM,
            messages=[{"role": "user", "content": f"```diff\n{truncated}\n```"}],
        )
    except Exception as e:
        return _fallback(f"claude api error: {e}")

    text_blocks = [b.text for b in resp.content if getattr(b, "type", "") == "text"]
    text = "\n".join(text_blocks).strip()
    data = _extract_json(text)
    if not data:
        return _fallback("could not parse model response")

    return QualityResult(
        score=float(data.get("score", 0) or 0),
        summary=str(data.get("summary", "")),
        issues=list(data.get("issues", []) or []),
        dimensions=dict(data.get("dimensions", {}) or {}),
    )
