# Orquesta — PRD (Demo MVP Only)

**Scope:** Only what's needed for the hackathon demo. Nothing more.

---

## What This Is

A live AI performance review engine. The manager clicks "Run Review Cycle." Claude reads the team's actual code, analyzes quality, debates itself, and produces ranked, evidence-based performance reviews — all visible on screen in real time.

---

## The Three WOW Moments

### WOW 1 — The Live Code Scan
Claude reads git diffs on screen. The audience watches an AI scroll through actual code, highlight patterns, and form judgments. Not metrics. Judgment. "This function has 4 levels of nesting and no error handling — this is rushed work." "This PR refactored 12 files with zero behavior change and full test coverage — this is senior craftsmanship."

### WOW 2 — The Adversarial Debate
Two Claude agents argue about each engineer. One is the Advocate ("Ana's auth refactor shows deep systems understanding"). The other is the Challenger ("But her test coverage dropped 30% in Q2 — velocity over quality?"). They go back and forth, citing real PRs and commits. The audience watches AI argue about a human's work. This has never been shown at a hackathon.

### WOW 3 — The Ranking Reveal
After all reviews complete, the team ranking appears — animated, one by one, like a leaderboard. Each rank has a score, a one-line verdict, and a "see evidence" button that expands to show every cited PR and commit. Fully transparent. No black box.

---

## Screens (minimal, sleek)

The app has exactly 3 screens. Dark theme. Lots of whitespace. Typography-driven. No clutter.

### Screen 1 — Team Overview

