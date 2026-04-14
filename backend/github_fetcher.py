"""
GitHub fetcher — pulls public repo data and transforms it into engineer
profiles compatible with the existing multi-agent review pipeline.
"""
import asyncio
from typing import Optional
import httpx

GITHUB_API = "https://api.github.com"


def _headers(token: Optional[str]) -> dict:
    h = {
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }
    if token:
        h["Authorization"] = f"Bearer {token}"
    return h


async def _get(client: httpx.AsyncClient, path: str, params: dict = None) -> dict | list:
    r = await client.get(f"{GITHUB_API}{path}", params=params)
    r.raise_for_status()
    return r.json()


async def _safe_get(client: httpx.AsyncClient, path: str, params: dict = None) -> dict | list:
    try:
        r = await client.get(f"{GITHUB_API}{path}", params=params)
        if r.status_code == 200:
            return r.json()
        return {}
    except Exception:
        return {}


async def _get_commit_stats(client: httpx.AsyncClient, owner: str, repo: str) -> list:
    """Commit stats endpoint returns 202 while computing — retry a few times."""
    for _ in range(4):
        r = await client.get(f"{GITHUB_API}/repos/{owner}/{repo}/stats/contributors")
        if r.status_code == 200:
            data = r.json()
            return data if isinstance(data, list) else []
        if r.status_code == 202:
            await asyncio.sleep(2)
            continue
        return []
    return []


