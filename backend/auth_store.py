"""In-memory store for GitHub OAuth sessions.

session_id (cookie value) → {access_token, user: {login, name, avatar_url}}
Separate from session_store.py which tracks analysis sessions.
"""
import secrets
import time

# _auth[sid] = {"access_token": str, "user": dict, "created_at": float}
_auth: dict[str, dict] = {}

# _states[state] = expiry_ts (short-lived CSRF tokens for OAuth handshake)
_states: dict[str, float] = {}

SESSION_TTL = 60 * 60 * 8           # 8 hours
STATE_TTL = 60 * 10                 # 10 minutes


def new_state() -> str:
    _prune_states()
    state = secrets.token_urlsafe(24)
    _states[state] = time.time() + STATE_TTL
    return state


def consume_state(state: str) -> bool:
    _prune_states()
    exp = _states.pop(state, None)
    return exp is not None and exp > time.time()


def create_auth_session(access_token: str, user: dict) -> str:
    _prune_sessions()
    sid = secrets.token_urlsafe(32)
    _auth[sid] = {
        "access_token": access_token,
        "user": user,
        "created_at": time.time(),
    }
    return sid


def get_auth_session(sid: str | None) -> dict | None:
    if not sid:
        return None
    session = _auth.get(sid)
    if not session:
        return None
    if time.time() - session["created_at"] > SESSION_TTL:
        _auth.pop(sid, None)
        return None
    return session


def destroy_auth_session(sid: str | None) -> None:
    if sid:
        _auth.pop(sid, None)


def _prune_states() -> None:
    now = time.time()
    for k in [k for k, exp in _states.items() if exp <= now]:
        _states.pop(k, None)


def _prune_sessions() -> None:
    now = time.time()
    for k in [k for k, s in _auth.items() if now - s["created_at"] > SESSION_TTL]:
        _auth.pop(k, None)
