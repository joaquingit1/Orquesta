# Workstation 3 — Frontend: Next.js Scaffold + Design System

## Your Job
Bootstrap the Next.js project and build the shared design system. No screen logic — just the foundation that Workstations 4 and 5 will build on. Your components and types are the contract.

---

## Stack
- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Framer Motion
- `react-diff-viewer-continued` (for Screen 2)

---

## File Structure to Create

```
/frontend/
  package.json
  tsconfig.json
  tailwind.config.ts
  postcss.config.js
  next.config.ts
  app/
    layout.tsx
    globals.css
    page.tsx              ← placeholder "coming soon" for now
  components/
    ui/
      Card.tsx
      Badge.tsx
      ScoreBar.tsx
      StreamingText.tsx
      Avatar.tsx
      Button.tsx
  lib/
    types.ts              ← shared TypeScript types (WS4 + WS5 import from here)
    api.ts                ← fetch + SSE helpers (WS4 + WS5 call these)
```

---

## Bootstrap Commands
```bash
npx create-next-app@14 frontend --typescript --tailwind --app --no-src-dir
cd frontend
npm install framer-motion react-diff-viewer-continued
```

---

## `tailwind.config.ts`

```ts
import type { Config } from 'tailwindcss'

export default {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: '#0f0f0f',
          surface: '#1a1a1a',
          elevated: '#222222',
          border: '#2a2a2a',
        },
        accent: {
          DEFAULT: '#3ecf8e',
          dim: '#1a7a52',
          glow: 'rgba(62, 207, 142, 0.15)',
        },
        text: {
          primary: '#ffffff',
          secondary: '#888888',
          muted: '#444444',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
    },
  },
} satisfies Config
```

---

## `app/globals.css`
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

body {
  background-color: #0f0f0f;
  color: #ffffff;
  font-family: 'Inter', sans-serif;
}

/* Scrollbar */
::-webkit-scrollbar { width: 4px; }
::-webkit-scrollbar-track { background: #1a1a1a; }
::-webkit-scrollbar-thumb { background: #333; border-radius: 2px; }
```

---

## `app/layout.tsx`
```tsx
import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Orquesta',
  description: 'AI Performance Review Engine',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-bg min-h-screen text-text-primary antialiased">
        {children}
      </body>
    </html>
  )
}
```

---

## `lib/types.ts`
**This file is the contract between all frontend workstations. Do not change field names.**

```ts
export interface Engineer {
  id: string
  name: string
  role: string
  avatar?: string | null
}

export interface Evidence {
  prs: number
  commits: number
  reviews_given: number
  ai_adoption: string
}

export interface Ranking {
  rank: number
  id: string
  name: string
  score: number
  verdict: string
  stats: string
  evidence: Evidence
}

export interface RankingResponse {
  rankings: Ranking[]
  meta: {
    total_cost: string
    duration_seconds: number
    human_equivalent: string
  }
}

export interface TeamResponse {
  engineers: Engineer[]
}

export type SSEEventType =
  | 'scanning'
  | 'thinking'
  | 'advocate'
  | 'challenger'
  | 'advocate_reply'
  | 'verdict'
  | 'done'

export interface SSEEvent {
  type: SSEEventType
  text?: string
  score?: number
  engineer_id?: string
}

export interface ScheduleResponse {
  engineer_id: string
  slot: { date: string; time: string }
  status: string
}
```

---

## `lib/api.ts`
**This file wraps all backend calls. WS4 and WS5 import only from here.**

```ts
export const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

export async function getTeam(): Promise<import('./types').TeamResponse> {
  const res = await fetch(`${API_BASE}/api/team`)
  if (!res.ok) throw new Error('Failed to fetch team')
  return res.json()
}

export async function getRanking(): Promise<import('./types').RankingResponse> {
  const res = await fetch(`${API_BASE}/api/ranking`)
  if (!res.ok) throw new Error('Failed to fetch ranking')
  return res.json()
}

export async function startReview(): Promise<{ status: string }> {
  const res = await fetch(`${API_BASE}/api/review/start`, { method: 'POST' })
  if (!res.ok) throw new Error('Failed to start review')
  return res.json()
}

export function getReviewStream(engineerId: string): EventSource {
  return new EventSource(`${API_BASE}/api/review/${engineerId}/stream`)
}