```
┌──────────────────────────────────────────────────────────────┐
│  ORQUESTA                                                     │
│                                                               │
│                                                               │
│                    Your Engineering Team                       │
│                       5 engineers · Q1 2026                    │
│                                                               │
│                                                               │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐     │
│  │          │  │          │  │          │  │          │     │
│  │  avatar  │  │  avatar  │  │  avatar  │  │  avatar  │     │
│  │          │  │          │  │          │  │          │     │
│  │   Ana    │  │  Diego   │  │  Carlos  │  │  Sofia   │     │
│  │  Senior  │  │   Mid    │  │  Senior  │  │  Junior  │     │
│  │          │  │          │  │          │  │          │     │
│  │ ░░░░░░░░ │  │ ░░░░░░░░ │  │ ░░░░░░░░ │  │ ░░░░░░░░ │     │
│  │ not yet  │  │ not yet  │  │ not yet  │  │ not yet  │     │
│  │ reviewed │  │ reviewed │  │ reviewed │  │ reviewed │     │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘     │
│                                                               │
│                                                               │
│              [ Run Performance Review Cycle ]                  │
│                                                               │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

Clean. Minimal. One button. That button starts everything.

### Screen 2 — The Live Review (split screen)

This is where the demo lives. 70% of demo time is on this screen.

```
┌─────────────────────────────────┬────────────────────────────────┐
│                                 │                                │
│  CODE + EVIDENCE (left 55%)     │  AGENT PANEL (right 45%)       │
│                                 │                                │
│  Currently reviewing:           │  ┌─ SCANNING ───────────────┐  │
│  ANA OLIVEIRA                   │  │                           │  │
│  Senior Engineer                │  │  Agent chain-of-thought   │  │
│                                 │  │  streams here as Claude   │  │
│  ┌─ PR #342 ─────────────────┐  │  │  reads the code on the   │  │
│  │                           │  │  │  left.                    │  │
│  │  auth/middleware.ts       │  │  │                           │  │
│  │  - old code (red)         │  │  └───────────────────────────┘  │
│  │  + new code (green)       │  │                                │
│  │                           │  │  ┌─ ADVOCATE ───────────────┐  │
│  │  highlighted by Claude    │  │  │  "Ana's refactor shows   │  │
│  │  as it reads              │  │  │  deep systems thinking—"  │  │
│  │                           │  │  └───────────────────────────┘  │
│  └───────────────────────────┘  │                                │
│                                 │  ┌─ CHALLENGER ─────────────┐  │
│  ┌─ METRICS ─────────────────┐  │  │  "But her test coverage   │  │
│  │  PRs: 47  Commits: 186    │  │  │  dropped 30%—"            │  │
│  │  Reviews given: 34        │  │  └───────────────────────────┘  │
│  │  AI tool usage: 89%       │  │                                │
│  │  KPIs hit: 8/10           │  │  ┌─ VERDICT ────────────────┐  │
│  └───────────────────────────┘  │  │  Score: 8.4/10            │  │
│                                 │  │  "Exceptional engineer     │  │
│                                 │  │  constrained by process."  │  │
│                                 │  └───────────────────────────┘  │
│                                 │                                │
└─────────────────────────────────┴────────────────────────────────┘
```

**Left side** shows the raw evidence Claude is looking at — code diffs cycling through, metrics loading, KPI cards appearing. This scrolls/animates as Claude reads.

**Right side** is the agentic panel — thinking, then advocate speaks, then challenger responds, then verdict. All streaming live.

### Screen 3 — The Ranking

Appears after all reviews complete. Animated reveal.

```
┌──────────────────────────────────────────────────────────────┐
│  ORQUESTA                                                     │
│                                                               │
│             Q1 2026 Performance Ranking                       │
│             Based on 614 commits, 159 PRs,                    │
│             112 code reviews, 40 KPIs                         │
│                                                               │
│  ┌────────────────────────────────────────────────────────┐   │
│  │  #1  ANA OLIVEIRA          8.4/10   ████████░░         │   │
│  │      "Exceptional engineer constrained by process"      │   │
│  │      47 PRs · 3 architectural wins · 89% AI adoption   │   │
│  │      [see full evidence]                                │   │
│  ├────────────────────────────────────────────────────────┤   │
│  │  #2  SOFIA TORRES          8.1/10   ████████░░         │   │
│  │      "Fastest growth trajectory on the team"            │   │
│  │      38 PRs · steepest quality curve · 94% AI adoption │   │
│  │      [see full evidence]                                │   │
│  ├────────────────────────────────────────────────────────┤   │
│  │  #3  DIEGO RAMIREZ         7.6/10   ███████░░░         │   │
│  │      "Reliable executor, ready for more scope"          │   │
│  │      52 PRs · highest review quality · 72% AI adoption │   │
│  │      [see full evidence]                                │   │
│  ├────────────────────────────────────────────────────────┤   │
│  │  #4  CARLOS MENDEZ         6.2/10   ██████░░░░         │   │
│  │      "Senior talent in a drift pattern"                 │   │
│  │      29 PRs · declining quality trend · 34% AI adoption│   │
│  │      [see full evidence]                                │   │
│  └────────────────────────────────────────────────────────┘   │
│                                                               │
│  Total AI cost of this review cycle: $4.82                    │
│  Time: 3 minutes 24 seconds                                  │
│  Human equivalent: ~40 hours of manager time                  │
│                                                               │
│         [ Schedule Review Meetings via cal.com ]              │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

The bottom stat is the kicker: **"$4.82 and 3 minutes vs. 40 hours of manager time."**

---

## Data to Hardcode/Seed

### Engineer Profiles

```json
[
  {
    "name": "Ana Oliveira",
    "role": "Senior Engineer",
    "github": "ana-oliveira",
    "avatar": "generated",
    "salary": "$150k",
    "tenure": "2.5 years",
    "timezone": "São Paulo UTC-3"
  },
  {
    "name": "Diego Ramirez",
    "role": "Mid Engineer",
    "github": "diego-ramirez",
    "avatar": "generated",
    "salary": "$100k",
    "tenure": "1.5 years",
    "timezone": "Mexico City UTC-6"
  },
  {
    "name": "Carlos Mendez",
    "role": "Senior Engineer",
    "github": "carlos-mendez",
    "avatar": "generated",
    "salary": "$150k",
    "tenure": "3 years",
    "timezone": "Buenos Aires UTC-3"
  },
  {
    "name": "Sofia Torres",
    "role": "Junior Engineer",
    "github": "sofia-torres",
    "avatar": "generated",
    "salary": "$70k",
    "tenure": "8 months",
    "timezone": "Bogotá UTC-5"
  }
]
```

### Seeded GitHub Data (per engineer)

