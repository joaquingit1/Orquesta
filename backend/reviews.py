"""Pre-written review content for each engineer, structured for streaming."""

REVIEWS = {
    "ana-oliveira": {
        "thinking": [
            "Ana opened 47 PRs this quarter with 44 merged — a 94% merge rate. Volume is high, but volume alone doesn't tell the story. Let me look at the actual code.",
            "PR #342: Auth middleware refactor. 12 files, +487/-891 lines. The deletion ratio is significant — she removed almost twice as much code as she added. That's usually a sign of simplification, not destruction.",
            "Looking at the diff... She replaced a synchronous auth chain with an async pipeline using Promise.all for parallel token validation and permission fetching. The error handling wraps with a custom AuthError that preserves the cause chain. This is senior-level work.",
            "Impact: p95 latency dropped from 820ms to 340ms. And all 47 existing tests passed without modification — zero behavior change on a 12-file refactor. That's surgical.",
            "But I need to check the other side. Her test coverage dropped from 78% to 61% this quarter. Let me look at her recent PRs...",
            "PR #411: Hotfix for null emails. 3 lines added. No test. This is a pattern — her last 3 small PRs have no tests. The big PRs are pristine, the quick fixes are cutting corners. Velocity pressure, probably.",
            "Her AI adoption is 89% — she used Claude 156 times this quarter, primarily for architecture docs and debugging complex async issues. She's not using AI for autocomplete — she's using it for the hard problems. That's the highest-leverage pattern."
        ],
        "advocate": [
            "Ana is the most impactful engineer on this team. Her auth refactor (PR #342) was a masterclass — 58% latency reduction with zero breaking changes. The rate limiter (PR #298) solved a production problem that had been open for two sprints. She hit 8 of 10 KPIs, and one of the misses (tech debt reduction) was blocked by excessive meeting load, not lack of skill.",
            "She also mentored Sofia — whose code quality improved 40% this quarter — and her code review on Diego's caching PR caught a concurrency bug that would have hit production. She's operating at staff level."
        ],
        "challenger": [
            "The big wins are real, but there's a troubling pattern underneath. Her test coverage dropped from 78% to 61% — that's a 17-point decline. Her last 3 small PRs had zero tests. PR #411, a null-check hotfix on payment amounts, defaults to 0 instead of throwing — that's a dangerous pattern in a payment system.",
            "She completed 8/10 KPIs, but the two misses are telling: test coverage and tech debt. These are the maintenance goals — the unglamorous work. She swings for architectural home runs and lets the foundation erode. That's a risk at senior level."
        ],
        "advocate_rebuttal": "Fair point on test coverage. But context matters — her meeting load this quarter was the highest on the team. The test decline correlates with February, when she was added to 3 new recurring meetings. The hotfix in PR #411 was shipped under a P1 incident. I'd weigh the architectural wins more heavily — they moved the product forward. The test debt is fixable.",
        "verdict": {
            "score": 8.4,
            "tagline": "Exceptional engineer constrained by process.",
            "summary": "Ana is the highest-impact IC on this team. Her architectural contributions (auth pipeline, rate limiter, SSO) moved the product forward materially. Her mentorship of Sofia is producing visible results. Her code reviews catch real bugs.",
            "detail": "The test coverage decline is real and must be addressed, but the root cause is calendar overload, not negligence. Reduce her meeting load by 30% and this corrects itself.",
            "evidence_positive": [
                "PR #342: auth refactor, -58% latency",
                "PR #298: rate limiter, solved P1",
                "Mentored Sofia: 40% quality improvement"
            ],
            "evidence_negative": [
                "Test coverage: 78% → 61%",
                "PR #411: unsafe null default in payments"
            ],
            "ai_note": "89% — high-leverage pattern. Uses Claude for architecture and debugging. Ideal."
        }
    },
    "carlos-mendez": {
        "thinking": [
            "29 PRs for a senior engineer across an entire quarter. That's about 2 per week. For comparison, Ana shipped 47 and Sofia — a junior — shipped 38. But quantity isn't the story. Let me look at quality.",
            "PR #389: Stripe webhook handler. Functional, but minimal. No retry logic. No dead letter queue. Console.log instead of structured logging. Diego left a detailed review suggesting improvements — Carlos didn't implement any of them. That's unusual for a senior engineer.",
            "PR #401: Null check hotfix. He defaults payment.amount to 0 with nullish coalescing. In a payment system. If amount is null, the correct behavior is to throw, not to process a $0 payment. No test.",
            "His review contributions are striking: 11 reviews given all quarter. That's less than 1 per week. And the quality... his review of Sofia's notification service was a single word: \"LGTM.\" A junior's PR got one word from a senior engineer. That's a red flag.",
            "AI adoption: 34%. Lowest on the team. 23 sessions all quarter, almost exclusively for debugging. He's not using the tools available to him.",
            "4 out of 10 KPIs completed. Sprint velocity dropped from 12 to 7 points. This is a senior engineer in a clear drift pattern."
        ],
        "advocate": [
            "Carlos has 3 years of tenure. He wrote the original payments system. His webhook handler works — it's been in production with zero downtime. He completed the incident runbook that the team used during the March outage. And his KPI completion rate needs context: 2 of his missed goals were deprioritized mid-quarter by the product team, not by his choice."
        ],
        "challenger": [
            "The deprioritization explains 2 missed KPIs. It does not explain the other 4. It does not explain review turnaround going from hours to 18 days. It does not explain \"LGTM\" on a junior's PR. And it does not explain 34% AI adoption when the rest of the team averages 73%.",
            "Something changed for Carlos this quarter. The data can show the what. The review meeting needs to find the why."
        ],
        "advocate_rebuttal": "",
        "verdict": {
            "score": 6.2,
            "tagline": "Senior talent in a drift pattern.",
            "summary": "Carlos's output and engagement declined materially this quarter. His code quality dropped, his review contributions nearly disappeared, and he's not adopting AI tools. This is not a skill issue — his tenure and past work prove capability. Something external changed.",
            "detail": "IMPORTANT: This review identifies the pattern, not the cause. The review meeting should focus on understanding what changed, not on the metrics. Possible factors: burnout, personal situation, misalignment with project, management gap (18 days without a 1:1).\n\nRECOMMENDATION: Schedule this review first. Longest slot. Listen more than talk.",
            "evidence_positive": [
                "3 years tenure, built payments system",
                "Incident runbook used during March outage"
            ],
            "evidence_negative": [
                "PR volume: 29 (lowest on team)",
                "Review quality: 'LGTM' on junior's PR",
                "Test coverage: 81% → 62%",
                "Sprint velocity: 12 → 7 points",
                "AI adoption: 34% (team lowest)"
            ],
            "ai_note": "34% — underutilized. Minimal AI adoption, mostly debugging. Not using available tools."
        }
    },
    "sofia-torres": {
        "thinking": [
            "Sofia is 8 months in and her trajectory is extraordinary. Her early PRs were rough — long functions, minimal error handling. But look at PR #367 from last month: a queue-based notification service with retry logic, user preference filtering, and clean separation of concerns. That's not junior work.",
            "Her test coverage went from 54% to 79% — the only person on the team whose coverage improved. Her code reviews catch real issues — she found a WCAG accessibility violation in Diego's PR.",
            "And the AI adoption number: 94%. 201 sessions. She's not just using Claude — she's using it to learn. She asks it to explain senior engineers' code. She generates tests to understand edge cases. This is what AI-augmented learning looks like."
        ],
        "advocate": [
            "Sofia's growth curve is the steepest on the team. In 8 months she went from rough PRs to building a queue-based notification service with retry logic. Her test coverage improved 25 points — the only person on the team trending up. She gives 2.4 reviews per week and catches real issues (WCAG violation in Diego's PR).",
            "Her AI adoption is the highest at 94% and the most strategic — she's using it to accelerate learning, not just to produce code faster. Sprint velocity improved 80% from start of quarter."
        ],
        "challenger": [
            "The growth is real but she hasn't been tested under pressure. She hasn't done on-call yet — both shadowing shifts were missed due to scheduling conflicts. Her notification latency target was 500ms and she's still at 620ms. And her PRs, while improving, are still mostly in her comfort zone — she hasn't taken on cross-team or system-level work.",
            "High AI adoption is great, but it also raises a question: how much of the code quality improvement is her growth vs. Claude's output? That's worth understanding before a promotion conversation."
        ],
        "advocate_rebuttal": "The on-call miss was a scheduling conflict, not avoidance. And the AI question cuts both ways — knowing how to leverage AI effectively IS the skill. She's using it to learn patterns, not to copy-paste. Her code review quality proves she understands what she's writing.",
        "verdict": {
            "score": 8.1,
            "tagline": "Fastest growth trajectory on the team.",
            "summary": "8 months in and approaching mid-level output. Her AI adoption is the highest and most strategic on the team — she's using it to learn, not just to produce. Promote to mid-level at next cycle if trajectory holds.",
            "detail": "Next steps: get her on-call experience, assign one cross-team project, and monitor whether quality holds without heavy AI assistance on a small project.",
            "evidence_positive": [
                "PR #367: notification service, production-quality",
                "Test coverage: 54% → 79% (only increase on team)",
                "Sprint velocity: +80% improvement",
                "AI adoption: 94%, learning-focused pattern"
            ],
            "evidence_negative": [
                "No on-call experience yet",
                "Notification latency: 620ms (target 500ms)"
            ],
            "ai_note": "94% — accelerated learning pattern. Uses Claude to learn, not just produce. Ideal junior usage."
        }
    },
    "diego-ramirez": {
        "thinking": [
            "Diego is the most consistent engineer on the team. Highest PR count (52), fastest review turnaround (2.1 hours), most reviews given (48). His code never breaks things. His reviews are the best on the team — he teaches, suggests, offers to pair.",
            "But he plays it safe. His PRs average 94 lines — small and incremental. No architectural swings. His AI adoption is moderate (72%) — he uses it for boilerplate and tests, not for thinking. He's a reliable executor. The question is: is he ready for more?"
        ],
        "advocate": [
            "Diego makes the team better. 48 code reviews — nearly one per day — with consistently high quality. His review of Carlos's webhook PR didn't just critique, it offered to pair on the fix. His caching layer and pagination work were solid, well-tested, and adopted without issues.",
            "He completed 7/10 KPIs, with one miss deprioritized externally. His bundle size reduction exceeded the target (18% vs 15% goal). He's the most reliable engineer on the team."
        ],
        "challenger": [
            "Reliable is the right word — and it's both the strength and the ceiling. His average PR is 94 lines. He hasn't taken on anything that required system-level design decisions. His AI adoption is moderate — he uses it for boilerplate, not for thinking through architecture.",
            "To reach senior level, he needs to demonstrate he can handle ambiguity and make design calls, not just execute well-defined tasks. He's been at mid-level for 1.5 years — the question is whether he's growing toward senior or plateauing as a strong mid."
        ],
        "advocate_rebuttal": "",
        "verdict": {
            "score": 7.6,
            "tagline": "Reliable executor, ready for more scope.",
            "summary": "Diego makes the team better through reviews and consistency. To grow to senior, he needs to take on a system-level project — one that requires design decisions, not just execution. Pair with Ana on next architectural initiative.",
            "detail": "Growth path: assign ownership of a new system (not just features within existing systems). His review quality shows he can think at a higher level — he needs permission and opportunity to do so in his own work.",
            "evidence_positive": [
                "52 PRs, 98% merge rate",
                "48 reviews given, highest quality on team",
                "Review turnaround: 2.1 hours (fastest)",
                "Bundle size: -18% (exceeded target)"
            ],
            "evidence_negative": [
                "Avg PR size: 94 lines (incremental only)",
                "No architectural/system-level contributions",
                "AI usage: productivity only, not strategic"
            ],
            "ai_note": "72% — productivity pattern. Uses AI for boilerplate and tests. Opportunity to use it for design thinking."
        }
    }
}

