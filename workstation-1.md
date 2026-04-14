# Workstation 1 — Data Layer (Seed JSON Files)

## Your Job
Create all hardcoded JSON data files. No code, no server, no frontend. Pure data.
Everything needed is fully specified in `PRD.md` (lines 151–582). Copy it faithfully and structure it exactly as described below so the backend can load it by path.

---

## Deliverables

```
/data/
  engineers/
    ana.json
    diego.json
    carlos.json
    sofia.json
  kpis.json
  anthropic_usage.json
  calendar.json
```

---

## Engineer JSON Schema (all 4 files must match this shape)

```json
{
  "id": "ana",
  "name": "Ana Oliveira",
  "role": "Senior Engineer",
  "github": "ana-oliveira",
  "salary": "$150k",
  "tenure": "2.5 years",
  "timezone": "São Paulo UTC-3",
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
      "description": "...",
      "diff_snippet": "// BEFORE\n...\n// AFTER\n...",
      "review_comments": 3,
      "quality_signals": ["parallel async", "error propagation", "zero behavior change"]
    }
  ],
  "review_quality_samples": [
    {
      "pr_reviewed": "#287 (Diego's caching PR)",
      "comment": "...",
      "quality": "high — caught a concurrency bug with a specific fix"
    }
  ],
  "kpis": {
    "sprint_velocity": "avg 13 points/sprint (team avg: 10)",
    "goals_completed": "8/10",
    "goals_detail": [
      { "goal": "Migrate auth to async pipeline", "status": "completed", "impact": "p95 latency -58%" }
    ]
  },
  "anthropic_usage": {
    "total_sessions": 156,
    "total_tokens": "2.4M",
    "use_cases": ["code review prep", "architecture doc drafting"],
    "adoption_rate": "89%",
    "quality_note": "Uses Claude for high-leverage tasks — architecture and debugging, not just autocomplete."
  }
}
```

---

## `kpis.json`

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
    "ana":   { "completed": 8, "total": 10, "rate": "80%" },
    "diego": { "completed": 7, "total": 10, "rate": "70%" },
    "carlos":{ "completed": 4, "total": 10, "rate": "40%" },
    "sofia": { "completed": 7, "total": 10, "rate": "70%" }
  }
}
```

---

## `anthropic_usage.json`

```json
{
  "team_total": {
    "sessions": 464,
    "tokens_used": "6.8M",
    "estimated_cost": "$48.20",
    "estimated_time_saved": "~120 hours"
  },
  "per_person": {
    "ana":   { "sessions": 156, "tokens": "2.4M", "adoption": "89%", "primary_use": "architecture + debugging", "pattern": "high-leverage" },
    "diego": { "sessions": 84,  "tokens": "1.1M", "adoption": "72%", "primary_use": "boilerplate + tests",       "pattern": "productivity" },
    "carlos":{ "sessions": 23,  "tokens": "180K", "adoption": "34%", "primary_use": "occasional debugging",      "pattern": "underutilized" },
    "sofia": { "sessions": 201, "tokens": "3.1M", "adoption": "94%", "primary_use": "learning + everything",     "pattern": "accelerated learning" }
  }
}
```

---

## `calendar.json`

```json
{
  "manager_calendar": "manager@orquesta.dev",
  "available_slots": [
    { "date": "2026-04-27", "time": "10:00", "duration": 45 },
    { "date": "2026-04-27", "time": "14:00", "duration": 45 },
    { "date": "2026-04-28", "time": "10:00", "duration": 45 },
    { "date": "2026-04-28", "time": "14:00", "duration": 45 }
  ],
  "scheduling_logic": "Lowest scores get earliest slots. Carlos first, then Diego, then Sofia, then Ana."
}
```

---

## Done When
- All 7 JSON files are present under `/data/`
- Each file is valid JSON (`python -m json.tool data/engineers/ana.json` passes)
- All 4 engineer files share the same top-level keys

## No Dependencies
This workstation has zero dependencies on other workstations.
