import anthropic
import os

# Single shared async client for all agents
client = anthropic.AsyncAnthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))


def format_engineer_context(engineer: dict, project_summary: dict | None = None) -> str:
    """Build a rich text representation of an engineer's data for agent prompts."""
    prs = engineer.get("notable_prs", [])
    pr_lines = []
    for pr in prs:
        pr_lines.append(
            f"  PR #{pr['number']}: {pr['title']}\n"
            f"    +{pr.get('additions', 0)}/-{pr.get('deletions', 0)} lines, "
            f"{pr.get('files_changed', 0)} files changed\n"
            f"    Description: {pr.get('description', '')}\n"
            f"    Quality signals: {pr.get('quality_signals', [])}"
        )

    reviews = engineer.get("review_quality_samples", [])
    review_lines = [
        f"  {r['pr_reviewed']}\n"
        f"    Comment: \"{r['comment']}\"\n"
        f"    Assessment: {r['quality']}"
        for r in reviews
    ]

    kpis = engineer.get("kpis", {})
    goals = kpis.get("goals_detail", [])
    goal_lines = [
        f"  [{g['status'].upper()}] {g['goal']} — impact: {g.get('impact', 'N/A')}"
        for g in goals
    ]

    usage = engineer.get("anthropic_usage") or {}

    ai_section = (
        f"AI TOOL USAGE:\n"
        f"  Sessions: {usage.get('total_sessions', 0)} | Tokens used: {usage.get('total_tokens', '0')}\n"
        f"  Adoption rate: {usage.get('adoption_rate', 'N/A')}\n"
        f"  Use cases: {usage.get('use_cases', [])}\n"
        f"  Analyst note: {usage.get('quality_note', '')}"
        if usage else
        "AI TOOL USAGE:\n  Not applicable (GitHub public repo analysis)"
    )

    tenure = engineer.get("tenure") or "N/A"
    timezone = engineer.get("timezone") or "N/A"
    salary = engineer.get("salary") or "N/A"

    project_block = ""
    if project_summary:
        critical = ", ".join(project_summary.get("critical_paths", []) or []) or "(unknown)"
        stack = ", ".join(project_summary.get("stack", []) or []) or "(unknown)"
        touched = engineer.get("top_dirs_touched", []) or []
        touched_line = ", ".join(f"{d['name']}/" for d in touched[:6]) or "(none)"
        critical_set = {p.strip("/").split("/")[0] for p in (project_summary.get("critical_paths") or []) if p}
        touched_core = sum(d.get("file_count", 0) for d in touched if d.get("name") in critical_set)
        touched_total = sum(d.get("file_count", 0) for d in touched) or 1
        core_pct = round(100 * touched_core / touched_total)
        project_block = (
            f"PROJECT CONTEXT: {project_summary.get('full_name', '')} — {project_summary.get('size_signal', '')}\n"
            f"  Stack: {stack}\n"
            f"  Critical paths: {critical}\n"
            f"  Summary: {project_summary.get('summary', '')}\n"
            f"IMPACT: contributor's changes hit {core_pct}% core paths; "
            f"dirs touched: {touched_line}\n\n"
        )

    return project_block + f"""=== {engineer['name']} ({engineer['role']}) ===
Tenure: {tenure} | Timezone: {timezone} | Salary: {salary}

GITHUB ACTIVITY (this quarter):
  PRs opened: {engineer['summary']['prs_opened']} | Merged: {engineer['summary']['prs_merged']}
  Commits: {engineer['summary']['commits']}
  Reviews given to others: {engineer['summary']['reviews_given']}
  Avg PR size: {engineer['summary']['avg_pr_size']}
  Avg review turnaround: {engineer['summary']['avg_review_turnaround']}
  Test coverage trend: {engineer['summary']['test_coverage_trend']}
  AI tool sessions: {engineer['summary']['ai_tool_sessions']} ({engineer['summary']['ai_tool_adoption']} adoption rate)

NOTABLE PRs:
{chr(10).join(pr_lines) if pr_lines else '  (none)'}

CODE REVIEW QUALITY SAMPLES:
{chr(10).join(review_lines) if review_lines else '  (none)'}

SPRINT VELOCITY & KPIs:
  Velocity: {kpis.get('sprint_velocity', 'N/A')}
  Goals completed: {kpis.get('goals_completed', 'N/A')}
{chr(10).join(goal_lines)}

{ai_section}"""
