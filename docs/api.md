# Orquesta API — Endpoint Reference

Base URL: `http://localhost:8000/api`

---

## Team

### `GET /api/team`
Returns all engineers in the system.

**Response**
```json
{
  "engineers": [
    { "id": "ana", "name": "Ana Oliveira", "role": "Senior Engineer", "avatar": null }
  ]
}
```

---

## Ranking

### `GET /api/ranking`
Returns engineers sorted by score, pre-populated with PRD scores and updated live as reviews complete.

**Response**
```json
{
  "rankings": [
    {
      "rank": 1,
      "id": "ana",
      "name": "Ana Oliveira",
      "score": 8.4,
      "verdict": "Exceptional contributor...",
      "stats": "3 PRs · 8/10 KPIs · 156 AI sessions",
      "evidence": { "pr_count": 3, "kpi_completion": "8/10", "ai_sessions": 156 }
    }
  ],
  "meta": { "total_cost": "$4.82", "duration_seconds": 204, "human_equivalent": "~40 hours" }
}
```

---

## Review

### `GET /api/review/{engineer_id}/stream`
Streams the full multi-agent debate for a hardcoded engineer as Server-Sent Events.

**Path params:** `engineer_id` — one of `ana`, `sofia`, `diego`, `carlos`

**SSE event sequence**

| Event | Payload | Agent |
|---|---|---|
| `scanning` | `{ "text": "..." }` | Sonnet — narrates PR data |
| `thinking` | `{ "text": "..." }` | Opus — deep analysis (adaptive thinking) |
| `advocate` | `{ "text": "..." }` | Sonnet — argues FOR the engineer |
| `challenger` | `{ "text": "..." }` | Sonnet — argues AGAINST |
| `advocate_reply` | `{ "text": "..." }` | Sonnet — defends against challenger |
| `verdict` | `{ "score": 8.4, "text": "...", "engineer_id": "ana" }` | Opus — final score |
| `done` | `{ "engineer_id": "ana" }` | — |
| `error` | `{ "message": "..." }` | on failure |

**Example**
```
curl -N http://localhost:8000/api/review/ana/stream
```

---

## Schedule

### `POST /api/schedule`
Books a 1-on-1 slot for an engineer. Slots are assigned in priority order: Carlos → Diego → Sofia → Ana (lowest score first).

**Request body**
```json
{ "engineer_id": "carlos" }
```

**Response**
```json
{ "engineer_id": "carlos", "slot": { "date": "2026-04-27", "time": "10:00" }, "status": "booked" }
```
Re-booking the same engineer returns `"status": "already_booked"` with the same slot.

**Available slots**

| Slot | Date | Time |
|---|---|---|
| 1 (Carlos) | 2026-04-27 | 10:00 |
| 2 (Diego) | 2026-04-27 | 14:00 |
| 3 (Sofia) | 2026-04-28 | 10:00 |
| 4 (Ana) | 2026-04-28 | 14:00 |

---

## GitHub Repo Analysis

Analyze contributors of any public GitHub repo using the same multi-agent pipeline.
Rate limits: 60 req/hr unauthenticated · 5,000 req/hr with a token.

### `POST /api/import/github`
Fetches contributor data from a public repo and creates an analysis session.

**Request body**
```json
{
  "repo": "owner/repo",
  "token": "ghp_...",
  "max_contributors": 6
}
```
`repo` also accepts full URLs (`https://github.com/owner/repo`).
`token` and `max_contributors` are optional (default: no token, 6 contributors).

**Response**
```json
{
  "session_id": "a1b2c3d4",
  "repo": "owner/repo",
  "contributors": [
    { "id": "username", "name": "Display Name", "prs_opened": 42, "prs_merged": 38, "commits": 210 }
  ]
}
```

---

### `GET /api/github/{session_id}/review/{engineer_id}/stream`
Streams the multi-agent debate for a GitHub contributor. Same SSE event sequence as `/api/review/{id}/stream`.

**Path params:**
- `session_id` — returned by `POST /api/import/github`
- `engineer_id` — GitHub username (from the `id` field in the import response)

**Example**
```
curl -N http://localhost:8000/api/github/a1b2c3d4/review/tiangolo/stream
```

---

### `GET /api/github/{session_id}/ranking`
Returns the contributor ranking for a session. Scores populate as reviews are streamed.

**Response**
```json
{
  "session_id": "a1b2c3d4",
  "rankings": [
    {
      "rank": 1,
      "id": "tiangolo",
      "name": "Sebastián Ramírez",
      "score": 9.1,
      "verdict": "...",
      "stats": "38/42 PRs merged · 210 commits · 12 reviews given",
      "evidence": { "pr_count": 42, "kpi_completion": "38/42 PRs merged", "ai_sessions": "N/A" }
    }
  ]
}
```
`score` is `null` for contributors whose review hasn't been run yet.