Each engineer has hardcoded JSON files containing their simulated GitHub activity. This is what Claude reads during the demo.

#### Ana Oliveira — The Star (score: 8.4)

**Story:** Exceptional IC who shipped 3 architectural changes that moved the needle. But her test coverage slipped in Q2, and she's in too many meetings. Her AI tool adoption is high — she uses Claude for code review prep and architecture docs.

```json
{
  "summary": {
    "prs_opened": 47,
    "prs_merged": 44,
    "commits": 186,
    "reviews_given": 34,
    "avg_pr_size": "182 lines",
    "avg_review_turnaround": "4.2 hours",
    "test_coverage_trend": "78% → 61% (declining)",
    "ai_tool_sessions": 156,
    "ai_tool_adoption": "89%"
  },
  "notable_prs": [
    {
      "number": 342,
      "title": "Refactor auth middleware to async pipeline",
      "files_changed": 12,
      "additions": 487,
      "deletions": 891,
      "description": "Complete rewrite of auth middleware from synchronous chain to async pipeline. Reduced p95 latency from 820ms to 340ms. Zero behavior change — all 47 existing tests pass without modification.",
      "diff_snippet": "// BEFORE\nfunction authMiddleware(req, res, next) {\n  const token = req.headers.authorization;\n  const user = validateTokenSync(token);\n  if (!user) return res.status(401).send('Unauthorized');\n  const permissions = fetchPermissionsSync(user.id);\n  req.user = { ...user, permissions };\n  next();\n}\n\n// AFTER\nasync function authMiddleware(req, res, next) {\n  try {\n    const token = req.headers.authorization;\n    const [user, permissions] = await Promise.all([\n      validateToken(token),\n      token ? fetchPermissions(extractUserId(token)) : null\n    ]);\n    if (!user) return res.status(401).json({ error: 'Unauthorized' });\n    req.user = { ...user, permissions };\n    next();\n  } catch (err) {\n    next(new AuthError(err.message, { cause: err }));\n  }\n}",
      "review_comments": 3,
      "quality_signals": ["parallel async", "error propagation", "zero behavior change", "large deletion ratio = simplification"]
    },
    {
      "number": 298,
      "title": "Implement rate limiter with sliding window",
      "files_changed": 5,
      "additions": 234,
      "deletions": 12,
      "description": "New rate limiting system using Redis sliding window. Replaced the leaky bucket implementation that was causing false positives under burst traffic.",
      "diff_snippet": "export class SlidingWindowRateLimiter {\n  constructor(\n    private redis: Redis,\n    private windowMs: number,\n    private maxRequests: number\n  ) {}\n\n  async isAllowed(key: string): Promise<{ allowed: boolean; remaining: number; resetMs: number }> {\n    const now = Date.now();\n    const windowStart = now - this.windowMs;\n    \n    const pipe = this.redis.pipeline();\n    pipe.zremrangebyscore(key, 0, windowStart);\n    pipe.zadd(key, now, `${now}:${crypto.randomUUID()}`);\n    pipe.zcard(key);\n    pipe.pexpire(key, this.windowMs);\n    \n    const results = await pipe.exec();\n    const count = results[2][1] as number;\n    \n    return {\n      allowed: count <= this.maxRequests,\n      remaining: Math.max(0, this.maxRequests - count),\n      resetMs: this.windowMs - (now - windowStart)\n    };\n  }\n}",
      "quality_signals": ["clean abstraction", "proper Redis pipelining", "returns useful metadata"]
    },
    {
      "number": 411,
      "title": "Quick fix: patch user lookup for null emails",
      "files_changed": 1,
      "additions": 3,
      "deletions": 1,
      "description": "Hotfix for prod issue — users with null emails were crashing the lookup service.",
      "diff_snippet": "// BEFORE\nconst user = await db.users.findOne({ email: input.email });\n\n// AFTER  \nif (!input.email) return null;\nconst user = await db.users.findOne({ email: input.email });",
      "review_comments": 0,
      "quality_signals": ["no test added for hotfix", "minimal fix but no guard at API boundary"]
    }
  ],
  "review_quality_samples": [
    {
      "pr_reviewed": "#287 (Diego's caching PR)",
      "comment": "This cache invalidation logic will break if two requests hit the same key within the TTL window. Consider using a lock or check-and-set pattern. See: https://redis.io/docs/manual/transactions/#cas",
      "quality": "high — caught a concurrency bug with a specific fix"
    },
    {
      "pr_reviewed": "#301 (Sofia's first API endpoint)",
      "comment": "Nice work on the error handling! One suggestion: extract the validation into a separate function so you can reuse it in the batch endpoint we're building next sprint. Here's a pattern that works well: [code example]",
      "quality": "high — mentoring with actionable code example"
    }
  ],
  "kpis": {
    "sprint_velocity": "avg 13 points/sprint (team avg: 10)",
    "goals_completed": "8/10",
    "goals_detail": [
      { "goal": "Migrate auth to async pipeline", "status": "completed", "impact": "p95 latency -58%" },
      { "goal": "Implement rate limiting v2", "status": "completed", "impact": "false positive rate 12% → 0.3%" },
      { "goal": "Reduce API error rate below 0.1%", "status": "completed", "impact": "0.34% → 0.07%" },
      { "goal": "Write architecture doc for event system", "status": "completed", "impact": "doc used by 3 teams" },
      { "goal": "Mentor Sofia on backend patterns", "status": "completed", "impact": "Sofia's PR quality improved 40%" },
      { "goal": "Lead Q2 planning for auth team", "status": "completed", "impact": "plan adopted" },
      { "goal": "Improve test coverage to 85%", "status": "missed", "impact": "coverage dropped to 61%" },
      { "goal": "Reduce tech debt in payments module", "status": "missed", "impact": "not started — meeting load" },
      { "goal": "Ship SSO integration", "status": "completed", "impact": "3 enterprise clients unblocked" },
      { "goal": "Run 2 eng brown bags", "status": "completed", "impact": "avg 12 attendees" }
    ]
  },
  "anthropic_usage": {
    "total_sessions": 156,
    "total_tokens": "2.4M",
    "use_cases": ["code review prep", "architecture doc drafting", "debugging complex async issues", "test generation"],
    "adoption_rate": "89%",
    "quality_note": "Uses Claude for high-leverage tasks — architecture and debugging, not just autocomplete."
  }
}
```

