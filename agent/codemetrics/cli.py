"""codemetrics CLI: `codemetrics init`, `codemetrics hook`, `codemetrics status`."""

from __future__ import annotations

import argparse
import os
import stat
import sys
from pathlib import Path

from .config import load_config, save_config
from .git_utils import repo_root
from .hook import run as run_hook


HOOK_MARKER = "# codemetrics post-commit hook"
HOOK_SCRIPT = f"""#!/bin/sh
{HOOK_MARKER}
python3 -m codemetrics.hook >/dev/null 2>&1 || true
"""


def cmd_init(args: argparse.Namespace) -> int:
    cwd = Path.cwd()
    try:
        repo = repo_root(cwd)
    except Exception:
        print("error: not a git repository", file=sys.stderr)
        return 1

    cfg = load_config(repo)
    cfg["backend_url"] = args.backend or cfg.get("backend_url", "http://localhost:8000")
    cfg["user_email"] = args.email or cfg.get("user_email", "")
    cfg["project_id"] = args.project or cfg.get("project_id", repo.name)
    if args.token:
        cfg["token"] = args.token
    save_config(repo, cfg)

    hook_path = repo / ".git" / "hooks" / "post-commit"
    hook_path.parent.mkdir(parents=True, exist_ok=True)

    existing = hook_path.read_text() if hook_path.exists() else ""
    if HOOK_MARKER in existing:
        print(f"✓ hook already installed at {hook_path}")
    else:
        if existing.strip():
            new = existing.rstrip() + "\n\n" + HOOK_SCRIPT
        else:
            new = HOOK_SCRIPT
        hook_path.write_text(new)
        st = os.stat(hook_path)
        os.chmod(hook_path, st.st_mode | stat.S_IEXEC | stat.S_IXGRP | stat.S_IXOTH)
        print(f"✓ installed post-commit hook at {hook_path}")

    print(f"✓ config saved to {repo}/.codemetrics/config.json")
    print(f"  backend: {cfg['backend_url']}")
    print(f"  project: {cfg['project_id']}")
    print(f"  user:    {cfg.get('user_email') or '(uses commit author)'}")
    return 0


def cmd_hook(args: argparse.Namespace) -> int:
    return run_hook()


def cmd_status(args: argparse.Namespace) -> int:
    cwd = Path.cwd()
    try:
        repo = repo_root(cwd)
    except Exception:
        print("error: not a git repository", file=sys.stderr)
        return 1
    cfg = load_config(repo)
    if not cfg:
        print("codemetrics is not initialized in this repo. Run `codemetrics init`.")
        return 1
    print(f"repo:    {repo}")
    print(f"backend: {cfg.get('backend_url')}")
    print(f"project: {cfg.get('project_id')}")
    print(f"user:    {cfg.get('user_email') or '(commit author)'}")
    hook = repo / ".git" / "hooks" / "post-commit"
    installed = hook.exists() and HOOK_MARKER in hook.read_text()
    print(f"hook:    {'installed ✓' if installed else 'NOT installed ✗'}")
    return 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="codemetrics")
    sub = parser.add_subparsers(dest="cmd", required=True)

    p_init = sub.add_parser("init", help="Install post-commit hook in current repo")
    p_init.add_argument("--backend", help="Backend URL (default: http://localhost:8000)")
    p_init.add_argument("--email", help="User email (override commit author)")
    p_init.add_argument("--project", help="Project id (default: repo dir name)")
    p_init.add_argument("--token", help="Bearer token for backend auth")
    p_init.set_defaults(func=cmd_init)

    p_hook = sub.add_parser("hook", help="Run post-commit logic manually")
    p_hook.set_defaults(func=cmd_hook)

    p_status = sub.add_parser("status", help="Show current config")
    p_status.set_defaults(func=cmd_status)

    args = parser.parse_args(argv)
    return args.func(args)


if __name__ == "__main__":
    sys.exit(main())
