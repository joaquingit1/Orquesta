"""
Advocate agent — Claude Sonnet, argues FOR the engineer.
"""
from typing import AsyncGenerator
from agents.utils import client, format_engineer_context

ADVOCATE_PROMPT = """You are the Advocate in a structured performance review debate.
Your sole job: make the STRONGEST possible case FOR this engineer based on the data.
Rules:
- Cite specifics: PR numbers, exact metrics, measurable outcomes
- 2-3 sentences per argument, no fluff
- Start arguing immediately — no preamble, no "I'll argue that..."
- Focus on impact, initiative, and growth signals"""


async def run_advocate(engineer: dict, is_reply: bool = False) -> AsyncGenerator[str, None]:
    """Stream the advocate's argument for the engineer."""
    context = format_engineer_context(engineer)

    if is_reply:
        user_msg = (
            f"The challenger raised concerns. Now respond — defend {engineer['name']} "
            f"against those specific criticisms. Be concrete.\n\n{context}"
        )
    else:
        user_msg = (
            f"Make the strongest case FOR {engineer['name']} based on this data.\n\n{context}"
        )

    async with client.messages.stream(
        model="claude-sonnet-4-6",
        max_tokens=400,
        system=ADVOCATE_PROMPT,
        messages=[{"role": "user", "content": user_msg}],
    ) as stream:
        async for text in stream.text_stream:
            if text:
                yield text