#### Diego Ramirez — The Reliable Executor (score: 7.6)

**Story:** Highest PR volume on the team but plays it safe. His code is solid, never breaks anything, but never swings for the fences. His code reviews are the best on the team — thorough, kind, teaches others. AI adoption is moderate — uses it for boilerplate, not for thinking.

```json
{
  "summary": {
    "prs_opened": 52,
    "prs_merged": 51,
    "commits": 203,
    "reviews_given": 48,
    "avg_pr_size": "94 lines",
    "avg_review_turnaround": "2.1 hours",
    "test_coverage_trend": "82% → 84% (stable+)",
    "ai_tool_sessions": 84,
    "ai_tool_adoption": "72%"
  },
  "notable_prs": [
    {
      "number": 287,
      "title": "Add Redis caching layer for user profiles",
      "files_changed": 6,
      "additions": 156,
      "deletions": 23,
      "diff_snippet": "export class UserProfileCache {\n  private readonly TTL = 300; // 5 minutes\n\n  async get(userId: string): Promise<UserProfile | null> {\n    const cached = await this.redis.get(`profile:${userId}`);\n    if (cached) {\n      this.metrics.increment('cache.hit');\n      return JSON.parse(cached);\n    }\n    this.metrics.increment('cache.miss');\n    const profile = await this.db.users.findById(userId);\n    if (profile) {\n      await this.redis.setex(`profile:${userId}`, this.TTL, JSON.stringify(profile));\n    }\n    return profile;\n  }\n\n  async invalidate(userId: string): Promise<void> {\n    await this.redis.del(`profile:${userId}`);\n  }\n}",
      "quality_signals": ["clean cache pattern", "metrics instrumented", "but Ana caught a concurrency issue in review"]
    },
    {
      "number": 356,
      "title": "Add pagination to all list endpoints",
      "files_changed": 14,
      "additions": 312,
      "deletions": 87,
      "diff_snippet": "export function paginate<T>(query: Query<T>, params: PaginationParams): PaginatedQuery<T> {\n  const { page = 1, limit = 20, sortBy = 'createdAt', order = 'desc' } = params;\n  return {\n    ...query,\n    skip: (page - 1) * limit,\n    take: limit,\n    orderBy: { [sortBy]: order },\n    _meta: { page, limit, sortBy, order }\n  };\n}",
      "quality_signals": ["good abstraction", "applied consistently across 14 files", "sensible defaults"]
    }
  ],
  "review_quality_samples": [
    {
      "pr_reviewed": "#389 (Carlos's webhook handler)",
      "comment": "This works, but the retry logic is buried inside the handler. If we extract it into a withRetry() wrapper, we can reuse it for the email sender and the Stripe webhook too. Want me to pair on this? I refactored something similar last sprint.",
      "quality": "exceptional — sees the bigger picture, offers to pair"
    }
  ],
  "kpis": {
    "sprint_velocity": "avg 11 points/sprint",
    "goals_completed": "7/10",
    "goals_detail": [
      { "goal": "Add caching layer for user profiles", "status": "completed", "impact": "API response time -40%" },
      { "goal": "Paginate all list endpoints", "status": "completed", "impact": "eliminated 3 timeout incidents" },
      { "goal": "Reduce bundle size by 15%", "status": "completed", "impact": "achieved 18% reduction" },
      { "goal": "Migrate to new logging format", "status": "completed", "impact": "adopted by 2 other teams" },
      { "goal": "Ship notification preferences UI", "status": "completed", "impact": "support tickets -25%" },
      { "goal": "Implement webhook retry system", "status": "in_progress", "impact": "70% complete" },
      { "goal": "Lead frontend guild meeting (2x)", "status": "completed", "impact": "started frontend standards doc" },
      { "goal": "Improve lighthouse score to 90+", "status": "missed", "impact": "at 84, blocked by third-party scripts" },
      { "goal": "Write onboarding guide for new eng", "status": "missed", "impact": "started but not finished" },
      { "goal": "Ship dark mode", "status": "missed", "impact": "deprioritized mid-quarter" }
    ]
  },
  "anthropic_usage": {
    "total_sessions": 84,
    "total_tokens": "1.1M",
    "use_cases": ["boilerplate generation", "test writing", "documentation"],
    "adoption_rate": "72%",
    "quality_note": "Uses AI for repetitive tasks. Hasn't adopted it for design or architecture thinking yet — opportunity for growth."
  }
}
```

