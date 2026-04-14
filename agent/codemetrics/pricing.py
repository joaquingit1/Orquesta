"""Claude API pricing table (USD per 1M tokens).

Prices are approximate and shared between the agent (preview) and backend
(authoritative). Update here to change them project-wide.
"""

from __future__ import annotations

MODEL_PRICING = {
    "claude-opus-4-6": {
        "input": 15.0,
        "output": 75.0,
        "cache_write": 18.75,
        "cache_read": 1.5,
    },
    "claude-opus-4-5": {
        "input": 15.0,
        "output": 75.0,
        "cache_write": 18.75,
        "cache_read": 1.5,
    },
    "claude-sonnet-4-6": {
        "input": 3.0,
        "output": 15.0,
        "cache_write": 3.75,
        "cache_read": 0.3,
    },
    "claude-sonnet-4-5": {
        "input": 3.0,
        "output": 15.0,
        "cache_write": 3.75,
        "cache_read": 0.3,
    },
    "claude-haiku-4-5": {
        "input": 1.0,
        "output": 5.0,
        "cache_write": 1.25,
        "cache_read": 0.1,
    },
}

DEFAULT_PRICING = MODEL_PRICING["claude-sonnet-4-6"]


def pricing_for(model: str) -> dict:
    if not model:
        return DEFAULT_PRICING
    for key, price in MODEL_PRICING.items():
        if key in model:
            return price
    return DEFAULT_PRICING


def cost_usd(usage: dict, model: str = "") -> float:
    p = pricing_for(model)
    inp = usage.get("input_tokens", 0) or 0
    out = usage.get("output_tokens", 0) or 0
    cw = usage.get("cache_creation_input_tokens", 0) or 0
    cr = usage.get("cache_read_input_tokens", 0) or 0
    return (
        inp * p["input"]
        + out * p["output"]
        + cw * p["cache_write"]
        + cr * p["cache_read"]
    ) / 1_000_000.0
