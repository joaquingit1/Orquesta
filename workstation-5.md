# Workstation 5 — Frontend: Screen 2 (Live Review Split-Screen)

## Your Job
Build the main demo screen — the live review. This is where 70% of demo time lives. It splits the viewport into a code/evidence panel (left) and a streaming agent panel (right), driven by SSE events from the backend.

---

## Prerequisite
Needs the `/frontend` project from Workstation 3. Import from:
- `@/components/ui/*` — Card, Badge, StreamingText, Avatar
- `@/lib/types` — SSEEvent, SSEEventType
- `@/lib/api` — getReviewStream

---

## Files to Create

```
/frontend/app/review/
  [engineer_id]/
    page.tsx              ← Screen 2 entry point (reads URL param)
  components/
    CodeDiffPanel.tsx     ← left 55%: cycling diffs + metrics
    AgentPanel.tsx        ← right 45%: streaming thinking + debate + verdict
    DebateBox.tsx         ← individual agent speech panel
    VerdictCard.tsx       ← score reveal with count-up animation
    MetricsCard.tsx       ← PR/commit/review stats
```

---

## Mock SSE Data (use this until backend is ready)

```ts
// lib/mockStream.ts
export const MOCK_ANA_EVENTS = [
  { type: 'scanning', text: 'Loading PR #342 — auth/middleware.ts...' },
  { type: 'scanning', text: ' Refactor: 487 additions, 891 deletions.' },
  { type: 'thinking', text: 'This async refactor eliminates 4 levels of nesting. ' },
  { type: 'thinking', text: 'The parallel Promise.all() pattern shows she understands the event loop deeply. ' },
  { type: 'thinking', text: 'Deletion ratio of 1.8:1 signals simplification, not just rewriting.' },
  { type: 'advocate', text: "Ana's auth refactor reduced p95 latency by 58% with zero behavior change — " },
  { type: 'advocate', text: "that's senior-level architectural judgment, not just implementation." },
  { type: 'challenger', text: "But test coverage dropped from 78% to 61% this quarter — " },
  { type: 'challenger', text: "three hotfixes had no tests added. Velocity over quality is a pattern, not a one-off." },
  { type: 'advocate_reply', text: "The coverage drop tracks exactly with the two incident weeks in March. " },
  { type: 'advocate_reply', text: "That's not a habit — it's a constraint." },
  { type: 'verdict', text: 'Exceptional engineer constrained by process.', score: 8.4, engineer_id: 'ana' },
  { type: 'done', engineer_id: 'ana' },
]

export async function* mockStream(events: typeof MOCK_ANA_EVENTS, delayMs = 80) {
  for (const event of events) {
    await new Promise(r => setTimeout(r, delayMs))
    yield event
  }
}
```

---

## Mock Code Diff Data (cycling left panel)

```ts
// lib/mockDiffs.ts
export const ANA_DIFFS = [
  {
    pr: 342,
    title: 'Refactor auth middleware to async pipeline',
    oldCode: `function authMiddleware(req, res, next) {
  const token = req.headers.authorization;
  const user = validateTokenSync(token);
  if (!user) return res.status(401).send('Unauthorized');
  const permissions = fetchPermissionsSync(user.id);
  req.user = { ...user, permissions };
  next();
}`,
    newCode: `async function authMiddleware(req, res, next) {
  try {
    const token = req.headers.authorization;
    const [user, permissions] = await Promise.all([
      validateToken(token),
      token ? fetchPermissions(extractUserId(token)) : null
    ]);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    req.user = { ...user, permissions };
    next();
  } catch (err) {
    next(new AuthError(err.message, { cause: err }));
  }
}`,
  },
  {
    pr: 298,
    title: 'Implement rate limiter with sliding window',
    oldCode: `// Leaky bucket — causes false positives under burst
class LeakyBucketLimiter {
  check(key) {
    const count = this.cache.get(key) || 0;
    if (count >= this.limit) return false;
    this.cache.set(key, count + 1, this.ttl);
    return true;
  }
}`,
    newCode: `export class SlidingWindowRateLimiter {
  async isAllowed(key: string) {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    const pipe = this.redis.pipeline();
    pipe.zremrangebyscore(key, 0, windowStart);
    pipe.zadd(key, now, \`\${now}:\${crypto.randomUUID()}\`);
    pipe.zcard(key);
    pipe.pexpire(key, this.windowMs);
    const results = await pipe.exec();
    const count = results[2][1] as number;
    return { allowed: count <= this.maxRequests, remaining: Math.max(0, this.maxRequests - count) };
  }
}`,
  },
]
```

---

## Main Page — `app/review/[engineer_id]/page.tsx`

```tsx
'use client'
import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getReviewStream } from '@/lib/api'
import { CodeDiffPanel } from '../components/CodeDiffPanel'
import { AgentPanel } from '../components/AgentPanel'
import { ANA_DIFFS } from '@/lib/mockDiffs'
import { MOCK_ANA_EVENTS, mockStream } from '@/lib/mockStream'