#### Carlos Mendez — The Drift (score: 6.2)

**Story:** Was a strong senior engineer. This quarter something changed. PR volume dropped 40%. Code quality declined — more bugs caught in review, less test coverage. Stopped reviewing others' code. Barely uses AI tools. The data tells a story of disengagement, but the WHY is unknown — that's what the review meeting is for.

```json
{
  "summary": {
    "prs_opened": 29,
    "prs_merged": 26,
    "commits": 94,
    "reviews_given": 11,
    "avg_pr_size": "67 lines",
    "avg_review_turnaround": "18.4 hours",
    "test_coverage_trend": "81% → 62% (declining sharply)",
    "ai_tool_sessions": 23,
    "ai_tool_adoption": "34%"
  },
  "notable_prs": [
    {
      "number": 389,
      "title": "Add webhook handler for Stripe events",
      "files_changed": 3,
      "additions": 89,
      "deletions": 4,
      "diff_snippet": "app.post('/webhooks/stripe', async (req, res) => {\n  const sig = req.headers['stripe-signature'];\n  let event;\n  try {\n    event = stripe.webhooks.constructEvent(req.body, sig, WEBHOOK_SECRET);\n  } catch (err) {\n    return res.status(400).send(`Webhook Error: ${err.message}`);\n  }\n\n  switch (event.type) {\n    case 'payment_intent.succeeded':\n      await handlePaymentSuccess(event.data.object);\n      break;\n    case 'payment_intent.failed':\n      await handlePaymentFailure(event.data.object);\n      break;\n    default:\n      console.log(`Unhandled event type: ${event.type}`);\n  }\n\n  res.json({ received: true });\n});",
      "quality_signals": ["functional but minimal", "no retry logic", "no dead letter queue", "console.log instead of structured logging", "Diego's review suggested improvements that weren't implemented"]
    },
    {
      "number": 401,
      "title": "Fix: handle null in payment amount",
      "files_changed": 1,
      "additions": 5,
      "deletions": 2,
      "diff_snippet": "// BEFORE\nconst amount = payment.amount * 100;\n\n// AFTER\nconst amount = (payment.amount ?? 0) * 100;\nif (!payment.amount) {\n  logger.warn('Payment with null amount', { paymentId: payment.id });\n}",
      "quality_signals": ["nullish coalescing to 0 for money is dangerous", "should throw, not default", "no test"]
    }
  ],
  "review_quality_samples": [
    {
      "pr_reviewed": "#367 (Sofia's notification service)",
      "comment": "LGTM",
      "quality": "low — no substantive feedback on a junior's PR"
    }
  ],
  "kpis": {
    "sprint_velocity": "avg 7 points/sprint (was 12 last quarter)",
    "goals_completed": "4/10",
    "goals_detail": [
      { "goal": "Build Stripe webhook integration", "status": "completed", "impact": "functional but low quality" },
      { "goal": "Implement payment retry logic", "status": "missed", "impact": "not started" },
      { "goal": "Migrate payments to new schema", "status": "missed", "impact": "30% complete" },
      { "goal": "Reduce payment failure rate to <2%", "status": "missed", "impact": "still at 4.7%" },
      { "goal": "Add monitoring dashboards for payments", "status": "completed", "impact": "basic dashboards created" },
      { "goal": "Write runbook for payment incidents", "status": "completed", "impact": "used once during incident" },
      { "goal": "Review 3+ PRs per week", "status": "missed", "impact": "averaged 0.8/week" },
      { "goal": "Mentor new hire on payments domain", "status": "missed", "impact": "new hire went to Ana instead" },
      { "goal": "Ship subscription billing v2", "status": "missed", "impact": "not started" },
      { "goal": "Lead payments team retro", "status": "completed", "impact": "held but no action items followed up" }
    ]
  },
  "anthropic_usage": {
    "total_sessions": 23,
    "total_tokens": "180K",
    "use_cases": ["occasional debugging"],
    "adoption_rate": "34%",
    "quality_note": "Minimal AI adoption. Not using available tools to maintain velocity. This could be a symptom of broader disengagement or a philosophical objection — worth exploring in review."
  }
}
```

