# Workstation 4 — Frontend: Screen 1 (Team Overview) + Screen 3 (Ranking Reveal)

## Your Job
Build two of the three app screens. Use the shared components and types from Workstation 3. Work against mock data until the backend is ready.

---

## Prerequisite
You need the `/frontend` project from Workstation 3 to already exist (or bootstrap it yourself using those instructions, then build on top). Import everything from:
- `@/components/ui/*` — Card, Badge, ScoreBar, Avatar, Button
- `@/lib/types` — Engineer, Ranking, RankingResponse, etc.
- `@/lib/api` — getTeam, getRanking, startReview, scheduleReview

---

## Files to Create

```
/frontend/app/
  page.tsx          ← Screen 1: Team Overview
  ranking/
    page.tsx        ← Screen 3: Ranking Reveal
  components/
    EngineerCard.tsx
    RankingEntry.tsx
    ScheduleModal.tsx
```

---

## Screen 1 — Team Overview (`app/page.tsx`)

**What it looks like (from PRD):**
```
ORQUESTA                              [top-left]

        Your Engineering Team
           5 engineers · Q1 2026


  [ Ana ]   [ Diego ]  [ Carlos ]  [ Sofia ]
  Senior    Mid        Senior      Junior
  ░░░░░░░   ░░░░░░░    ░░░░░░░     ░░░░░░░
  not yet   not yet    not yet     not yet

       [ Run Performance Review Cycle ]
```

**Implementation:**
```tsx
'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Avatar, Badge, Card, Button } from '@/components/ui'
import { getTeam, startReview } from '@/lib/api'
import type { Engineer } from '@/lib/types'

// Mock data to use while backend isn't ready
const MOCK_ENGINEERS: Engineer[] = [
  { id: 'ana',    name: 'Ana Oliveira',  role: 'Senior Engineer' },
  { id: 'diego',  name: 'Diego Ramirez', role: 'Mid Engineer'    },
  { id: 'carlos', name: 'Carlos Mendez', role: 'Senior Engineer' },
  { id: 'sofia',  name: 'Sofia Torres',  role: 'Junior Engineer' },
]

export default function TeamOverview() {
  const router = useRouter()
  const [engineers, setEngineers] = useState<Engineer[]>(MOCK_ENGINEERS)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    getTeam()
      .then(data => setEngineers(data.engineers))
      .catch(() => {}) // fall back to mock if backend isn't up
  }, [])

  const handleStart = async () => {
    setLoading(true)
    try { await startReview() } catch {}
    router.push('/review/ana')
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-8">
      {/* Logo */}
      <div className="absolute top-6 left-8 text-lg font-bold tracking-widest text-text-secondary">
        ORQUESTA
      </div>

      {/* Title */}
      <div className="text-center mb-12">
        <h1 className="text-3xl font-light text-text-primary mb-2">Your Engineering Team</h1>
        <p className="text-text-muted text-sm">{engineers.length} engineers · Q1 2026</p>
      </div>

      {/* Engineer Cards */}
      <div className="flex gap-4 mb-14">
        {engineers.map(eng => (
          <EngineerCard key={eng.id} engineer={eng} />
        ))}
      </div>

      {/* CTA */}
      <Button onClick={handleStart} loading={loading} className="px-10 py-4 text-base">
        Run Performance Review Cycle
      </Button>
    </main>
  )
}
```

### `components/EngineerCard.tsx`
```tsx
import { Avatar, Card, Badge } from '@/components/ui'
import type { Engineer } from '@/lib/types'

export function EngineerCard({ engineer }: { engineer: Engineer }) {
  const roleVariant = engineer.role.includes('Senior') ? 'accent'
                    : engineer.role.includes('Junior') ? 'warning' : 'default'
  return (
    <Card className="w-36 flex flex-col items-center gap-3 py-5">
      <Avatar name={engineer.name} size="lg" />
      <div className="text-center">
        <p className="text-sm font-medium text-text-primary">
          {engineer.name.split(' ')[0]}
        </p>
        <Badge variant={roleVariant} className="mt-1">{engineer.role.split(' ')[0]}</Badge>
      </div>
      <div className="w-full text-center">
        <div className="text-xs text-text-muted font-mono px-2">
          ░░░░░░░░<br/>not yet reviewed
        </div>
      </div>
    </Card>
  )
}
```

