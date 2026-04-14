"""In-memory session store for GitHub-imported engineer profiles."""
import uuid

# _sessions[session_id] = {"engineers": [...], "verdicts": {engineer_id: {score, text}}}
_sessions: dict[str, dict] = {}


def create_session(engineers: list[dict]) -> str:
    session_id = str(uuid.uuid4())[:8]
    _sessions[session_id] = {"engineers": engineers, "verdicts": {}}
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