interface AgentState {
  scanning: string
  thinking: string
  advocate: string
  challenger: string
  advocate_reply: string
  verdict: { score: number; text: string } | null
  done: boolean
  activePhase: 'scanning' | 'thinking' | 'advocate' | 'challenger' | 'advocate_reply' | 'verdict' | null
}

const ENGINEER_NAMES: Record<string, string> = {
  ana: 'Ana Oliveira', diego: 'Diego Ramirez', carlos: 'Carlos Mendez', sofia: 'Sofia Torres'
}
const ENGINEER_ROLES: Record<string, string> = {
  ana: 'Senior Engineer', diego: 'Mid Engineer', carlos: 'Senior Engineer', sofia: 'Junior Engineer'
}

export default function ReviewPage() {
  const { engineer_id } = useParams<{ engineer_id: string }>()
  const router = useRouter()
  const [state, setState] = useState<AgentState>({
    scanning: '', thinking: '', advocate: '', challenger: '',
    advocate_reply: '', verdict: null, done: false, activePhase: 'scanning'
  })
  const [currentDiffIndex, setCurrentDiffIndex] = useState(0)

  // Cycle through diffs as scanning progresses
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentDiffIndex(i => (i + 1) % ANA_DIFFS.length)
    }, 8000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    // Try real SSE first, fall back to mock
    let cleanup = () => {}

    const tryRealStream = () => {
      try {
        const source = getReviewStream(engineer_id)

        const handle = (type: string) => (e: MessageEvent) => {
          const data = JSON.parse(e.data)
          setState(prev => ({
            ...prev,
            activePhase: type as any,
            ...(type === 'verdict'
              ? { verdict: { score: data.score, text: data.text } }
              : type !== 'done'
              ? { [type]: prev[type as keyof AgentState] as string + (data.text ?? '') }
              : { done: true }
            )
          }))
          if (type === 'done') {
            source.close()
            setTimeout(() => router.push('/ranking'), 2000)
          }
        }

        ;['scanning','thinking','advocate','challenger','advocate_reply','verdict','done']
          .forEach(t => source.addEventListener(t, handle(t)))

        source.onerror = () => { source.close(); runMockStream() }
        cleanup = () => source.close()
      } catch {
        runMockStream()
      }
    }

    const runMockStream = async () => {
      for await (const event of mockStream(MOCK_ANA_EVENTS, 60)) {
        setState(prev => ({
          ...prev,
          activePhase: event.type as any,
          ...(event.type === 'verdict'
            ? { verdict: { score: event.score!, text: event.text! } }
            : event.type !== 'done'
            ? { [event.type]: (prev[event.type as keyof AgentState] as string ?? '') + (event.text ?? '') }
            : { done: true }
          )
        }))
        if (event.type === 'done') {
          setTimeout(() => router.push('/ranking'), 2000)
        }
      }
    }

    tryRealStream()
    return () => cleanup()
  }, [engineer_id, router])

  return (
    <div className="h-screen flex overflow-hidden bg-bg">
      {/* Left: Code + Evidence */}
      <div className="w-[55%] border-r border-bg-border flex flex-col">
        <div className="px-6 pt-6 pb-3 border-b border-bg-border">
          <p className="text-text-muted text-xs uppercase tracking-widest mb-1">Currently reviewing</p>
          <h2 className="text-xl font-semibold">{ENGINEER_NAMES[engineer_id]}</h2>
          <p className="text-text-secondary text-sm">{ENGINEER_ROLES[engineer_id]}</p>
        </div>
        <CodeDiffPanel
          diffs={ANA_DIFFS}
          currentIndex={currentDiffIndex}
          scanningText={state.scanning}
        />
      </div>

      {/* Right: Agent Panel */}
      <div className="w-[45%] overflow-y-auto">
        <AgentPanel state={state} />
      </div>
    </div>
  )
}
```

---

## `components/CodeDiffPanel.tsx`

```tsx
'use client'
import { motion, AnimatePresence } from 'framer-motion'
import ReactDiffViewer from 'react-diff-viewer-continued'
import { Card } from '@/components/ui'

interface Diff { pr: number; title: string; oldCode: string; newCode: string }

export function CodeDiffPanel({ diffs, currentIndex, scanningText }: {
  diffs: Diff[]
  currentIndex: number
  scanningText: string
}) {
  const diff = diffs[currentIndex]
  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-4">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.4 }}
        >
          <Card className="overflow-hidden p-0">
            <div className="px-4 py-2 border-b border-bg-border flex items-center gap-2">
              <span className="text-text-muted text-xs font-mono">PR #{diff.pr}</span>
              <span className="text-text-secondary text-xs">{diff.title}</span>
            </div>
            <div className="text-xs font-mono overflow-auto max-h-72">
              <ReactDiffViewer
                oldValue={diff.oldCode}
                newValue={diff.newCode}
                splitView={false}
                useDarkTheme={true}
                styles={{
                  variables: {
                    dark: {
                      diffViewerBackground: '#1a1a1a',
                      addedBackground: 'rgba(62,207,142,0.1)',
                      removedBackground: 'rgba(248,113,113,0.1)',
                      addedColor: '#3ecf8e',
                      removedColor: '#f87171',
                      codeFoldBackground: '#222',
                    }
                  }
                }}
              />
            </div>
          </Card>
        </motion.div>
      </AnimatePresence>

      {/* Metrics Card */}
      <MetricsCard />
    </div>
  )
}