#### Sofia Torres — The Rocket (score: 8.1)

**Story:** 8 months in and already outperforming expectations. Steepest quality improvement curve on the team. Her early PRs were rough; her recent ones are nearly senior-level. Highest AI adoption on the team — she uses Claude for everything and it's working. She's learning faster because of it.

```json
{
  "summary": {
    "prs_opened": 38,
    "prs_merged": 35,
    "commits": 131,
    "reviews_given": 22,
    "avg_pr_size": "108 lines",
    "avg_review_turnaround": "6.8 hours",
    "test_coverage_trend": "54% → 79% (rising sharply)",
    "ai_tool_sessions": 201,
    "ai_tool_adoption": "94%"
  },
  "notable_prs": [
    {
      "number": 367,
      "title": "Build notification service with queue-based delivery",
      "files_changed": 8,
      "additions": 342,
      "deletions": 0,
      "diff_snippet": "export class NotificationService {\n  constructor(\n    private queue: JobQueue,\n    private channels: Map<string, NotificationChannel>\n  ) {}\n\n  async send(notification: Notification): Promise<void> {\n    const preferences = await this.getPreferences(notification.userId);\n    const enabledChannels = notification.channels.filter(\n      ch => preferences.enabled.includes(ch)\n    );\n\n    await Promise.all(\n      enabledChannels.map(channel =>\n        this.queue.enqueue('notification.send', {\n          channel,\n          notification,\n          retries: 3,\n          backoff: 'exponential'\n        })\n      )\n    );\n  }\n}",
      "quality_signals": ["queue-based from day one", "respects user preferences", "retry with backoff", "clean separation of concerns", "this is not typical junior work"]
    },
    {
      "number": 312,
      "title": "Add email verification flow",
      "files_changed": 4,
      "additions": 89,
      "deletions": 12,
      "diff_snippet": "// Early-career pattern: everything in one function\n// But: input validation, token generation, email sending, and\n// database update are cleanly separated into helper functions.\n// Shows she's learning from Ana's code review feedback.",
      "quality_signals": ["good structure for tenure", "adopted patterns from senior feedback", "tests included"]
    }
  ],
  "review_quality_samples": [
    {
      "pr_reviewed": "#398 (Diego's dark mode PR)",
      "comment": "I tested this on the notification preferences page and the contrast ratio on the muted text drops below WCAG AA. Here's a fix: change `text-gray-500` to `text-gray-400` on line 47. Screenshot attached.",
      "quality": "high — caught accessibility issue, tested it, provided fix"
    }
  ],
  "kpis": {
    "sprint_velocity": "avg 9 points/sprint (was 5 at start of quarter — 80% improvement)",
    "goals_completed": "7/10",
    "goals_detail": [
      { "goal": "Build notification service", "status": "completed", "impact": "zero incidents since launch" },
      { "goal": "Add email verification flow", "status": "completed", "impact": "reduced fake accounts 60%" },
      { "goal": "Improve personal test coverage to 75%", "status": "completed", "impact": "achieved 79%" },
      { "goal": "Complete backend fundamentals course", "status": "completed", "impact": "visible in code quality" },
      { "goal": "Give 2+ code reviews per week", "status": "completed", "impact": "averaged 2.4/week" },
      { "goal": "Ship user preferences page", "status": "completed", "impact": "adopted by 40% of users" },
      { "goal": "Reduce notification latency to <500ms", "status": "in_progress", "impact": "at 620ms, close" },
      { "goal": "Build admin dashboard for notifications", "status": "missed", "impact": "deprioritized" },
      { "goal": "Write technical blog post", "status": "completed", "impact": "published, 2k views" },
      { "goal": "Shadow on-call rotation (2 shifts)", "status": "missed", "impact": "scheduling conflict" }
    ]
  },
  "anthropic_usage": {
    "total_sessions": 201,
    "total_tokens": "3.1M",
    "use_cases": ["code review prep", "learning patterns from codebase", "test generation", "debugging", "documentation", "architecture questions"],
    "adoption_rate": "94%",
    "quality_note": "Highest AI adoption on the team. Uses Claude to accelerate learning — asks it to explain senior engineers' code, generates tests to understand edge cases, uses it to prep for code reviews. This is the ideal junior engineer AI usage pattern."
  }
}
```

