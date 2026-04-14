"""Shared with agent — authoritative cost calculation on the backend."""

from __future__ import annotations

MODEL_PRICING = {
    "claude-opus-4-6": {"input": 15.0, "output": 75.0, "cache_write": 18.75, "cache_read": 1.5},
    "claude-opus-4-5": {"input": 15.0, "output": 75.0, "cache_write": 18.75, "cache_read": 1.5},
    "claude-sonnet-4-6": {"input": 3.0, "output": 15.0, "cache_write": 3.75, "cache_read": 0.3},
    "claude-sonnet-4-5": {"input": 3.0, "output": 15.0, "cache_write": 3.75, "cache_read": 0.3},
    "claude-haiku-4-5": {"input": 1.0, "output": 5.0, "cache_write": 1.25, "cache_read": 0.1},
}

DEFAULT = MODEL_PRICING["claude-sonnet-4-6"]


def pricing_for(model: str) -> dict:
    if not model:
        return DEFAULT
    for key, p in MODEL_PRICING.items():
        if key in model:
            return p
    return DEFAULT


def cost_usd(
    input_tokens: int,
    output_tokens: int,
    cache_creation_input_tokens: int,
    cache_read_input_tokens: int,
    model: str,
) -> float:
    p = pricing_for(model)
    return (
        input_tokens * p["input"]
        + output_tokens * p["output"]
        + cache_creation_input_tokens * p["cache_write"]
        + cache_read_input_tokens * p["cache_read"]
    ) / 1_000_000.0