async def fetch_repo_engineers(
    owner: str,
    repo: str,
    token: Optional[str] = None,
    max_contributors: int = 8,
) -> list[dict]:
    async with httpx.AsyncClient(headers=_headers(token), timeout=30.0, follow_redirects=True) as client:
        # Wave 1: repo info, contributors, commit stats — all concurrent
        repo_info, raw_contributors, commit_stats = await asyncio.gather(
            _get(client, f"/repos/{owner}/{repo}"),
            _get(client, f"/repos/{owner}/{repo}/contributors", {"per_page": max_contributors + 5}),
            _get_commit_stats(client, owner, repo),
        )

        # Filter bots, cap at max_contributors
        contributors = [
            c for c in (raw_contributors if isinstance(raw_contributors, list) else [])
            if "[bot]" not in c.get("login", "")
        ][:max_contributors]

        if not contributors:
            return []

        # Wave 2: PR list + user display names — concurrent
        pr_list_raw, *user_profile_results = await asyncio.gather(
            _get(client, f"/repos/{owner}/{repo}/pulls", {
                "state": "all", "per_page": 100, "sort": "updated", "direction": "desc",
            }),
            *[_safe_get(client, f"/users/{c['login']}") for c in contributors],
        )

        all_prs = pr_list_raw if isinstance(pr_list_raw, list) else []
        user_profiles = {
            contributors[i]["login"]: user_profile_results[i]
            for i in range(len(contributors))
            if isinstance(user_profile_results[i], dict)
        }

        # Build maps
        commit_stats_map: dict[str, dict] = {}
        if isinstance(commit_stats, list):
            for stat in commit_stats:
                login = (stat.get("author") or {}).get("login", "")
                if login:
                    commit_stats_map[login] = stat

        prs_by_author: dict[str, list] = {}
        for pr in all_prs:
            login = (pr.get("user") or {}).get("login", "")
            if login:
                prs_by_author.setdefault(login, []).append(pr)

        # Wave 3: individual PR details for top merged PRs + review data + recent commits — concurrent
        detail_tasks = []
        detail_keys: list[int] = []  # pr numbers
        review_tasks = []
        review_keys: list[int] = []  # pr numbers

        # Top 3 merged PRs per contributor (by engagement)
        top_pr_numbers: set[int] = set()
        for c in contributors:
            merged = [p for p in prs_by_author.get(c["login"], []) if p.get("merged_at")]
            top = sorted(merged, key=lambda p: p.get("review_comments", 0) + p.get("comments", 0), reverse=True)[:3]
            for pr in top:
                if pr["number"] not in top_pr_numbers:
                    top_pr_numbers.add(pr["number"])
                    detail_keys.append(pr["number"])
                    detail_tasks.append(_safe_get(client, f"/repos/{owner}/{repo}/pulls/{pr['number']}"))

        # Reviews on up to 15 most recent PRs
        for pr in all_prs[:15]:
            review_keys.append(pr["number"])
            review_tasks.append(_safe_get(client, f"/repos/{owner}/{repo}/pulls/{pr['number']}/reviews"))

        # Recent commits per contributor (last 8 authored on the default branch)
        commit_tasks = [
            _safe_get(client, f"/repos/{owner}/{repo}/commits", {"author": c["login"], "per_page": 8})
            for c in contributors
        ]

        wave3 = await asyncio.gather(*detail_tasks, *review_tasks, *commit_tasks)
        detail_results = wave3[:len(detail_tasks)]
        review_results = wave3[len(detail_tasks):len(detail_tasks) + len(review_tasks)]
        commits_results = wave3[len(detail_tasks) + len(review_tasks):]

        recent_commits_map: dict[str, list] = {}
        for c, commits_raw in zip(contributors, commits_results):
            if isinstance(commits_raw, list):
                recent_commits_map[c["login"]] = [
                    {
                        "sha": cm.get("sha", "")[:7],
                        "message": (cm.get("commit", {}).get("message", "") or "").split("\n")[0][:140],
                        "date": (cm.get("commit", {}).get("author", {}) or {}).get("date", ""),
                        "url": cm.get("html_url", ""),
                    }
                    for cm in commits_raw[:8]
                    if isinstance(cm, dict)
                ]

        # PR details map: number → full PR object
        pr_details: dict[int, dict] = {}
        for pr_num, detail in zip(detail_keys, detail_results):
            if isinstance(detail, dict) and detail.get("number"):
                pr_details[pr_num] = detail

        # Reviews given: reviewer login → list of review samples
        reviews_given: dict[str, list] = {}
        for pr_num, reviews_raw in zip(review_keys, review_results):
            if not isinstance(reviews_raw, list):
                continue
            pr_data = next((p for p in all_prs if p["number"] == pr_num), {})
            pr_author = (pr_data.get("user") or {}).get("login", "")
            pr_title = pr_data.get("title", "")
            for review in reviews_raw:
                reviewer = (review.get("user") or {}).get("login", "")
                body = review.get("body", "") or ""
                if reviewer and reviewer != pr_author and len(body) > 20:
                    reviews_given.setdefault(reviewer, []).append({
                        "pr_reviewed": f"#{pr_num}: {pr_title[:60]}",
                        "comment": body[:400],
                        "quality": _review_quality_label(review.get("state", "")),
                    })

        # Assemble engineer profiles
        engineers = []
        for c in contributors:
            login = c["login"]
            profile = user_profiles.get(login, {})
            engineer = _build_profile(
                login=login,
                display_name=(profile.get("name") or login) if isinstance(profile, dict) else login,
                repo_full_name=f"{owner}/{repo}",
                contrib=c,
                user_prs=prs_by_author.get(login, []),
                pr_details=pr_details,
                commit_stat=commit_stats_map.get(login, {}),
                reviews_given=reviews_given.get(login, []),
                recent_commits=recent_commits_map.get(login, []),
            )
            engineers.append(engineer)

        return engineers


def _review_quality_label(state: str) -> str:
    mapping = {
        "APPROVED": "positive — approved PR",
        "CHANGES_REQUESTED": "constructive — requested changes",
        "COMMENTED": "informational review comment",
    }
    return mapping.get(state.upper(), "review comment")