### Seeded KPI Spreadsheet Data

Hardcode a Google Sheets-like dataset:

```json
{
  "quarter": "Q1 2026",
  "team": "Engineering",
  "kpi_summary": {
    "total_goals": 40,
    "completed": 26,
    "in_progress": 3,
    "missed": 11,
    "completion_rate": "65%"
  },
  "per_person": {
    "ana": { "completed": 8, "total": 10, "rate": "80%" },
    "diego": { "completed": 7, "total": 10, "rate": "70%" },
    "carlos": { "completed": 4, "total": 10, "rate": "40%" },
    "sofia": { "completed": 7, "total": 10, "rate": "70%" }
  }
}
```

### Seeded Anthropic Console Usage Data

This is the meta-metric. How well does each engineer use AI?

```json
{
  "team_total": {
    "sessions": 464,
    "tokens_used": "6.8M",
    "estimated_cost": "$48.20",
    "estimated_time_saved": "~120 hours"
  },
  "per_person": {
    "ana": {
      "sessions": 156,
      "tokens": "2.4M",
      "adoption": "89%",
      "primary_use": "architecture + debugging",
      "pattern": "high-leverage"
    },
    "diego": {
      "sessions": 84,
      "tokens": "1.1M",
      "adoption": "72%",
      "primary_use": "boilerplate + tests",
      "pattern": "productivity"
    },
    "carlos": {
      "sessions": 23,
      "tokens": "180K",
      "adoption": "34%",
      "primary_use": "occasional debugging",
      "pattern": "underutilized"
    },
    "sofia": {
      "sessions": 201,
      "tokens": "3.1M",
      "adoption": "94%",
      "primary_use": "learning + everything",
      "pattern": "accelerated learning"
    }
  }
}
```

