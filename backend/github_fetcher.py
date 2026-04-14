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


async def _get_all_commits_paginated(
    client: httpx.AsyncClient,
    owner: str,
    repo: str,
    author_login: str | None = None,
    max_pages: int = 50,
) -> list:
    """Paginate through /repos/{owner}/{repo}/commits until exhausted.
    max_pages=50 caps at ~5,000 commits per contributor — plenty for any human engineer."""
    all_commits: list = []
    page = 1
    while page <= max_pages:
        params: dict = {"per_page": 100, "page": page}
        if author_login:
            params["author"] = author_login
        try:
            r = await client.get(f"{GITHUB_API}/repos/{owner}/{repo}/commits", params=params)
        except Exception:
            break
        if r.status_code != 200:
            break
        batch = r.json()
        if not isinstance(batch, list) or not batch:
            break
        all_commits.extend(batch)
        if len(batch) < 100:
            break
        page += 1
    return all_commits


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


async def fetch_project_context(
    owner: str,
    repo: str,
    token: Optional[str] = None,
) -> dict:
    """Pulls repo-level data used to orient the review against the actual project."""
    async with httpx.AsyncClient(headers=_headers(token), timeout=30.0, follow_redirects=True) as client:
        repo_info, languages, readme, tree = await asyncio.gather(
            _safe_get(client, f"/repos/{owner}/{repo}"),
            _safe_get(client, f"/repos/{owner}/{repo}/languages"),
            _safe_get(client, f"/repos/{owner}/{repo}/readme"),
            _safe_get(client, f"/repos/{owner}/{repo}/git/trees/HEAD", {"recursive": "1"}),
        )

    readme_text = ""
    if isinstance(readme, dict):
        import base64
        raw = readme.get("content", "") or ""
        try:
            readme_text = base64.b64decode(raw).decode("utf-8", errors="ignore")[:4000]
        except Exception:
            readme_text = ""

    top_dirs: dict[str, int] = {}
    all_files: list[str] = []
    if isinstance(tree, dict):
        for item in (tree.get("tree") or [])[:2000]:
            path = item.get("path", "") or ""
            if item.get("type") == "blob":
                all_files.append(path)
                top = path.split("/", 1)[0]
                if top:
                    top_dirs[top] = top_dirs.get(top, 0) + 1

    top_dir_list = sorted(top_dirs.items(), key=lambda kv: -kv[1])[:10]

    return {
        "owner": owner,
        "repo": repo,
        "full_name": f"{owner}/{repo}",
        "description": (repo_info or {}).get("description", "") if isinstance(repo_info, dict) else "",
        "stars": (repo_info or {}).get("stargazers_count", 0) if isinstance(repo_info, dict) else 0,
        "primary_language": (repo_info or {}).get("language") if isinstance(repo_info, dict) else None,
        "languages": languages if isinstance(languages, dict) else {},
        "readme_snippet": readme_text,
        "top_dirs": [{"name": n, "file_count": c} for n, c in top_dir_list],
        "total_files": len(all_files),
    }


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

        # Wave 3: individual PR details for top merged PRs + file diffs + review data + recent commits — concurrent
        detail_tasks = []
        detail_keys: list[int] = []  # pr numbers
        files_tasks = []
        files_keys: list[int] = []  # pr numbers
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
                    files_keys.append(pr["number"])
                    files_tasks.append(_safe_get(client, f"/repos/{owner}/{repo}/pulls/{pr['number']}/files", {"per_page": 30}))

        # Reviews on up to 15 most recent PRs
        for pr in all_prs[:15]:
            review_keys.append(pr["number"])
            review_tasks.append(_safe_get(client, f"/repos/{owner}/{repo}/pulls/{pr['number']}/reviews"))

        # ALL commits per contributor (paginated, no cap beyond the safety limit).
        # Also fetch a broad list of recent commits as a fallback when the
        # `?author=login` filter returns nothing (happens when a commit's author
        # email isn't linked to any GitHub account).
        commit_tasks = [
            _get_all_commits_paginated(client, owner, repo, author_login=c["login"])
            for c in contributors
        ]
        commit_tasks.append(_get_all_commits_paginated(client, owner, repo, author_login=None, max_pages=5))

        wave3 = await asyncio.gather(*detail_tasks, *files_tasks, *review_tasks, *commit_tasks)
        idx = 0
        detail_results = wave3[idx:idx + len(detail_tasks)]; idx += len(detail_tasks)
        files_results = wave3[idx:idx + len(files_tasks)]; idx += len(files_tasks)
        review_results = wave3[idx:idx + len(review_tasks)]; idx += len(review_tasks)
        commits_results = wave3[idx:idx + len(contributors)]; idx += len(contributors)
        global_commits = wave3[-1] if isinstance(wave3[-1], list) else []

        # Files per PR: number → list of {filename, additions, deletions, patch}
        pr_files_map: dict[int, list[dict]] = {}
        for pr_num, files_raw in zip(files_keys, files_results):
            if isinstance(files_raw, list):
                pr_files_map[pr_num] = [f for f in files_raw if isinstance(f, dict)]

        def _shape_commit(cm: dict) -> dict:
            return {
                "sha": cm.get("sha", "")[:7],
                "message": (cm.get("commit", {}).get("message", "") or "").split("\n")[0][:140],
                "date": (cm.get("commit", {}).get("author", {}) or {}).get("date", ""),
                "url": cm.get("html_url", ""),
            }

        recent_commits_map: dict[str, list] = {}
        for c, commits_raw in zip(contributors, commits_results):
            if isinstance(commits_raw, list) and commits_raw:
                recent_commits_map[c["login"]] = [
                    _shape_commit(cm) for cm in commits_raw if isinstance(cm, dict)
                ]

        # Fallback: for any contributor with no commits, scan the global list by
        # matching login / display name / email fragments from the commit author metadata.
        display_names = {
            c["login"]: (user_profiles.get(c["login"], {}) or {}).get("name") or c["login"]
            for c in contributors
        }
        for c in contributors:
            if recent_commits_map.get(c["login"]):
                continue
            login = c["login"]
            display_name = (display_names.get(login) or "").lower()
            login_lc = login.lower()
            matched: list[dict] = []
            for cm in global_commits:
                if not isinstance(cm, dict):
                    continue
                author_info = (cm.get("author") or {})
                commit_meta = cm.get("commit", {}) or {}
                commit_author = commit_meta.get("author", {}) or {}
                name = (commit_author.get("name") or "").lower()
                email = (commit_author.get("email") or "").lower()
                author_login = (author_info.get("login") or "").lower()
                email_local = email.split("@", 1)[0] if "@" in email else email
                if (
                    (author_login and author_login == login_lc)
                    or (display_name and name and display_name in name)
                    or (name and display_name and name in display_name)
                    or (login_lc and login_lc in email_local)
                    or (email_local and email_local in login_lc)
                ):
                    matched.append(_shape_commit(cm))
            if matched:
                recent_commits_map[login] = matched

        # Last-resort fallback: pull commits directly from the contributor's
        # merged PRs via /pulls/{n}/commits. Guaranteed to belong to them even
        # when the author email isn't linked to a GitHub account.
        pr_commit_tasks = []
        pr_commit_logins: list[str] = []
        for c in contributors:
            login = c["login"]
            if recent_commits_map.get(login):
                continue
            merged = [p for p in prs_by_author.get(login, []) if p.get("merged_at")]
            for pr in merged:  # every merged PR — no cap
                pr_commit_logins.append(login)
                pr_commit_tasks.append(
                    _safe_get(client, f"/repos/{owner}/{repo}/pulls/{pr['number']}/commits", {"per_page": 100})
                )
        if pr_commit_tasks:
            pr_commit_results = await asyncio.gather(*pr_commit_tasks)
            for login, result in zip(pr_commit_logins, pr_commit_results):
                if not isinstance(result, list) or not result:
                    continue
                existing = recent_commits_map.get(login, [])
                seen_shas = {c["sha"] for c in existing}
                for cm in result:
                    if not isinstance(cm, dict):
                        continue
                    shaped = _shape_commit(cm)
                    if shaped["sha"] and shaped["sha"] not in seen_shas:
                        existing.append(shaped)
                        seen_shas.add(shaped["sha"])
                if existing:
                    recent_commits_map[login] = existing

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
                pr_files=pr_files_map,
                commit_stat=commit_stats_map.get(login, {}),
                reviews_given=reviews_given.get(login, []),
                recent_commits=recent_commits_map.get(login, []),
            )
            engineers.append(engineer)

        return engineers


