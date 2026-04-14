"""In-memory session store for GitHub-imported engineer profiles."""
import uuid

from agents.pricing import compute_cost_usd, usage_to_dict

# _sessions[session_id] = {
#   "engineers": [...],
#   "verdicts": {engineer_id: {score, text}},
#   "project": {summary, stack, critical_paths, ...} | None,
#   "usage": {
#       "input_tokens": int, "output_tokens": int,
#       "cache_creation_input_tokens": int, "cache_read_input_tokens": int,
#       "cost_usd": float,
#       "calls": int,
#       "by_model": {model_name: {input_tokens, output_tokens, cost_usd, calls}},
#   },
#   "duration_seconds": float,
# }
_sessions: dict[str, dict] = {}


def _empty_usage() -> dict:
    return {
        "input_tokens": 0,
        "output_tokens": 0,
        "cache_creation_input_tokens": 0,
        "cache_read_input_tokens": 0,
        "cost_usd": 0.0,
        "calls": 0,
        "by_model": {},
    }


def create_session(engineers: list[dict], project: dict | None = None) -> str:
    session_id = str(uuid.uuid4())[:8]
    _sessions[session_id] = {
        "engineers": engineers,
        "verdicts": {},
        "project": project or None,
        "usage": _empty_usage(),
        "duration_seconds": 0.0,
    }
    return session_id


def get_engineers(session_id: str) -> list[dict] | None:
    session = _sessions.get(session_id)
    return session["engineers"] if session else None


def get_engineer(session_id: str, engineer_id: str) -> dict | None:
    engineers = get_engineers(session_id)
    if not engineers:
        return None
    return next((e for e in engineers if e["id"] == engineer_id), None)


def update_verdict(session_id: str, engineer_id: str, score: float, text: str) -> None:
    if session_id in _sessions:
        _sessions[session_id]["verdicts"][engineer_id] = {"score": score, "text": text}


def get_verdicts(session_id: str) -> dict:
    session = _sessions.get(session_id)
    return session["verdicts"] if session else {}


def get_project(session_id: str) -> dict | None:
    session = _sessions.get(session_id)
    return session.get("project") if session else None


def record_usage(session_id: str | None, model: str, usage) -> None:
    """Accumulate a single API call's usage into the session totals."""
    if not session_id or session_id not in _sessions:
        return
    norm = usage_to_dict(usage)
    cost = compute_cost_usd(model, norm)

    agg = _sessions[session_id].setdefault("usage", _empty_usage())
    agg["input_tokens"] += norm["input_tokens"]
    agg["output_tokens"] += norm["output_tokens"]
    agg["cache_creation_input_tokens"] += norm["cache_creation_input_tokens"]
    agg["cache_read_input_tokens"] += norm["cache_read_input_tokens"]
    agg["cost_usd"] += cost
    agg["calls"] += 1

    by_model = agg.setdefault("by_model", {})
    bucket = by_model.setdefault(model, {"input_tokens": 0, "output_tokens": 0, "cost_usd": 0.0, "calls": 0})
    bucket["input_tokens"] += norm["input_tokens"]
    bucket["output_tokens"] += norm["output_tokens"]
    bucket["cost_usd"] += cost
    bucket["calls"] += 1


def add_duration(session_id: str | None, seconds: float) -> None:
    if not session_id or session_id not in _sessions:
        return
    _sessions[session_id]["duration_seconds"] = _sessions[session_id].get("duration_seconds", 0.0) + max(0.0, seconds)


def get_meta(session_id: str) -> dict:
    session = _sessions.get(session_id)
    if not session:
        return {"usage": _empty_usage(), "duration_seconds": 0.0}
    return {
        "usage": session.get("usage") or _empty_usage(),
        "duration_seconds": session.get("duration_seconds", 0.0),
    }