### Cal.com Integration Data

After reviews are generated, the app can schedule review meetings via cal.com. Hardcode available slots:

```json
{
  "manager_calendar": "manager@orquesta.dev",
  "available_slots": [
    { "date": "2026-04-27", "time": "10:00", "duration": 45 },
    { "date": "2026-04-27", "time": "14:00", "duration": 45 },
    { "date": "2026-04-28", "time": "10:00", "duration": 45 },
    { "date": "2026-04-28", "time": "14:00", "duration": 45 }
  ],
  "scheduling_logic": "Lowest scores get earliest slots (more urgent). Carlos first, then Diego, then Sofia, then Ana."
}
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 + Tailwind + Framer Motion (animations) |
| Theme | Dark mode only. Near-black background. White/green/amber/red accents. |
| Backend | Python (FastAPI) |
| AI — Deep analysis | Claude Opus (extended thinking) — code quality judgment, review generation |
| AI — Fast tools | Claude Sonnet — tool calls, data retrieval, quick analysis |
| AI — Debate | Two Claude Sonnet instances — advocate vs. challenger |
| Data | All hardcoded JSON. No database. No external API calls. |
| Cal.com | Simulated — show the scheduling UI, hardcode the result |
| Diff rendering | react-diff-viewer or Monaco editor with diff mode |

### Architecture

```
[Next.js Frontend]
    |
    |-- Screen 1: Team overview (static)
    |-- Screen 2: Live review (streaming from backend)
    |-- Screen 3: Ranking (animated reveal)
    |
    v
[FastAPI Backend]
    |
    |-- /api/team                → returns team profiles
    |-- /api/review/start        → starts the review cycle (streaming SSE)
    |-- /api/review/{person}     → streams one person's review process
    |-- /api/ranking             → returns final ranking
    |-- /api/schedule            → simulates cal.com booking
    |
    |-- Claude Opus: reads code data, generates analysis with extended thinking
    |-- Claude Sonnet x2: advocate + challenger debate
    |-- All data from local JSON files
```

### The Agent Loop (per engineer)

```
1. Load engineer's GitHub data (PRs, commits, diffs, reviews)
2. Load engineer's KPI data
3. Load engineer's Anthropic usage data
4. Send to Claude Opus with extended thinking:
   "Analyze this engineer's quarter. Read their code. Judge quality.
    Identify patterns. Be specific — cite PRs and commits."
5. Stream the thinking to the frontend (the audience watches Claude reason)
6. Extract key findings
7. Launch Advocate (Claude Sonnet):
   "Based on this evidence, make the strongest case FOR this engineer."
8. Launch Challenger (Claude Sonnet):
   "Based on this evidence, challenge the advocate's position. Find weaknesses."
9. Advocate responds to challenger
10. Claude Opus synthesizes: final score + verdict + review brief
11. Stream everything to frontend in real time
```

---

## What NOT to Build

| Skip | Why |
|---|---|
| Auth/login | App opens to team overview. No login. |
| Real GitHub integration | All data is hardcoded JSON. No OAuth. |
| Real Anthropic Console API | Usage data is seeded. No real API. |
| Real cal.com integration | Show the UI, hardcode the scheduling result. |
| Settings/config | Nothing configurable. Everything pre-set. |
| Multiple teams | One team, 4 engineers. That's it. |
| Historical comparisons | One quarter only. No time range selector. |
| Export/PDF | Show the review on screen. No export. |
| Mobile | Desktop only. Optimized for demo screen. |

---

## Success Criteria for the Demo

- [ ] Judges say "holy shit" when they see Claude reading code diffs live
- [ ] The advocate/challenger debate makes the audience lean forward
- [ ] The ranking reveal feels like a competition results announcement
- [ ] Someone asks "does this work with real GitHub?" (means they want to buy it)
- [ ] The "$4.82 vs 40 hours" stat gets quoted back to you
- [ ] At least one judge mentions the AI adoption metric as clever