def _build_profile(
    login: str,
    display_name: str,
    repo_full_name: str,
    contrib: dict,
    user_prs: list,
    pr_details: dict[int, dict],
    commit_stat: dict,
    reviews_given: list,
    recent_commits: list,
) -> dict:
    total_commits = contrib.get("contributions", 0)
    weeks = commit_stat.get("weeks", []) or []

    # Additions/deletions totals from commit stats
    total_additions = sum(w.get("a", 0) for w in weeks)
    total_deletions = sum(w.get("d", 0) for w in weeks)

    # PR stats
    merged_prs = [p for p in user_prs if p.get("merged_at")]
    merge_rate = len(merged_prs) / len(user_prs) if user_prs else 0

    # Average PR size from detailed PRs we fetched
    sized_prs = [pr_details[p["number"]] for p in merged_prs if p["number"] in pr_details]
    if sized_prs:
        avg_pr_size = round(sum(p.get("additions", 0) + p.get("deletions", 0) for p in sized_prs) / len(sized_prs))
        avg_pr_size_str = f"{avg_pr_size} lines"
    else:
        avg_pr_size_str = "N/A"

    # Recent velocity (last 13 weeks ≈ one quarter)
    recent_weeks = weeks[-13:] if len(weeks) >= 13 else weeks
    recent_commits = sum(w.get("c", 0) for w in recent_weeks)
    avg_per_week = round(recent_commits / max(len(recent_weeks), 1), 1)

    # Notable PRs — top 5 merged by engagement, use detail data where available
    top_merged = sorted(merged_prs, key=lambda p: p.get("review_comments", 0) + p.get("comments", 0), reverse=True)[:5]
    notable_prs = []
    for pr in top_merged:
        detail = pr_details.get(pr["number"], pr)
        body = (detail.get("body") or "")[:200].strip()
        adds = detail.get("additions", 0)
        dels = detail.get("deletions", 0)
        files = detail.get("changed_files", detail.get("files_changed", 0))
        review_comments = detail.get("review_comments", 0)

        quality_signals = []
        if review_comments > 4:
            quality_signals.append("high review engagement")
        if adds > 500:
            quality_signals.append("large feature")
        if dels > adds:
            quality_signals.append("net simplification")
        if review_comments < 2 and adds > 0:
            quality_signals.append("clean merge")

        notable_prs.append({
            "number": pr["number"],
            "title": pr.get("title", ""),
            "description": body or f"PR in {repo_full_name}",
            "files_changed": files,
            "additions": adds,
            "deletions": dels,
            "review_comments": review_comments,
            "merged_at": pr.get("merged_at", ""),
            "quality_signals": quality_signals,
        })

    # Review samples — top 3 with meaningful bodies
    review_quality_samples = reviews_given[:3]

    # KPIs (proxy metrics from GitHub activity)
    goals_detail = [
        {
            "goal": "PR merge rate",
            "status": "completed" if merge_rate >= 0.7 else "missed",
            "impact": f"{merge_rate:.0%} of opened PRs merged ({len(merged_prs)}/{len(user_prs)})",
        },
        {
            "goal": "Code contribution volume",
            "status": "completed",
            "impact": f"+{total_additions:,} lines added, -{total_deletions:,} removed across {total_commits} commits",
        },
        {
            "goal": "Peer review participation",
            "status": "completed" if len(reviews_given) >= 5 else "partial",
            "impact": f"{len(reviews_given)} reviews given to teammates",
        },
    ]

    return {
        "id": login,
        "name": display_name,
        "role": "Contributor",
        "github": f"https://github.com/{login}",
        "salary": None,
        "tenure": None,
        "timezone": None,
        "summary": {
            "prs_opened": len(user_prs),
            "prs_merged": len(merged_prs),
            "commits": total_commits,
            "reviews_given": len(reviews_given),
            "avg_pr_size": avg_pr_size_str,
            "avg_review_turnaround": "N/A",
            "test_coverage_trend": "N/A",
            "ai_tool_sessions": "N/A",
            "ai_tool_adoption": "N/A",
        },
        "notable_prs": notable_prs,
        "recent_commits": recent_commits,
        "review_quality_samples": review_quality_samples,
        "kpis": {
            "sprint_velocity": f"avg {avg_per_week} commits/week (last quarter)",
            "goals_completed": f"{len(merged_prs)}/{len(user_prs)} PRs merged",
            "goals_detail": goals_detail,
        },
        "anthropic_usage": None,
    }
