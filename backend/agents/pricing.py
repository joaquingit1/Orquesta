"""Per-model pricing for Anthropic API — used to compute real review cost."""

# USD per 1M tokens (Anthropic public list pricing).
_MODEL_PRICING: dict[str, dict[str, float]] = {
    "claude-sonnet-4-6": {
        "input": 3.0,
        "output": 15.0,
        "cache_write": 3.75,
        "cache_read": 0.30,
    },
    "claude-opus-4-6": {
        "input": 15.0,
        "output": 75.0,
        "cache_write": 18.75,
        "cache_read": 1.50,
    },
}

# Reasonable defaults if an unknown model name shows up.
_DEFAULT_PRICING = {"input": 3.0, "output": 15.0, "cache_write": 3.75, "cache_read": 0.30}


def compute_cost_usd(model: str, usage) -> float:
    """Given a model name and an SDK usage object (or dict), return USD cost.

    Tolerant of either SDK objects (attribute access) or dicts — some code
    paths normalize before calling.
    """
    rates = _MODEL_PRICING.get(model, _DEFAULT_PRICING)

    def _get(key: str) -> int:
        if usage is None:
            return 0
        if isinstance(usage, dict):
            return int(usage.get(key) or 0)
        return int(getattr(usage, key, 0) or 0)

    in_tok = _get("input_tokens")
    out_tok = _get("output_tokens")
    cache_write = _get("cache_creation_input_tokens")
    cache_read = _get("cache_read_input_tokens")

    total = (
        in_tok * rates["input"]
        + out_tok * rates["output"]
        + cache_write * rates["cache_write"]
        + cache_read * rates["cache_read"]
    ) / 1_000_000.0
    return total


def usage_to_dict(usage) -> dict:
    """Normalize an SDK usage object into a plain dict."""
    if usage is None:
        return {"input_tokens": 0, "output_tokens": 0, "cache_creation_input_tokens": 0, "cache_read_input_tokens": 0}
    if isinstance(usage, dict):
        return {
            "input_tokens": int(usage.get("input_tokens") or 0),
            "output_tokens": int(usage.get("output_tokens") or 0),
            "cache_creation_input_tokens": int(usage.get("cache_creation_input_tokens") or 0),
            "cache_read_input_tokens": int(usage.get("cache_read_input_tokens") or 0),
        }
    return {
        "input_tokens": int(getattr(usage, "input_tokens", 0) or 0),
        "output_tokens": int(getattr(usage, "output_tokens", 0) or 0),
        "cache_creation_input_tokens": int(getattr(usage, "cache_creation_input_tokens", 0) or 0),
        "cache_read_input_tokens": int(getattr(usage, "cache_read_input_tokens", 0) or 0),
    }