function MetricsCard() {
  return (
    <Card>
      <p className="text-text-muted text-xs uppercase tracking-widest mb-3">Metrics</p>
      <div className="grid grid-cols-2 gap-2 text-sm font-mono">
        {[
          ['PRs', '47'], ['Commits', '186'],
          ['Reviews given', '34'], ['AI usage', '89%'],
          ['KPIs hit', '8/10'], ['Coverage', '78%→61%'],
        ].map(([label, val]) => (
          <div key={label}>
            <span className="text-text-muted text-xs">{label}</span>
            <p className="text-text-primary">{val}</p>
          </div>
        ))}
      </div>
    </Card>
  )
}
```

---

## `components/AgentPanel.tsx`

```tsx
'use client'
import { motion, AnimatePresence } from 'framer-motion'
import { StreamingText, Card } from '@/components/ui'
import { DebateBox } from './DebateBox'
import { VerdictCard } from './VerdictCard'

export function AgentPanel({ state }: { state: any }) {
  const show = (phase: string) => !!state[phase] || state.activePhase === phase

  return (
    <div className="p-6 space-y-4">
      {/* SCANNING */}
      <AnimatePresence>
        {show('scanning') && (
          <motion.div key="scanning" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="border-bg-border">
              <p className="text-text-muted text-xs uppercase tracking-widest mb-2">Scanning</p>
              <StreamingText text={state.scanning} className="text-sm text-text-secondary font-mono" />
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* THINKING */}
      <AnimatePresence>
        {show('thinking') && (
          <motion.div key="thinking" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="border-accent/20 bg-accent/5">
              <p className="text-accent text-xs uppercase tracking-widest mb-2">Agent Thinking</p>
              <StreamingText text={state.thinking} className="text-sm text-text-primary italic" />
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ADVOCATE */}
      <AnimatePresence>
        {show('advocate') && (
          <motion.div key="advocate" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <DebateBox
              label="Advocate"
              text={state.advocate + (state.advocate_reply ? '\n\n' + state.advocate_reply : '')}
              accentColor="#3ecf8e"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* CHALLENGER */}
      <AnimatePresence>
        {show('challenger') && (
          <motion.div key="challenger" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <DebateBox label="Challenger" text={state.challenger} accentColor="#fbbf24" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* VERDICT */}
      <AnimatePresence>
        {state.verdict && (
          <motion.div key="verdict" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
            <VerdictCard score={state.verdict.score} text={state.verdict.text} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
```

---

## `components/DebateBox.tsx`

```tsx
import { StreamingText } from '@/components/ui'

export function DebateBox({ label, text, accentColor }: {
  label: string; text: string; accentColor: string
}) {
  return (
    <div
      className="rounded-xl p-4 bg-bg-surface"
      style={{ borderLeft: `3px solid ${accentColor}` }}
    >
      <p className="text-xs uppercase tracking-widest mb-2 font-medium" style={{ color: accentColor }}>
        {label}
      </p>
      <StreamingText text={text} className="text-sm text-text-primary leading-relaxed" />
    </div>
  )
}
```

---

## `components/VerdictCard.tsx`

```tsx
'use client'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

export function VerdictCard({ score, text }: { score: number; text: string }) {
  const [displayed, setDisplayed] = useState(0)

  // Count up to score
  useEffect(() => {
    let frame = 0
    const total = 60
    const interval = setInterval(() => {
      frame++
      setDisplayed(parseFloat((score * frame / total).toFixed(1)))
      if (frame >= total) clearInterval(interval)
    }, 20)
    return () => clearInterval(interval)
  }, [score])

  const color = score >= 8 ? '#3ecf8e' : score >= 7 ? '#fbbf24' : '#f87171'

  return (
    <motion.div
      className="rounded-xl p-5 bg-bg-surface border"
      style={{ borderColor: color, boxShadow: `0 0 30px ${color}22` }}
    >
      <p className="text-xs uppercase tracking-widest text-text-muted mb-3">Verdict</p>
      <div className="flex items-end gap-2 mb-2">
        <span className="text-4xl font-bold font-mono" style={{ color }}>{displayed}</span>
        <span className="text-text-muted text-lg mb-1">/10</span>
      </div>
      <p className="text-text-primary text-sm italic">"{text}"</p>
    </motion.div>
  )
}
```

---

## Done When
- `http://localhost:3000/review/ana` shows split-screen layout
- Left panel cycles through two code diffs every 8 seconds with react-diff-viewer
- Right panel sections appear sequentially as mock events stream in
- Verdict score counts up with animation
- After `done` event, page routes to `/ranking` after 2 seconds
- Works with both real SSE (backend up) and mock fallback (backend down)

## Dependency
Needs Workstation 3's project scaffold and components. Does not need WS1 or WS2 to be complete (mock data + fallback handles it).