---

## Screen 3 — Ranking Reveal (`app/ranking/page.tsx`)

**What it looks like (from PRD):**
```
ORQUESTA

      Q1 2026 Performance Ranking
      Based on 614 commits, 159 PRs, ...

  #1  ANA OLIVEIRA         8.4/10  ████████░░
      "Exceptional engineer constrained by process"
      47 PRs · 3 architectural wins · 89% AI adoption
      [see full evidence]
  ─────────────────────────────────────────────
  #2  SOFIA TORRES         8.1/10  ████████░░
      ...

  Total AI cost: $4.82 | Time: 3m 24s | Human equiv: ~40 hours
  [ Schedule Review Meetings via cal.com ]
```

**Implementation:**
```tsx
'use client'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Card, Badge, ScoreBar, Button } from '@/components/ui'
import { getRanking, scheduleReview } from '@/lib/api'
import type { RankingResponse, Ranking } from '@/lib/types'
import { RankingEntry } from '@/app/components/RankingEntry'
import { ScheduleModal } from '@/app/components/ScheduleModal'

// Mock data
const MOCK_RANKING: RankingResponse = {
  rankings: [
    { rank: 1, id: 'ana',    name: 'Ana Oliveira',  score: 8.4, verdict: 'Exceptional engineer constrained by process.',    stats: '47 PRs · 3 architectural wins · 89% AI adoption', evidence: { prs: 47, commits: 186, reviews_given: 34, ai_adoption: '89%' } },
    { rank: 2, id: 'sofia',  name: 'Sofia Torres',  score: 8.1, verdict: 'Fastest growth trajectory on the team.',           stats: '38 PRs · steepest quality curve · 94% AI adoption', evidence: { prs: 38, commits: 131, reviews_given: 22, ai_adoption: '94%' } },
    { rank: 3, id: 'diego',  name: 'Diego Ramirez', score: 7.6, verdict: 'Reliable executor, ready for more scope.',         stats: '52 PRs · highest review quality · 72% AI adoption', evidence: { prs: 52, commits: 203, reviews_given: 48, ai_adoption: '72%' } },
    { rank: 4, id: 'carlos', name: 'Carlos Mendez', score: 6.2, verdict: 'Senior talent in a drift pattern.',                stats: '29 PRs · declining quality trend · 34% AI adoption', evidence: { prs: 29, commits: 94, reviews_given: 11, ai_adoption: '34%' } },
  ],
  meta: { total_cost: '$4.82', duration_seconds: 204, human_equivalent: '~40 hours' }
}

export default function RankingPage() {
  const [data, setData] = useState<RankingResponse>(MOCK_RANKING)
  const [scheduleOpen, setScheduleOpen] = useState(false)

  useEffect(() => {
    getRanking()
      .then(setData)
      .catch(() => {})
  }, [])

  const container = { hidden: {}, show: { transition: { staggerChildren: 0.5 } } }
  const item = { hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0, transition: { duration: 0.5 } } }

  return (
    <main className="min-h-screen flex flex-col items-center py-16 px-8">
      <div className="absolute top-6 left-8 text-lg font-bold tracking-widest text-text-secondary">ORQUESTA</div>

      <div className="text-center mb-10">
        <h1 className="text-2xl font-light mb-1">Q1 2026 Performance Ranking</h1>
        <p className="text-text-muted text-sm">
          Based on 614 commits, 159 PRs, 112 code reviews, 40 KPIs
        </p>
      </div>

      <motion.div
        className="w-full max-w-2xl border border-bg-border rounded-xl overflow-hidden"
        variants={container} initial="hidden" animate="show"
      >
        {data.rankings.map((r, i) => (
          <motion.div key={r.id} variants={item}>
            <RankingEntry ranking={r} isLast={i === data.rankings.length - 1} />
          </motion.div>
        ))}
      </motion.div>

      {/* Bottom stats */}
      <div className="mt-8 text-center text-sm text-text-muted space-y-1">
        <p>Total AI cost of this review cycle: <span className="text-accent">{data.meta.total_cost}</span></p>
        <p>Time: {Math.floor(data.meta.duration_seconds / 60)}m {data.meta.duration_seconds % 60}s</p>
        <p>Human equivalent: <span className="text-text-secondary">{data.meta.human_equivalent} of manager time</span></p>
      </div>

      <Button variant="ghost" className="mt-8" onClick={() => setScheduleOpen(true)}>
        Schedule Review Meetings via cal.com
      </Button>

      {scheduleOpen && (
        <ScheduleModal
          rankings={data.rankings}
          onClose={() => setScheduleOpen(false)}
          onSchedule={scheduleReview}
        />
      )}
    </main>
  )
}
```