export async function scheduleReview(engineerId: string): Promise<import('./types').ScheduleResponse> {
  const res = await fetch(`${API_BASE}/api/schedule`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ engineer_id: engineerId }),
  })
  if (!res.ok) throw new Error('Failed to schedule review')
  return res.json()
}
```

---

## Components to Build

### `components/ui/Card.tsx`
```tsx
import { cn } from '@/lib/utils'

interface CardProps {
  children: React.ReactNode
  className?: string
  glow?: boolean   // adds green border glow for active states
}

export function Card({ children, className, glow }: CardProps) {
  return (
    <div className={cn(
      'bg-bg-surface border border-bg-border rounded-xl p-4',
      glow && 'border-accent shadow-[0_0_20px_rgba(62,207,142,0.15)]',
      className
    )}>
      {children}
    </div>
  )
}
```

### `components/ui/Badge.tsx`
```tsx
type BadgeVariant = 'default' | 'accent' | 'warning' | 'danger' | 'muted'

export function Badge({ children, variant = 'default' }: { children: React.ReactNode; variant?: BadgeVariant }) {
  const styles: Record<BadgeVariant, string> = {
    default:  'bg-bg-elevated text-text-secondary border border-bg-border',
    accent:   'bg-accent/10 text-accent border border-accent/30',
    warning:  'bg-amber-500/10 text-amber-400 border border-amber-500/30',
    danger:   'bg-red-500/10 text-red-400 border border-red-500/30',
    muted:    'bg-bg-elevated text-text-muted border border-bg-border',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${styles[variant]}`}>
      {children}
    </span>
  )
}
```

### `components/ui/ScoreBar.tsx`
```tsx
'use client'
import { motion } from 'framer-motion'

export function ScoreBar({ score, max = 10 }: { score: number; max?: number }) {
  const pct = (score / max) * 100
  const color = score >= 8 ? '#3ecf8e' : score >= 7 ? '#fbbf24' : '#f87171'

  return (
    <div className="w-full bg-bg-elevated rounded-full h-1.5 overflow-hidden">
      <motion.div
        className="h-full rounded-full"
        style={{ backgroundColor: color }}
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 1.2, ease: 'easeOut', delay: 0.3 }}
      />
    </div>
  )
}
```

### `components/ui/StreamingText.tsx`
```tsx
'use client'
import { motion } from 'framer-motion'

export function StreamingText({ text, className }: { text: string; className?: string }) {
  return (
    <span className={className}>
      {text}
      {text && (
        <motion.span
          className="inline-block w-0.5 h-4 bg-accent ml-0.5 align-middle"
          animate={{ opacity: [1, 0] }}
          transition={{ duration: 0.8, repeat: Infinity }}
        />
      )}
    </span>
  )
}
```

### `components/ui/Avatar.tsx`
```tsx
export function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  const sizes = { sm: 'w-8 h-8 text-sm', md: 'w-12 h-12 text-base', lg: 'w-16 h-16 text-xl' }
  // deterministic color from name
  const colors = ['#3ecf8e', '#fbbf24', '#f87171', '#60a5fa', '#a78bfa']
  const color = colors[name.charCodeAt(0) % colors.length]

  return (
    <div className={`${sizes[size]} rounded-full flex items-center justify-center font-semibold text-bg`}
         style={{ backgroundColor: color }}>
      {initials}
    </div>
  )
}
```

### `components/ui/Button.tsx`
```tsx
'use client'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost'
  loading?: boolean
}

export function Button({ children, variant = 'primary', loading, className, ...props }: ButtonProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        'px-6 py-3 rounded-lg font-medium text-sm transition-colors',
        variant === 'primary' && 'bg-accent text-bg hover:bg-accent/90',
        variant === 'ghost'   && 'border border-bg-border text-text-secondary hover:border-accent hover:text-accent',
        loading && 'opacity-60 cursor-not-allowed',
        className
      )}
      disabled={loading}
      {...(props as any)}
    >
      {loading ? 'Loading...' : children}
    </motion.button>
  )
}
```

Also add `lib/utils.ts`:
```ts
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwindcss-merge'
export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)) }
```
```bash
npm install clsx tailwind-merge
```

---

## Done When
- `npm run dev` starts with no errors
- `http://localhost:3000` shows a dark page
- All 5 components render without TypeScript errors
- `lib/types.ts` and `lib/api.ts` compile cleanly

## No Dependencies
This workstation has zero dependencies on other workstations. It produces the foundation that WS4 and WS5 will import.
