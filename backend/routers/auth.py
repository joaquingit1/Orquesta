"""GitHub OAuth flow + authenticated user endpoints."""
import os
from urllib.parse import urlencode

import httpx
from fastapi import APIRouter, Cookie, HTTPException, Request
from fastapi.responses import JSONResponse, RedirectResponse

from auth_store import (
    consume_state,
    create_auth_session,
    destroy_auth_session,
    get_auth_session,
    new_state,
)

router = APIRouter()

GITHUB_AUTHORIZE_URL = "https://github.com/login/oauth/authorize"
GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token"
GITHUB_API = "https://api.github.com"

COOKIE_NAME = "orq_session"
COOKIE_MAX_AGE = 60 * 60 * 8       # 8 hours

# Scopes: public_repo is enough for public repo listing + analysis.
# Add 'repo' later if you want to analyze private repos.
OAUTH_SCOPE = "read:user public_repo"


def _config() -> dict:
    client_id = os.getenv("GITHUB_CLIENT_ID")
    client_secret = os.getenv("GITHUB_CLIENT_SECRET")
    redirect_uri = os.getenv(
        "GITHUB_REDIRECT_URI",
        "http://localhost:8000/api/auth/github/callback",
    )
    # FRONTEND_URL may be comma-separated (for CORS); use the first entry for the post-auth redirect.
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000").split(",")[0].strip()
    if not client_id or not client_secret:
        raise HTTPException(
            status_code=500,
            detail="GitHub OAuth not configured — set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET",
        )
    return {
        "client_id": client_id,
        "client_secret": client_secret,
        "redirect_uri": redirect_uri,
        "frontend_url": frontend_url,
    }


@router.get("/auth/github/login")
async def github_login():
    cfg = _config()
    state = new_state()
    params = {
        "client_id": cfg["client_id"],
        "redirect_uri": cfg["redirect_uri"],
        "scope": OAUTH_SCOPE,
        "state": state,
        "allow_signup": "true",
    }
    return RedirectResponse(f"{GITHUB_AUTHORIZE_URL}?{urlencode(params)}", status_code=302)


@router.get("/auth/github/callback")
async def github_callback(request: Request):
    cfg = _config()
    code = request.query_params.get("code")
    state = request.query_params.get("state")
    error = request.query_params.get("error")

    if error:
        return RedirectResponse(f"{cfg['frontend_url']}/?auth_error={error}", status_code=302)
    if not code or not state or not consume_state(state):
        raise HTTPException(status_code=400, detail="Invalid OAuth callback (missing or expired state)")

    async with httpx.AsyncClient(timeout=15.0) as client:
        token_resp = await client.post(
            GITHUB_TOKEN_URL,
            headers={"Accept": "application/json"},
            data={
                "client_id": cfg["client_id"],
                "client_secret": cfg["client_secret"],
                "code": code,
                "redirect_uri": cfg["redirect_uri"],
            },
        )
        token_resp.raise_for_status()
        token_data = token_resp.json()
        access_token = token_data.get("access_token")
        if not access_token:
            raise HTTPException(status_code=400, detail=f"GitHub did not return a token: {token_data}")

        user_resp = await client.get(
            f"{GITHUB_API}/user",
            headers={
                "Authorization": f"Bearer {access_token}",
                "Accept": "application/vnd.github+json",
            },
        )
        user_resp.raise_for_status()
        user = user_resp.json()

    sid = create_auth_session(
        access_token=access_token,
        user={
            "login": user.get("login"),
            "name": user.get("name") or user.get("login"),
            "avatar_url": user.get("avatar_url"),
        },
    )

    response = RedirectResponse(f"{cfg['frontend_url']}/?auth=ok", status_code=302)
    response.set_cookie(
        key=COOKIE_NAME,
        value=sid,
        max_age=COOKIE_MAX_AGE,
        httponly=True,
        samesite="lax",
        secure=os.getenv("COOKIE_SECURE", "false").lower() == "true",
        path="/",
    )
    return response


@router.post("/auth/logout")
async def logout(orq_session: str | None = Cookie(default=None)):
    destroy_auth_session(orq_session)
    response = JSONResponse({"ok": True})
    response.delete_cookie(COOKIE_NAME, path="/")
    return response


@router.get("/me")
async def me(orq_session: str | None = Cookie(default=None)):
    session = get_auth_session(orq_session)
    if not session:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return {"user": session["user"]}


@router.get("/me/repos")
async def list_my_repos(
    orq_session: str | None = Cookie(default=None),
    per_page: int = 30,
    sort: str = "pushed",
):
    session = get_auth_session(orq_session)
    if not session:
        raise HTTPException(status_code=401, detail="Not authenticated")

    headers = {
        "Authorization": f"Bearer {session['access_token']}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }
    params = {
        "per_page": min(per_page, 100),
        "sort": sort,
        "affiliation": "owner,collaborator,organization_member",
    }
    async with httpx.AsyncClient(timeout=15.0) as client:
        r = await client.get(f"{GITHUB_API}/user/repos", headers=headers, params=params)
        r.raise_for_status()
        repos = r.json()

    return {
        "repos": [
            {
                "full_name": r["full_name"],
                "name": r["name"],
                "private": r["private"],
                "description": r.get("description"),
                "language": r.get("language"),
                "stars": r.get("stargazers_count", 0),
                "pushed_at": r.get("pushed_at"),
                "default_branch": r.get("default_branch"),
            }
            for r in repos
        ]
    }
