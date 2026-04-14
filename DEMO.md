# Orquesta — Demo Script

**Duration:** 2 minutes
**Setup:** App is open to Screen 1 (Team Overview). Dark theme. Four engineer cards. One button.

---

## Beat 0 — The Setup (20 seconds)

Screen shows four engineer cards, all marked "not yet reviewed." Clean, minimal, dark.

> "Performance reviews take managers 40+ hours a quarter. They're written from memory, biased by recency, and nobody actually reads the code. What if an AI read every commit, every PR, every code review — and produced an evidence-based performance review in minutes?"

> "Let me show you."

Click: **[ Run Performance Review Cycle ]**

The button pulses, then the screen transitions to the Live Review screen (Screen 2). Split view: evidence on the left, agent on the right.

---

## Beat 1 — Ana Oliveira: The Star (90 seconds)

### The Scan

Ana's profile appears at the top left. Her GitHub data starts loading — the left panel fills with her data, card by card, with a subtle fade-in animation:

```
ANA OLIVEIRA · Senior Engineer · 2.5 years
47 PRs · 186 commits · 34 reviews given · 89% AI adoption · 8/10 KPIs
```

The right panel starts streaming Claude's extended thinking:

```
┌─ ANALYZING ─────────────────────────────────────────────┐
│                                                          │
│  Ana opened 47 PRs this quarter with 44 merged — a 94%  │
│  merge rate. Volume is high, but volume alone doesn't    │
│  tell the story. Let me look at the actual code.         │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### The Code Read

A code diff appears on the left — PR #342, the auth middleware refactor. Syntax-highlighted. Red (deletions) and green (additions). Claude's analysis streams alongside it:

```
┌─ ANALYZING ─────────────────────────────────────────────┐
│                                                          │
│  PR #342: Auth middleware refactor. 12 files, +487/-891  │
│  lines. The deletion ratio is significant — she removed  │
│  almost twice as much code as she added. That's          │
│  usually a sign of simplification, not destruction.      │
│                                                          │
│  Looking at the diff... She replaced a synchronous auth  │
│  chain with an async pipeline using Promise.all for      │
│  parallel token validation and permission fetching. The  │
│  error handling wraps with a custom AuthError that       │
│  preserves the cause chain. This is senior-level work.   │
│                                                          │
│  Impact: p95 latency dropped from 820ms to 340ms. And   │
│  all 47 existing tests passed without modification —     │
│  zero behavior change on a 12-file refactor. That's      │
│  surgical.                                               │
│                                                          │
│  But I need to check the other side. Her test coverage   │
│  dropped from 78% to 61% this quarter. Let me look at   │
│  her recent PRs...                                       │
│                                                          │
│  PR #411: Hotfix for null emails. 3 lines added. No     │
│  test. This is a pattern — her last 3 small PRs have     │
│  no tests. The big PRs are pristine, the quick fixes    │
│  are cutting corners. Velocity pressure, probably.       │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

On the left, the diff cycles from PR #342 to PR #411. The audience watches Claude READING CODE and forming judgments.

**Then the Anthropic usage card loads on the left:**

```
┌─ AI TOOL ADOPTION ──────────────────────────┐
│  156 sessions · 2.4M tokens · 89% adoption  │
│  Uses: architecture, debugging, code review  │
│  Pattern: HIGH-LEVERAGE                      │
│  She uses AI for thinking, not just typing.  │
└─────────────────────────────────────────────┘
```