# Order for review cycle: Ana first (the star), then Carlos (the drift), then Sofia & Diego (fast rounds)
REVIEW_ORDER = ["ana-oliveira", "carlos-mendez", "sofia-torres", "diego-ramirez"]

SCHEDULE = [
    {"date": "Mon Apr 27, 10:00am", "engineer": "Carlos Mendez", "duration": "45 min", "note": "Scheduled first. Longest slot. Needs the most dialogue."},
    {"date": "Mon Apr 27, 2:00pm", "engineer": "Diego Ramirez", "duration": "45 min", "note": "Growth conversation. Discuss senior-track projects."},
    {"date": "Tue Apr 28, 10:00am", "engineer": "Sofia Torres", "duration": "45 min", "note": "Celebrate wins. Discuss promotion timeline."},
    {"date": "Tue Apr 28, 2:00pm", "engineer": "Ana Oliveira", "duration": "45 min", "note": "Address meeting load. Discuss staff-level scope."}
]

TEAM_STATS = {
    "total_commits": 614,
    "total_prs": 159,
    "total_reviews": 112,
    "total_kpis": 40,
    "total_ai_sessions": 464,
    "review_cost": "$4.82",
    "review_time": "3 minutes 24 seconds",
    "human_equivalent": "~40 hours of manager time"
}
