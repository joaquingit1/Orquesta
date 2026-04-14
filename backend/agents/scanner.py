"""
Scanner agent — reads through engineer data and narrates what it finds.
  run_scanner:      Claude Sonnet, quick surface-level narration
  run_scanner_deep: Claude Opus with adaptive thinking, yields thinking blocks
"""
from typing import AsyncGenerator
from agents.utils import client, format_engineer_context

SCANNER_PROMPT = """You are an AI analyst scanning through an engineer's performance data.
Narrate what you're reading — PR by PR, metric by metric — as if discovering it for the first time.
Be specific: cite PR numbers, exact percentages, commit counts.
Keep each observation to 1-2 sentences. Start reading immediately, no preamble."""

DEEP_SCAN_PROMPT = """Analyze this engineer's performance data deeply.
Look for non-obvious patterns: what does the trajectory say? What's the gap between potential and output?
What are the most important signals buried in this data that a manager might miss?"""


async def run_scanner(
    engineer: dict,
    project_summary: dict | None = None,
) -> AsyncGenerator[str, None]:
    """Surface scan — Sonnet narrates what it reads in the data."""
    context = format_engineer_context(engineer, project_summary)
    prompt = (
        f"Scan through {engineer['name']}'s performance data. "
        f"Narrate what you see as you read it.\n\n{context}"
    )

    async with client.messages.stream(
        model="claude-sonnet-4-6",
        max_tokens=500,
        system=SCANNER_PROMPT,
        messages=[{"role": "user", "content": prompt}],
    ) as stream:
        async for text in stream.text_stream:
            if text:
                yield text


async def run_scanner_deep(
    engineer: dict,
    project_summary: dict | None = None,
) -> AsyncGenerator[str, None]:
    """Deep analysis — Opus with adaptive thinking. Yields thinking block content."""
    context = format_engineer_context(engineer, project_summary)
    prompt = (
        f"{DEEP_SCAN_PROMPT}\n\n"
        f"Engineer under review: {engineer['name']}\n\n"
        f"{context}"
    )

    async with client.messages.stream(
        model="claude-opus-4-6",
        max_tokens=8000,
        thinking={"type": "adaptive"},
        messages=[{"role": "user", "content": prompt}],
    ) as stream:
        async for event in stream:
            if event.type == "content_block_delta":
                delta_type = getattr(event.delta, "type", None)
                if delta_type == "thinking_delta":
                    thinking = getattr(event.delta, "thinking", "")
                    if thinking:
                        yield thinking
                elif delta_type == "text_delta":
                    # Also yield analysis text from deep scan
                    text = getattr(event.delta, "text", "")
                    if text:
                        yield text