def _build_diff_snippet(files_list: list, max_files: int = 3, max_lines_per_file: int = 18) -> str:
    """Assemble a compact diff snippet from GitHub's /pulls/{n}/files response."""
    if not files_list:
        return ""
    parts: list[str] = []
    for f in files_list[:max_files]:
        if not isinstance(f, dict):
            continue
        filename = f.get("filename", "") or ""
        patch = f.get("patch", "") or ""
        if not patch:
            continue
        lines = patch.split("\n")[:max_lines_per_file]
        header = f"--- {filename} (+{f.get('additions', 0)}/-{f.get('deletions', 0)})"
        parts.append(header + "\n" + "\n".join(lines))
    return "\n\n".join(parts)[:2000]


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
    pr_files: dict[int, list],
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
    recent_commits_count = sum(w.get("c", 0) for w in recent_weeks)
    avg_per_week = round(recent_commits_count / max(len(recent_weeks), 1), 1)

    # Notable PRs — top 5 merged by engagement, use detail data where available
    top_merged = sorted(merged_prs, key=lambda p: p.get("review_comments", 0) + p.get("comments", 0), reverse=True)[:5]
    notable_prs = []
    top_dirs_touched: dict[str, int] = {}
    all_filenames: list[str] = []
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

        files_list = pr_files.get(pr["number"], []) or []
        diff_snippet = _build_diff_snippet(files_list)
        for f in files_list:
            fname = f.get("filename", "") or ""
            if not fname:
                continue
            all_filenames.append(fname)
            top = fname.split("/", 1)[0]
            if top:
                top_dirs_touched[top] = top_dirs_touched.get(top, 0) + 1

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
            "diff_snippet": diff_snippet,
            "files_sample": [f.get("filename", "") for f in files_list[:10]],
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
        "top_dirs_touched": [{"name": n, "file_count": c} for n, c in sorted(top_dirs_touched.items(), key=lambda kv: -kv[1])[:8]],
        "files_touched_sample": all_filenames[:30],
        "kpis": {
            "sprint_velocity": f"avg {avg_per_week} commits/week (last quarter)",
            "goals_completed": f"{len(merged_prs)}/{len(user_prs)} PRs merged",
            "goals_detail": goals_detail,
        },
        "anthropic_usage": None,
    }
