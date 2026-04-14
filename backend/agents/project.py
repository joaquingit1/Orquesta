"""
Project Analyst agent — runs once per repo import.
Reads README, languages, and top directories to produce a concise
project summary that is reused as context for every per-contributor review.
"""
import json
from agents.utils import client

PROJECT_ANALYST_PROMPT = """You are a senior staff engineer quickly briefing a review board
on an unfamiliar codebase so they can evaluate individual contributors in context.

Given the repo's README, primary languages, and top-level directory layout,
produce a short, concrete profile. Avoid hype — be technical and specific.

Identify:
- What the project is and who it serves
- Stack / frameworks / runtime (infer from languages + tree)
- Which directories represent the critical code paths (the "core" a contributor's
  impact should be measured against vs peripheral/config files)
- Size signal: rough sense of project scope (hobby, serious, mature)

Output ONLY valid JSON matching the provided schema. No markdown, no commentary."""


def _format_project_context(ctx: dict) -> str:
    langs = ctx.get("languages", {}) or {}
    total = sum(langs.values()) or 1
    lang_lines = [
        f"  {name}: {round(bytes_count / total * 100, 1)}%"
        for name, bytes_count in sorted(langs.items(), key=lambda kv: -kv[1])[:8]
    ]
    top_dirs = ctx.get("top_dirs", []) or []
    dir_lines = [f"  {d['name']}/ — {d['file_count']} files" for d in top_dirs]
    readme = (ctx.get("readme_snippet") or "").strip()

    return f"""REPO: {ctx.get('full_name', '')}
DESCRIPTION: {ctx.get('description') or '(none)'}
STARS: {ctx.get('stars', 0)}
PRIMARY LANGUAGE: {ctx.get('primary_language') or 'unknown'}
TOTAL TRACKED FILES: {ctx.get('total_files', 0)}

LANGUAGE BREAKDOWN (% of code bytes):
{chr(10).join(lang_lines) if lang_lines else '  (unknown)'}

TOP-LEVEL DIRECTORIES (by file count):
{chr(10).join(dir_lines) if dir_lines else '  (unknown)'}

README (truncated):
{readme[:3500] if readme else '(no README available)'}"""


async def run_project_analyst(project_context: dict, session_id: str | None = None) -> dict:
    """Returns a project summary dict used as context for every contributor review."""
    from session_store import record_usage

    if not project_context:
        return _fallback(project_context)

    context_text = _format_project_context(project_context)
    user_msg = (
        "Produce the project profile as JSON. The reviewers need to know where "
        "real impact lives in this codebase vs boilerplate.\n\n" + context_text
    )

    model = "claude-sonnet-4-6"
    try:
        response = await client.messages.create(
            model=model,
            max_tokens=800,
            system=PROJECT_ANALYST_PROMPT,
            messages=[{"role": "user", "content": user_msg}],
            output_config={
                "format": {
                    "type": "json_schema",
                    "schema": {
                        "type": "object",
                        "properties": {
                            "summary": {"type": "string"},
                            "stack": {"type": "array", "items": {"type": "string"}},
                            "critical_paths": {"type": "array", "items": {"type": "string"}},
                            "peripheral_paths": {"type": "array", "items": {"type": "string"}},
                            "size_signal": {"type": "string"},
                        },
                        "required": ["summary", "stack", "critical_paths", "size_signal"],
                        "additionalProperties": False,
                    },
                }
            },
        )
    except Exception:
        return _fallback(project_context)

    record_usage(session_id, model, getattr(response, "usage", None))

    text_block = next((b for b in response.content if b.type == "text"), None)
    if text_block is None:
        return _fallback(project_context)

    try:
        data = json.loads(text_block.text)
        return {
            "summary": data.get("summary", "")[:800],
            "stack": data.get("stack", [])[:10],
            "critical_paths": data.get("critical_paths", [])[:10],
            "peripheral_paths": data.get("peripheral_paths", [])[:10],
            "size_signal": data.get("size_signal", ""),
            "full_name": project_context.get("full_name", ""),
            "primary_language": project_context.get("primary_language"),
            "stars": project_context.get("stars", 0),
            "total_files": project_context.get("total_files", 0),
        }
    except (json.JSONDecodeError, KeyError, ValueError):
        return _fallback(project_context)


def _fallback(project_context: dict) -> dict:
    ctx = project_context or {}
    top = [d["name"] for d in (ctx.get("top_dirs") or [])[:5]]
    return {
        "summary": ctx.get("description") or "Repository profile unavailable.",
        "stack": [ctx.get("primary_language")] if ctx.get("primary_language") else [],
        "critical_paths": top,
        "peripheral_paths": [],
        "size_signal": "unknown",
        "full_name": ctx.get("full_name", ""),
        "primary_language": ctx.get("primary_language"),
        "stars": ctx.get("stars", 0),
        "total_files": ctx.get("total_files", 0),
    }
