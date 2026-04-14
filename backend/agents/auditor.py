"""
Code Quality Auditor agent — reads actual PR diffs against the project profile
and assesses both code quality and real impact on the codebase.
Streamed output (Sonnet).
"""
from typing import AsyncGenerator
from agents.utils import client


AUDITOR_PROMPT = """You are a principal engineer auditing a contributor's actual code changes
against the project they landed in. You have real diffs (not just counts) and a project profile
that tells you which directories are critical vs peripheral.

Assess two things, in this order:

1) CODE QUALITY (from the diffs themselves):
   - Readability, naming, abstraction level
   - Smells: duplicated logic, dead code, over-engineering, missing edge cases
   - Test changes present / absent where they should be
   - Does the change look like it solves the right problem, or just patches symptoms?

2) REAL IMPACT on this project:
   - Did they touch the critical paths, or only peripheral/config files?
   - Was the change load-bearing for a user-visible feature, or cosmetic?
   - Scope relative to project size

Be concrete: cite file paths from the diff, quote short snippets, name the PR number.
Keep it 3–5 short paragraphs. No preamble, start with the assessment directly."""


def _format_audit_context(engineer: dict, project_summary: dict) -> str:
    prs = engineer.get("notable_prs", []) or []
    pr_blocks: list[str] = []
    for pr in prs[:3]:  # cap diffs we send to the model
        diff = (pr.get("diff_snippet") or "").strip()
        if not diff:
            continue
        pr_blocks.append(
            f"PR #{pr['number']} — {pr.get('title', '')} "
            f"(+{pr.get('additions', 0)}/-{pr.get('deletions', 0)}, {pr.get('files_changed', 0)} files)\n"
            f"Files: {', '.join((pr.get('files_sample') or [])[:6])}\n"
            f"{diff}"
        )

    touched = engineer.get("top_dirs_touched", []) or []
    touched_line = ", ".join(f"{d['name']}/ ({d['file_count']})" for d in touched[:8]) or "(unknown)"

    critical = ", ".join(project_summary.get("critical_paths", []) or []) or "(unknown)"
    peripheral = ", ".join(project_summary.get("peripheral_paths", []) or []) or "(unknown)"
    stack = ", ".join(project_summary.get("stack", []) or []) or "(unknown)"

    return f"""=== PROJECT PROFILE ===
{project_summary.get('full_name', '')} — {project_summary.get('size_signal', '')}
Stack: {stack}
Critical paths: {critical}
Peripheral paths: {peripheral}
Summary: {project_summary.get('summary', '')}

=== CONTRIBUTOR ===
Name: {engineer.get('name', '')}
PRs merged: {engineer.get('summary', {}).get('prs_merged', 0)} of {engineer.get('summary', {}).get('prs_opened', 0)} opened
Top directories they touched: {touched_line}

=== REAL DIFFS (sampled) ===
{chr(10).join(pr_blocks) if pr_blocks else '(No diff data available — note this absence in the audit.)'}"""


async def run_code_auditor(
    engineer: dict,
    project_summary: dict | None,
) -> AsyncGenerator[str, None]:
    if not project_summary:
        project_summary = {}

    context = _format_audit_context(engineer, project_summary)
    prompt = (
        f"Audit {engineer.get('name', 'this contributor')}'s actual code against "
        f"{project_summary.get('full_name') or 'the project'}. Be concrete and cite the diffs.\n\n"
        f"{context}"
    )

    async with client.messages.stream(
        model="claude-sonnet-4-6",
        max_tokens=800,
        system=AUDITOR_PROMPT,
        messages=[{"role": "user", "content": prompt}],
    ) as stream:
        async for text in stream.text_stream:
            if text:
                yield text
