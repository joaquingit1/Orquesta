"""Config handling for codemetrics CLI. Stored at <repo>/.codemetrics/config.json."""

from __future__ import annotations

import json
from pathlib import Path


CONFIG_DIRNAME = ".codemetrics"
CONFIG_FILENAME = "config.json"
STATE_FILENAME = "state.json"


def config_dir(repo: Path) -> Path:
    return repo / CONFIG_DIRNAME


def config_path(repo: Path) -> Path:
    return config_dir(repo) / CONFIG_FILENAME


def state_path(repo: Path) -> Path:
    return config_dir(repo) / STATE_FILENAME


def load_config(repo: Path) -> dict:
    p = config_path(repo)
    if not p.exists():
        return {}
    return json.loads(p.read_text())


def save_config(repo: Path, cfg: dict) -> None:
    config_dir(repo).mkdir(parents=True, exist_ok=True)
    config_path(repo).write_text(json.dumps(cfg, indent=2))


def load_state(repo: Path) -> dict:
    p = state_path(repo)
    if not p.exists():
        return {}
    return json.loads(p.read_text())


def save_state(repo: Path, st: dict) -> None:
    config_dir(repo).mkdir(parents=True, exist_ok=True)
    state_path(repo).write_text(json.dumps(st, indent=2))
