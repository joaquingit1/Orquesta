"""
Synthesizer agent — Claude Opus.
Produces the final score and verdict after the debate.
"""
import json
from agents.utils import client, format_engineer_context

SYNTHESIZER_PROMPT = """You are the final judge in a structured performance review.
You have: a CODE AUDIT with concrete observations about real diffs, an ADVOCATE argument FOR,
a CHALLENGER argument AGAINST, and the Advocate's REBUTTAL. You also have the engineer's
raw GitHub evidence (PR counts, commits, merge rate, directories touched).

Produce a balanced, evidence-driven verdict that integrates every source — especially the
Code Audit, which is grounded in the actual code, not just metric counts.

SCORE SCALE — use the full range, NEVER default to 7.0:
  9.0–10.0 : Exceptional — transformative impact, rare talent, consistently ships at scale
  8.0–8.9  : Strong — clearly above expectations, high performer, notable wins
  7.0–7.9  : Good — meets expectations reliably
  6.0–6.9  : Adequate — meaningful gaps, low volume or quality concerns
  5.0–5.9  : Concerning — significant underperformance
  Below 5.0: Critical — near-zero substantive impact

HARD CALIBRATION (non-negotiable):
- <3 merged PRs AND <15 commits → score MUST be ≤ 5.9
- 3–9 merged PRs, 15–50 commits, mostly peripheral paths → 6.0–6.9
- 10–29 merged PRs with evidence of core work → 7.0–7.9
- 30–79 merged PRs, touches critical paths, positive audit → 8.0–8.9
- 80+ merged PRs AND strong audit AND reviews-given ≥ 10 → 9.0+
- If the Code Audit flagged concrete quality issues, subtract 0.3–0.8
- If the Code Audit praised specific craftsmanship, add 0.2–0.5
- Every decimal must be intentional. NEVER output exactly 7.0 unless the evidence is genuinely middling. Default drift is FORBIDDEN.
- Two contributors with different evidence bases MUST receive different scores. If you feel pulled to 7.0, force yourself to pick 6.7 or 7.3 based on which way the evidence tilts.

VERDICT TEXT (one sentence):
- Cite at least one concrete number (PR count, commit count, or audit observation)
- No hedging language ("seems", "appears", "might")
- Do not describe the debate — describe the engineer

Output ONLY valid JSON, no markdown:
{"score": <float, one decimal>, "text": "<one crisp evidence-grounded sentence>"}"""


def _heuristic_score(engineer: dict) -> float:
    """Deterministic fallback used if the model returns unusable output.
    Designed to never hit exactly 7.0 unless evidence genuinely sits there."""
    summary = engineer.get("summary", {}) or {}
    merged = int(summary.get("prs_merged", 0) or 0)
    commits = int(summary.get("commits", 0) or 0)
    reviews = int(summary.get("reviews_given", 0) or 0)

    if merged < 3 and commits < 15:
        base = 4.8
    elif merged < 10:
        base = 6.2
    elif merged < 30:
        base = 7.3
    elif merged < 80:
        base = 8.3
    else:
        base = 9.1

    # nudge by review participation
    if reviews >= 10:
        base += 0.3
    elif reviews == 0:
        base -= 0.2

    # nudge by commit density
    if commits >= 200:
        base += 0.2

    return round(max(1.0, min(9.8, base)), 1)


async def run_synthesizer(
    engineer: dict,
    advocate_text: str = "",
    challenger_text: str = "",
    rebuttal_text: str = "",
    audit_text: str = "",
    project_summary: dict | None = None,
) -> dict:
    """Generate the final score and verdict. Returns a dict."""
    context = format_engineer_context(engineer, project_summary)
    debate = (
        "\n\n=== DEBATE TRANSCRIPT ===\n"
        f"CODE AUDIT (from real diffs):\n{audit_text.strip() or '(no audit produced)'}\n\n"
        f"ADVOCATE (for):\n{advocate_text.strip() or '(silent)'}\n\n"
        f"CHALLENGER (against):\n{challenger_text.strip() or '(silent)'}\n\n"
        f"ADVOCATE'S REBUTTAL:\n{rebuttal_text.strip() or '(silent)'}"
    )

    user_msg = (
        f"Produce the final verdict for {engineer['name']} ({engineer.get('id', '')}). "
        f"Do NOT default to 7.0. Apply the hard calibration rules against the GitHub evidence below, "
        f"then fine-tune with the audit and debate. Return JSON only.\n\n"
        f"{context}{debate}"
    )

    fallback_score = _heuristic_score(engineer)
    fallback_text = f"Evidence-based assessment: {engineer.get('summary', {}).get('prs_merged', 0)} merged PRs, {engineer.get('summary', {}).get('commits', 0)} commits."

    try:
        response = await client.messages.create(
            model="claude-opus-4-6",
            max_tokens=1024,
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
    except Exception as e:
        print(f"[synthesizer] API error for {engineer.get('id')}: {e}")
        return {"score": fallback_score, "text": fallback_text, "engineer_id": engineer["id"]}

    text_block = next((b for b in response.content if b.type == "text"), None)
    if text_block is None or not text_block.text:
        print(f"[synthesizer] {engineer.get('id')}: empty response, using heuristic {fallback_score}")
        return {"score": fallback_score, "text": fallback_text, "engineer_id": engineer["id"]}

    try:
        data = json.loads(text_block.text)
        score = round(float(data["score"]), 1)
        text = data["text"]
        # If the model still drifted to an uninformative 7.0 despite the prompt, override.
        if score == 7.0 and fallback_score != 7.0:
            print(f"[synthesizer] {engineer.get('id')}: model drifted to 7.0, overriding with heuristic {fallback_score}")
            score = fallback_score
        print(f"[synthesizer] {engineer.get('id')}: score={score}")
        return {"score": score, "text": text, "engineer_id": engineer["id"]}
    except (json.JSONDecodeError, KeyError, ValueError) as e:
        print(f"[synthesizer] {engineer.get('id')}: parse error {e}, using heuristic {fallback_score}")
        return {
            "score": fallback_score,
            "text": (text_block.text[:120] if text_block.text else fallback_text),
            "engineer_id": engineer["id"],
        }