### `components/RankingEntry.tsx`
```tsx
'use client'
import { useState } from 'react'
import { ScoreBar, Badge } from '@/components/ui'
import type { Ranking } from '@/lib/types'

export function RankingEntry({ ranking, isLast }: { ranking: Ranking; isLast: boolean }) {
  const [expanded, setExpanded] = useState(false)
  const scoreColor = ranking.score >= 8 ? 'text-accent' : ranking.score >= 7 ? 'text-amber-400' : 'text-red-400'

  return (
    <div className={`p-5 bg-bg-surface ${!isLast ? 'border-b border-bg-border' : ''}`}>
      <div className="flex items-start gap-4">
        <span className="text-text-muted font-mono text-sm w-6 shrink-0">#{ranking.rank}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <span className="font-semibold text-text-primary">{ranking.name.toUpperCase()}</span>
            <span className={`font-mono font-bold ${scoreColor}`}>{ranking.score}/10</span>
          </div>
          <ScoreBar score={ranking.score} />
          <p className="text-text-secondary text-sm mt-2 italic">"{ranking.verdict}"</p>
          <p className="text-text-muted text-xs mt-1">{ranking.stats}</p>
          <button
            className="text-accent text-xs mt-2 hover:underline"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? 'hide evidence' : '[see full evidence]'}
          </button>
          {expanded && (
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-text-secondary font-mono">
              <span>PRs merged: {ranking.evidence.prs}</span>
              <span>Commits: {ranking.evidence.commits}</span>
              <span>Reviews given: {ranking.evidence.reviews_given}</span>
              <span>AI adoption: {ranking.evidence.ai_adoption}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
```

### `components/ScheduleModal.tsx`
```tsx
'use client'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { Card, Button } from '@/components/ui'
import type { Ranking } from '@/lib/types'

export function ScheduleModal({ rankings, onClose, onSchedule }: {
  rankings: Ranking[]
  onClose: () => void
  onSchedule: (id: string) => Promise<any>
}) {
  const [scheduled, setScheduled] = useState<Record<string, boolean>>({})
  const ordered = [...rankings].sort((a, b) => a.score - b.score) // lowest first

  const handle = async (id: string) => {
    await onSchedule(id)
    setScheduled(prev => ({ ...prev, [id]: true }))
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="bg-bg-surface border border-bg-border rounded-xl p-6 w-96"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="font-semibold mb-4">Schedule Review Meetings</h2>
        <p className="text-text-muted text-xs mb-4">Lowest scores scheduled first (most urgent)</p>
        <div className="space-y-3">
          {ordered.map(r => (
            <div key={r.id} className="flex items-center justify-between">
              <div>
                <p className="text-sm">{r.name}</p>
                <p className="text-xs text-text-muted">Score: {r.score}/10</p>
              </div>
              {scheduled[r.id]
                ? <span className="text-accent text-xs">✓ Booked</span>
                : <Button variant="ghost" className="text-xs py-1 px-3" onClick={() => handle(r.id)}>Book</Button>
              }
            </div>
          ))}
        </div>
        <button className="mt-5 text-text-muted text-xs hover:text-text-secondary" onClick={onClose}>close</button>
      </motion.div>
    </div>
  )
}
```

---

## Done When
- `http://localhost:3000` shows 4 engineer cards with "not yet reviewed" state
- "Run Performance Review Cycle" button routes to `/review/ana`
- `http://localhost:3000/ranking` shows animated stagger reveal with mock data
- `[see full evidence]` expands correctly
- Schedule modal opens and marks engineers as booked

## Dependency
Needs Workstation 3's project scaffold and components. If WS3 isn't done, run their bootstrap commands first, then build here.
