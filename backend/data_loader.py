import json, pathlib

DATA_DIR = pathlib.Path(__file__).parent.parent / "data"

def load_engineer(engineer_id: str) -> dict:
    return json.loads((DATA_DIR / "engineers" / f"{engineer_id}.json").read_text())

def load_all_engineers() -> list[dict]:
    return [load_engineer(e) for e in ["ana", "diego", "carlos", "sofia"]]

def load_kpis() -> dict:
    return json.loads((DATA_DIR / "kpis.json").read_text())

def load_anthropic_usage() -> dict:
    return json.loads((DATA_DIR / "anthropic_usage.json").read_text())

def load_calendar() -> dict:
    return json.loads((DATA_DIR / "calendar.json").read_text())
