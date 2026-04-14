"""
Synthesizer agent — Claude Opus with adaptive thinking.
Produces the final score and verdict after the debate.
"""
import json
from agents.utils import client, format_engineer_context

SYNTHESIZER_PROMPT = """You are the final judge in a structured performance review.
You have heard advocates and challengers debate this engineer's performance.
Produce a balanced, data-driven verdict.

Score scale:
9.0–10.0 : Exceptional — transformative impact, rare talent
8.0–8.9  : Strong — clearly above expectations, high performer
7.0–7.9  : Good — meets expectations well, reliable contributor
6.0–6.9  : Adequate — some meaningful gaps, needs targeted improvement
5.0–5.9  : Concerning — significant underperformance, active support needed
Below 5.0: Critical — urgent intervention required

Output ONLY valid JSON. No markdown, no explanation outside the JSON:
{"score": <float 0-10, one decimal>, "text": "<one crisp sentence verdict>"}"""


async def run_synthesizer(engineer: dict) -> dict:
    """Generate the final score and verdict. Returns a dict."""
    context = format_engineer_context(engineer)
    user_msg = (
        f"Produce the final verdict for {engineer['name']}. "
        f"Consider all the evidence: their metrics, PR quality, review contributions, "
        f"KPI delivery, and AI tool adoption.\n\n{context}"
    )

    response = await client.messages.create(
        model="claude-opus-4-6",
        max_tokens=200,
        thinking={"type": "adaptive"},
        system=SYNTHESIZER_PROMPT,
        messages=[{"role": "user", "content": user_msg}],
        output_config={
            "format": {
                "type": "json_schema",
                "schema": {
                    "type": "object",
                    "properties": {
                        "score": {"type": "number"},
                        "text": {"type": "string"},
                    },
                    "required": ["score", "text"],
                    "additionalProperties": False,
                },
            }
        },
    )

    text_block = next((b for b in response.content if b.type == "text"), None)
    if text_block is None:
        return {"score": 7.0, "text": "Review complete.", "engineer_id": engineer["id"]}

    try:
        data = json.loads(text_block.text)
        return {
            "score": round(float(data["score"]), 1),
            "text": data["text"],
            "engineer_id": engineer["id"],
        }
    except (json.JSONDecodeError, KeyError, ValueError):
        return {"score": 7.0, "text": text_block.text[:120], "engineer_id": engineer["id"]}
