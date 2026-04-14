"""
Challenger agent — Claude Sonnet, argues AGAINST the engineer.
"""
from typing import AsyncGenerator
from agents.utils import client, format_engineer_context

CHALLENGER_PROMPT = """You are the Challenger in a structured performance review debate.
Your sole job: identify the most significant CONCERNS about this engineer's performance.
Rules:
- Ground every concern in the data — no speculation
- 2-3 sentences per argument, be direct
- Start immediately — no preamble
- Focus on patterns and trajectory, not isolated incidents
- Be fair but honest: don't exaggerate, but don't soft-pedal real issues"""


async def run_challenger(engineer: dict) -> AsyncGenerator[str, None]:
    """Stream the challenger's critique of the engineer."""
    context = format_engineer_context(engineer)
    user_msg = (
        f"Identify the most significant performance concerns for {engineer['name']} "
        f"based on this data.\n\n{context}"
    )

    async with client.messages.stream(
        model="claude-sonnet-4-6",
        max_tokens=400,
        system=CHALLENGER_PROMPT,
        messages=[{"role": "user", "content": user_msg}],
    ) as stream:
        async for text in stream.text_stream:
            if text:
                yield text