```
┌─ ANALYZING ─────────────────────────────────────────────┐
│                                                          │
│  Her AI adoption is 89% — she used Claude 156 times      │
│  this quarter, primarily for architecture docs and       │
│  debugging complex async issues. She's not using AI      │
│  for autocomplete — she's using it for the hard          │
│  problems. That's the highest-leverage pattern.          │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### The Debate

The thinking block collapses. Two new panels appear on the right — Advocate (green border) and Challenger (amber border):

```
┌─ ADVOCATE ──────────────────────────────────────────────┐
│                                                          │
│  Ana is the most impactful engineer on this team. Her    │
│  auth refactor (PR #342) was a masterclass — 58%         │
│  latency reduction with zero breaking changes. The rate  │
│  limiter (PR #298) solved a production problem that had  │
│  been open for two sprints. She hit 8 of 10 KPIs, and   │
│  one of the misses (tech debt reduction) was blocked by  │
│  excessive meeting load, not lack of skill.              │
│                                                          │
│  She also mentored Sofia — whose code quality improved   │
│  40% this quarter — and her code review on Diego's       │
│  caching PR caught a concurrency bug that would have     │
│  hit production. She's operating at staff level.         │
│                                                          │
└──────────────────────────────────────────────────────────┘

┌─ CHALLENGER ────────────────────────────────────────────┐
│                                                          │
│  The big wins are real, but there's a troubling pattern  │
│  underneath. Her test coverage dropped from 78% to 61%   │
│  — that's a 17-point decline. Her last 3 small PRs had  │
│  zero tests. PR #411, a null-check hotfix on payment     │
│  amounts, defaults to 0 instead of throwing — that's a   │
│  dangerous pattern in a payment system.                  │
│                                                          │
│  She completed 8/10 KPIs, but the two misses are         │
│  telling: test coverage and tech debt. These are the     │
│  maintenance goals — the unglamorous work. She swings    │
│  for architectural home runs and lets the foundation     │
│  erode. That's a risk at senior level.                   │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

Brief pause. Then the Advocate responds:

```
┌─ ADVOCATE ──────────────────────────────────────────────┐
│                                                          │
│  Fair point on test coverage. But context matters — her  │
│  meeting load this quarter was the highest on the team.  │
│  The test decline correlates with February, when she     │
│  was added to 3 new recurring meetings. The hotfix in    │
│  PR #411 was shipped under a P1 incident. I'd weigh the │
│  architectural wins more heavily — they moved the        │
│  product forward. The test debt is fixable.              │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### The Verdict

Both debate panels collapse. The verdict appears:

```
┌─ VERDICT ───────────────────────────────────────────────┐
│                                                          │
│  ANA OLIVEIRA                              8.4 / 10     │
│                                                          │
│  "Exceptional engineer constrained by process."          │
│                                                          │
│  Ana is the highest-impact IC on this team. Her          │
│  architectural contributions (auth pipeline, rate        │
│  limiter, SSO) moved the product forward materially.     │
│  Her mentorship of Sofia is producing visible results.   │
│  Her code reviews catch real bugs.                       │
│                                                          │
│  The test coverage decline is real and must be           │
│  addressed, but the root cause is calendar overload,     │
│  not negligence. Reduce her meeting load by 30%          │
│  and this corrects itself.                               │
│                                                          │
│  KEY EVIDENCE                                            │
│  + PR #342: auth refactor, -58% latency         [view]  │
│  + PR #298: rate limiter, solved P1              [view]  │
│  + Mentored Sofia: 40% quality improvement       [view]  │
│  - Test coverage: 78% → 61%                      [view]  │
│  - PR #411: unsafe null default in payments      [view]  │
│                                                          │
│  AI ADOPTION: 89% — high-leverage pattern                │
│  Uses Claude for architecture and debugging. Ideal.      │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

Ana's card animates with her score. A progress ring fills to 8.4. The card settles into a "complete" state.

> The audience just watched an AI read actual code, form an opinion, argue with itself, and produce a nuanced performance review with evidence for every claim. In 90 seconds.

---

## Beat 2 — Carlos Mendez: The Drift (75 seconds)

Transition. Carlos's profile appears. His data loads — and it's visibly thinner.

```
CARLOS MENDEZ · Senior Engineer · 3 years
29 PRs · 94 commits · 11 reviews given · 34% AI adoption · 4/10 KPIs
```

The numbers land. The audience can already tell. But Claude's reasoning makes it devastating:

```
┌─ ANALYZING ─────────────────────────────────────────────┐
│                                                          │
│  29 PRs for a senior engineer across an entire quarter.  │
│  That's about 2 per week. For comparison, Ana shipped    │
│  47 and Sofia — a junior — shipped 38. But quantity      │
│  isn't the story. Let me look at quality.                │
│                                                          │
│  PR #389: Stripe webhook handler. Functional, but        │
│  minimal. No retry logic. No dead letter queue.          │
│  Console.log instead of structured logging. Diego        │
│  left a detailed review suggesting improvements —        │
│  Carlos didn't implement any of them. That's unusual     │
│  for a senior engineer.                                  │
│                                                          │
│  PR #401: Null check hotfix. He defaults payment.amount  │
│  to 0 with nullish coalescing. In a payment system.      │
│  If amount is null, the correct behavior is to throw,    │
│  not to process a $0 payment. No test.                   │
│                                                          │
│  His review contributions are striking: 11 reviews       │
│  given all quarter. That's less than 1 per week. And     │
│  the quality... his review of Sofia's notification        │
│  service was a single word: "LGTM." A junior's PR got   │
│  one word from a senior engineer. That's a red flag.     │
│                                                          │
│  AI adoption: 34%. Lowest on the team. 23 sessions all  │
│  quarter, almost exclusively for debugging. He's not     │
│  using the tools available to him.                       │
│                                                          │
│  4 out of 10 KPIs completed. Sprint velocity dropped    │
│  from 12 to 7 points. This is a senior engineer in a    │
│  clear drift pattern.                                    │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

The PR #389 diff is visible on the left. Then switches to his "LGTM" review on Sofia's PR. Stark. The audience sees the evidence.

### The Debate (shorter, more pointed)

```
┌─ ADVOCATE ──────────────────────────────────────────────┐
│                                                          │
│  Carlos has 3 years of tenure. He wrote the original     │
│  payments system. His webhook handler works — it's been  │
│  in production with zero downtime. He completed the      │
│  incident runbook that the team used during the March    │
│  outage. And his KPI completion rate needs context:      │
│  2 of his missed goals were deprioritized mid-quarter    │
│  by the product team, not by his choice.                 │
│                                                          │
└──────────────────────────────────────────────────────────┘

┌─ CHALLENGER ────────────────────────────────────────────┐
│                                                          │
│  The deprioritization explains 2 missed KPIs. It does   │
│  not explain the other 4. It does not explain review     │
│  turnaround going from hours to 18 days. It does not    │
│  explain "LGTM" on a junior's PR. And it does not       │
│  explain 34% AI adoption when the rest of the team      │
│  averages 73%.                                           │
│                                                          │
│  Something changed for Carlos this quarter. The data     │
│  can show the what. The review meeting needs to find     │
│  the why.                                                │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### The Verdict

```
┌─ VERDICT ───────────────────────────────────────────────┐
│                                                          │
│  CARLOS MENDEZ                             6.2 / 10     │
│                                                          │
│  "Senior talent in a drift pattern."                     │
│                                                          │
│  Carlos's output and engagement declined materially      │
│  this quarter. His code quality dropped, his review      │
│  contributions nearly disappeared, and he's not          │
│  adopting AI tools. This is not a skill issue — his      │
│  tenure and past work prove capability. Something        │
│  external changed.                                       │
│                                                          │
│  IMPORTANT: This review identifies the pattern, not      │
│  the cause. The review meeting should focus on           │
│  understanding what changed, not on the metrics.         │
│  Possible factors: burnout, personal situation,          │
│  misalignment with project, management gap (18 days      │
│  without a 1:1).                                         │
│                                                          │
│  RECOMMENDATION: Schedule this review first. Longest     │
│  slot. Listen more than talk.                            │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

This is the emotional beat of the demo. The AI is compassionate. It doesn't just flag underperformance — it says "find the why" and "listen more than talk." The audience respects the nuance.

---

## Beat 3 — Sofia & Diego: Fast Rounds (60 seconds)

These go faster. Show the agent working through both, but compress for time.

### Sofia (30 seconds)

Data loads. Claude's thinking streams — but the tone is different:

```
┌─ ANALYZING ─────────────────────────────────────────────┐
│                                                          │
│  Sofia is 8 months in and her trajectory is              │
│  extraordinary. Her early PRs were rough — long          │
│  functions, minimal error handling. But look at PR #367  │
│  from last month: a queue-based notification service     │
│  with retry logic, user preference filtering, and clean  │
│  separation of concerns. That's not junior work.         │
│                                                          │
│  Her test coverage went from 54% to 79% — the only      │
│  person on the team whose coverage improved. Her code    │
│  reviews catch real issues — she found a WCAG            │
│  accessibility violation in Diego's PR.                  │
│                                                          │
│  And the AI adoption number: 94%. 201 sessions. She's   │
│  not just using Claude — she's using it to learn.        │
│  She asks it to explain senior engineers' code. She      │
│  generates tests to understand edge cases. This is       │
│  what AI-augmented learning looks like.                  │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

The notification service diff appears on the left. It's clean code. The audience can see quality even if they don't code.

Quick debate. Advocate highlights the growth trajectory. Challenger notes she hasn't done on-call yet and her latency target was missed. Fair.

```
┌─ VERDICT ───────────────────────────────────────────────┐
│                                                          │
│  SOFIA TORRES                              8.1 / 10     │
│                                                          │
│  "Fastest growth trajectory on the team."                │
│                                                          │
│  8 months in and approaching mid-level output. Her AI    │
│  adoption is the highest and most strategic on the       │
│  team — she's using it to learn, not just to produce.    │
│  Promote to mid-level at next cycle if trajectory holds. │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### Diego (30 seconds)

Fast. Data loads. Thinking streams:

```
┌─ ANALYZING ─────────────────────────────────────────────┐
│                                                          │
│  Diego is the most consistent engineer on the team.      │
│  Highest PR count (52), fastest review turnaround (2.1   │
│  hours), most reviews given (48). His code never breaks  │
│  things. His reviews are the best on the team — he       │
│  teaches, suggests, offers to pair.                      │
│                                                          │
│  But he plays it safe. His PRs average 94 lines — small  │
│  and incremental. No architectural swings. His AI        │
│  adoption is moderate (72%) — he uses it for boilerplate │
│  and tests, not for thinking. He's a reliable executor.  │
│  The question is: is he ready for more?                  │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

Quick debate. Quick verdict:

```
┌─ VERDICT ───────────────────────────────────────────────┐
│                                                          │
│  DIEGO RAMIREZ                             7.6 / 10     │
│                                                          │
│  "Reliable executor, ready for more scope."              │
│                                                          │
│  Diego makes the team better through reviews and         │
│  consistency. To grow to senior, he needs to take on     │
│  a system-level project — one that requires design       │
│  decisions, not just execution. Pair with Ana on next    │
│  architectural initiative.                               │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

---

## Beat 4 — The Ranking Reveal (45 seconds)

Screen transitions to Screen 3. Dark background. The title appears:

**Q1 2026 Performance Ranking**
*Based on 614 commits, 159 PRs, 112 code reviews, 40 KPIs, 464 AI sessions*

Then silence for 1 second.

The rankings reveal one by one with a smooth animation — each card slides in from the bottom with a slight delay:

**#4** appears first (dramatic, start from the bottom):

```
#4  CARLOS MENDEZ         6.2/10   ██████░░░░
    "Senior talent in a drift pattern"
    29 PRs · 4/10 KPIs · 34% AI adoption
```

1-second pause. **#3**:

```
#3  DIEGO RAMIREZ         7.6/10   ████████░░
    "Reliable executor, ready for more scope"
    52 PRs · 7/10 KPIs · 72% AI adoption
```

1-second pause. **#2**:

```
#2  SOFIA TORRES          8.1/10   ████████░░
    "Fastest growth trajectory on the team"
    38 PRs · 7/10 KPIs · 94% AI adoption
```

Slight dramatic pause. **#1**:

```
#1  ANA OLIVEIRA          8.4/10   ████████░░
    "Exceptional engineer constrained by process"
    47 PRs · 8/10 KPIs · 89% AI adoption
```

The #1 card gets a subtle gold accent.

Below the ranking, the kicker stat fades in:

```
Total AI cost of this review cycle: $4.82
Time elapsed: 3 minutes 24 seconds
Human equivalent: ~40 hours of manager time
```

The audience reads this. Let it sit.

Then one final button appears:

**[ Schedule Review Meetings via cal.com ]**

Click it. A scheduling card appears showing meetings auto-booked in priority order:

```
┌─ REVIEW MEETINGS SCHEDULED ─────────────────────────────┐
│                                                           │
│  Mon Apr 27, 10:00am — Carlos Mendez (45 min)            │
│  Scheduled first. Longest slot. Needs the most dialogue.  │
│                                                           │
│  Mon Apr 27, 2:00pm — Diego Ramirez (45 min)             │
│  Growth conversation. Discuss senior-track projects.      │
│                                                           │
│  Tue Apr 28, 10:00am — Sofia Torres (45 min)             │
│  Celebrate wins. Discuss promotion timeline.              │
│                                                           │
│  Tue Apr 28, 2:00pm — Ana Oliveira (45 min)              │
│  Address meeting load. Discuss staff-level scope.         │
│                                                           │
│  ✓ Calendar invites sent. Agendas pre-populated          │
│    from review briefs.                                    │
│                                                           │
└───────────────────────────────────────────────────────────┘
```

> "Carlos is first — he needs the most attention. Longest slot. The agenda is pre-populated from the review brief. Ana is last — she's performing well, the conversation is about growth."

---

## The Close (20 seconds)

> "Four engineers. 614 commits. 159 PRs. Every line of code read. Every KPI checked. Two AI agents debated each person's work with real evidence. Four performance reviews generated with specific, cited, actionable feedback."

> "Cost: $4.82. Time: three and a half minutes."

> "A manager doing this manually? Two weeks. And they'd write it from memory."

Pause.

> "That's Orquesta."

---

## Animation Specifications

### Code Diff Cycling
- Diffs appear with a typewriter-like line-by-line reveal (30ms per line)
- Syntax highlighted: deletions red, additions green, unchanged dim white
- When Claude references a specific line in its thinking, that line briefly pulses yellow on the left
- Transition between PRs: current diff fades up and out (0.3s), new diff fades down and in (0.3s)

### Chain-of-Thought Streaming
- Characters stream at ~40 chars/second
- Thinking blocks have a dark gray background (#1a1a1a) with a pulsing left border (cyan)
- Auto-scrolls to keep latest text visible
- When a thinking block completes, it collapses to a one-line summary (click to expand)

### Debate Panels
- Advocate has a green-tinted left border
- Challenger has an amber-tinted left border
- They appear sequentially with a 0.5s gap
- Text streams simultaneously once both are visible (if advocate responds to challenger)
- When debate ends, both panels collapse with a fold animation

### Verdict Card
- Appears with a scale-up animation from center (0.4s)
- Score number uses an odometer/counter animation (counts up from 0 to final score)
- Progress ring fills clockwise to match the score
- Evidence items slide in one by one (0.15s stagger)

### Ranking Reveal
- Each rank card slides up from below the viewport (0.5s ease-out)
- 1.2-second pause between each reveal
- #1 card has a brief golden shimmer effect on arrival
- The cost/time stat at the bottom fades in 1s after the last card

### Metrics Cards (left side)
- Cards load with a subtle fade + slide from left (0.3s stagger)
- Numbers use counting animations (0 → final value over 0.5s)
- Color coding: green for good, amber for warning, red for concern
- AI adoption percentage uses a circular progress indicator

---

## Hardcode Checklist

Everything needed for the demo to work without any external API calls:

- [ ] 4 engineer profile JSON files (name, role, salary, tenure, timezone)
- [ ] 4 GitHub data JSON files (PRs, commits, diffs, reviews — detailed above)
- [ ] 4 KPI JSON files (goals, completion rates, details)
- [ ] 4 Anthropic usage JSON files (sessions, tokens, patterns)
- [ ] 1 team summary JSON (aggregated metrics)
- [ ] 1 cal.com slots JSON (available times for scheduling)
- [ ] Code diff strings for key PRs (ready to render in diff viewer)
- [ ] Pre-computed ranking order (Ana > Sofia > Diego > Carlos)
- [ ] Cached Claude responses for each engineer (fallback if API is slow)
- [ ] System prompts for: analyzer, advocate, challenger, synthesizer

---

## Novel Anthropic API Usage (for judges)

This demo showcases 5 distinct Claude capabilities in one product:

1. **Extended Thinking (visible):** Claude Opus reads code and reasons through quality with chain-of-thought visible to the user. Not hidden — the thinking IS the product.

2. **Multi-Agent Debate:** Two Claude Sonnet instances with opposing system prompts argue about the same evidence. Advocate vs. Challenger. This produces balanced reviews that no single prompt could generate.

3. **Code-as-Data:** Claude reads raw git diffs and forms qualitative judgments about engineering skill — not counting lines, but understanding intent, quality, and patterns. "This deletion ratio suggests simplification, not destruction."

4. **Structured Tool Use:** The agent loop uses tools to pull specific data (PRs, KPIs, AI usage) and Claude decides what to examine next based on what it's already seen. It adapts its investigation per engineer.

5. **Meta-AI Evaluation:** Claude evaluates how well engineers use Claude. The AI judges humans on their use of AI. This is deeply meta and perfect for an Anthropic hackathon. The judges will love it.
