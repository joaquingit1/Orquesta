# codemetrics — agent

Local agent that hooks into git and streams commit + Claude Code usage data to the
codemetrics backend.

## Install

```bash
cd agent
pip install -e .
```

## Use

Inside any git repo:

```bash
codemetrics init --backend http://localhost:8000 --email you@company.com
```

From now on, every `git commit` will:

1. Read your Claude Code sessions for that repo (`~/.claude/projects/<cwd>/*.jsonl`)
2. Sum tokens used since the previous commit
3. Capture the diff + commit metadata
4. POST to the backend

Run `codemetrics status` to verify. Use `codemetrics hook` to trigger manually.
