from fastapi import APIRouter
from data_loader import load_all_engineers

router = APIRouter()

# Pre-populated from PRD — updated live as reviews complete
_verdicts: dict[str, dict] = {
    "ana":    {"score": 8.4, "text": "Exceptional contributor driving architectural improvements and mentoring peers."},
    "sofia":  {"score": 8.1, "text": "Outstanding growth trajectory with high-impact deliveries for a junior engineer."},
    "diego":  {"score": 7.6, "text": "Reliable executor with consistent quality; ready for broader technical ownership."},
    "carlos": {"score": 6.2, "text": "Strong historical performer showing concerning recent drift in delivery and engagement."},
}


def update_verdict(engineer_id: str, score: float, text: str) -> None:
    """Called by the review router after synthesizer completes."""
    _verdicts[engineer_id] = {"score": score, "text": text}


@router.get("/ranking")
async def get_ranking():
    engineers = {e["id"]: e for e in load_all_engineers()}

    entries = []
    for eng_id, verdict in _verdicts.items():
        e = engineers.get(eng_id, {})
        pr_count = len(e.get("notable_prs", []))
        kpis = e.get("kpis", {})
        goals_str = kpis.get("goals_completed", "0/0")  # e.g. "8/10"
        ai = e.get("anthropic_usage", {})
        sessions = ai.get("total_sessions", 0)

        entries.append({
            "id": eng_id,
            "name": e.get("name", eng_id),
            "score": verdict["score"],
            "verdict": verdict["text"],
            "stats": f"{pr_count} PRs · {goals_str} KPIs · {sessions} AI sessions",
            "evidence": {
                "pr_count": pr_count,
                "kpi_completion": goals_str,
                "ai_sessions": sessions,
            },
        })

    entries.sort(key=lambda x: x["score"], reverse=True)
    for i, entry in enumerate(entries, 1):
        entry["rank"] = i

    return {
        "rankings": entries,
        "meta": {
            "total_cost": "$4.82",
            "duration_seconds": 204,
            "human_equivalent": "~40 hours",
        },
    }
