"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { fetchRanking, fetchGitHubRanking } from "@/lib/api";
import type { ScheduleMeeting } from "@/types";
import type { ReviewTranscript } from "@/app/dashboard/page";

interface Props {
  elapsedTime: number;
  // When present, fetch the GitHub session ranking and skip the demo schedule modal.
  sessionId?: string;
  repoName?: string;
  transcripts?: Record<string, ReviewTranscript>;
}

interface NormalizedEntry {
  rank: number;
  id: string;
  name: string;
  role: string;
  score: number;
  tagline: string;
  line1: string;
  line2: string;
}

interface RankingData {
  entries: NormalizedEntry[];
  headline: string;
  cost: string;
  humanEquivalent: string;
}

interface RawEntry {
  rank?: number;
  id?: string;
  name?: string;
  role?: string;
  score?: number | null;
  tagline?: string;
  verdict?: string;
  prs?: number;
  kpis?: string;
  ai_adoption?: string;
  stats?: string;
  evidence?: { pr_count?: number; kpi_completion?: string; ai_sessions?: number | string };
}

function normalizeRanking(raw: unknown, opts: { headlineFallback: string }): RankingData {
  const data = (raw ?? {}) as { rankings?: RawEntry[]; meta?: { total_cost?: string; human_equivalent?: string } };
  const list = Array.isArray(data.rankings) ? data.rankings : [];

  const entries: NormalizedEntry[] = list.map((e, i) => {
    const ev = e.evidence || {};
    const line1 = e.stats ?? [
      e.prs !== undefined ? `${e.prs} PRs` : null,
      e.kpis ? `KPIs ${e.kpis}` : null,
    ].filter(Boolean).join(" · ");
    const line2 = e.ai_adoption
      ? `AI ${e.ai_adoption}`
      : [
          ev.pr_count !== undefined ? `${ev.pr_count} PRs tracked` : null,
          ev.kpi_completion ? ev.kpi_completion : null,
          ev.ai_sessions ? `${ev.ai_sessions} AI sessions` : null,
        ].filter(Boolean).join(" · ");

    return {
      rank: e.rank ?? i + 1,
      id: e.id ?? `row-${i}`,
      name: e.name ?? e.id ?? "—",
      role: e.role ?? "Contributor",
      score: typeof e.score === "number" ? e.score : 0,
      tagline: (e.tagline || e.verdict || "").slice(0, 240),
      line1: line1 || "—",
      line2: line2 || "",
    };
  });

  // Estimate cost & human-equivalent when the backend doesn't provide them.
  // Rough per-contributor budget for the multi-agent pipeline:
  //  ~18k input + 3k output tokens across scanner/advocate/challenger/synthesizer.
  //  Using Sonnet 4.6 list pricing ($3/Mtok in, $15/Mtok out) → ~$0.10/contributor.
  //  Manual review of one engineer's PRs/commits ≈ 2.5h.
  const n = entries.length;
  const costEstimate = n > 0 ? `$${(n * 0.1).toFixed(2)}` : "—";
  const humanHours = n * 2.5;
  const humanEquivalentEstimate =
    n === 0
      ? "—"
      : humanHours >= 8
        ? `${(humanHours / 8).toFixed(1)} workdays`
        : `${humanHours.toFixed(1)} hours`;

  return {
    entries,
    headline: opts.headlineFallback,
    cost: data.meta?.total_cost ?? costEstimate,
    humanEquivalent: data.meta?.human_equivalent ?? humanEquivalentEstimate,
  };
}

// ---------------------------------------------------------------------------
// Animated counter hook: smoothly counts from 0 to `target` over `duration` ms
// ---------------------------------------------------------------------------
function useAnimatedNumber(target: number, duration: number, active: boolean) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!active) {
      setValue(0);
      return;
    }

    const start = performance.now();
    let raf: number;

    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(parseFloat((target * eased).toFixed(1)));
      if (progress < 1) {
        raf = requestAnimationFrame(tick);
      }
    }

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, active]);

  return value;
}

// ---------------------------------------------------------------------------
// Score display with animated counter
// ---------------------------------------------------------------------------
function AnimatedScore({ score, active, isGold }: { score: number; active: boolean; isGold: boolean }) {
  const displayed = useAnimatedNumber(score, 1200, active);

  return (
    <span className={`text-2xl font-bold tabular-nums ${isGold ? "text-accent-gold" : "text-accent-cyan"}`}>
      {displayed.toFixed(1)}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Progress bar with animated width
// ---------------------------------------------------------------------------
function ScoreBar({ score, active, isGold }: { score: number; active: boolean; isGold: boolean }) {
  const pct = (score / 10) * 100;

  return (
    <div className="h-2 rounded-full bg-[#1e1e1e] overflow-hidden w-full">
      <motion.div
        className={`h-full rounded-full ${isGold ? "bg-accent-gold" : "bg-accent-cyan"}`}
        initial={{ width: 0 }}
        animate={{ width: active ? `${pct}%` : 0 }}
        transition={{ duration: 1.2, ease: "easeOut" }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Format seconds to M:SS
// ---------------------------------------------------------------------------
function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export function RankingScreen({ elapsedTime, sessionId, repoName, transcripts }: Props) {
  const [data, setData] = useState<RankingData | null>(null);
  const [meetings] = useState<ScheduleMeeting[]>([]);
  const [revealedCount, setRevealedCount] = useState(0);
  const [showStats, setShowStats] = useState(false);
  const [showScheduleBtn, setShowScheduleBtn] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);

  const isGitHub = Boolean(sessionId);
  const activeTranscript = detailId && transcripts ? transcripts[detailId] : null;

  // Fetch ranking data on mount
  useEffect(() => {
    const load = sessionId
      ? fetchGitHubRanking(sessionId)
      : fetchRanking();
    load
      .then((res) =>
        setData(
          normalizeRanking(res, {
            headlineFallback: sessionId
              ? `Ranking for ${repoName || "repository"}`
              : "Q1 2026 Performance Ranking",
          }),
        ),
      )
      .catch((err) => console.warn("ranking fetch failed:", err));
  }, [sessionId, repoName]);

  // Staggered reveal
  useEffect(() => {
    if (!data) return;
    const total = data.entries.length;
    if (revealedCount >= total) return;
    const timer = setTimeout(
      () => setRevealedCount((c) => c + 1),
      revealedCount === 0 ? 600 : 1200,
    );
    return () => clearTimeout(timer);
  }, [data, revealedCount]);

  // Show stats footer after all cards revealed
  useEffect(() => {
    if (!data) return;
    if (revealedCount < data.entries.length) return;

    const t1 = setTimeout(() => setShowStats(true), 1000);
    const t2 = isGitHub ? null : setTimeout(() => setShowScheduleBtn(true), 2000);

    return () => {
      clearTimeout(t1);
      if (t2) clearTimeout(t2);
    };
  }, [data, revealedCount, isGitHub]);

  // Build reversed ranking list (lowest rank first for reveal)
  const sorted = data ? [...data.entries].sort((a, b) => b.rank - a.rank) : [];

  const toggleSchedule = useCallback(() => setScheduleOpen((v) => !v), []);

  if (!data) {
    return (
      <motion.div
        key="ranking"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0, y: -20, transition: { duration: 0.3 } }}
        className="min-h-screen flex items-center justify-center"
      >
        <p className="text-foreground/50 text-sm animate-pulse">Loading rankings...</p>
      </motion.div>
    );
  }

  return (
    <motion.div
      key="ranking"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, y: -20, transition: { duration: 0.3 } }}
      className="min-h-screen flex flex-col items-center px-6 py-12"
    >
      {/* ----------------------------------------------------------------- */}
      {/* Header                                                            */}
      {/* ----------------------------------------------------------------- */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center mb-14"
      >
        <h1 className="text-sm font-mono tracking-[0.3em] text-foreground/50 uppercase mb-1">
          Orquesta
        </h1>
        <div className="w-8 h-px bg-accent-cyan mx-auto mb-8" />
        <h2 className="text-3xl font-semibold tracking-tight text-foreground mb-3">
          {data.headline}
        </h2>
        <p className="text-sm text-foreground/50 max-w-lg mx-auto leading-relaxed">
          {data.entries.length} contributor{data.entries.length === 1 ? "" : "s"} analyzed ·
          {" "}scored by the multi-agent review pipeline
        </p>
      </motion.div>

      {/* ----------------------------------------------------------------- */}
      {/* Ranking Cards                                                     */}
      {/* ----------------------------------------------------------------- */}
      <div className="w-full max-w-2xl space-y-4 mb-12">
        <AnimatePresence>
          {sorted.map((entry, idx) => {
            const isRevealed = idx < revealedCount;
            const isGold = entry.rank === 1;
            const hasTranscript = Boolean(transcripts && transcripts[entry.id]);

            if (!isRevealed) return null;

            return (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, y: 60 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                role={hasTranscript ? "button" : undefined}
                tabIndex={hasTranscript ? 0 : undefined}
                onClick={hasTranscript ? () => setDetailId(entry.id) : undefined}
                onKeyDown={
                  hasTranscript
                    ? (e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setDetailId(entry.id);
                        }
                      }
                    : undefined
                }
                className={`relative rounded-xl border p-5
                  ${isGold
                    ? "border-accent-gold/50 bg-card-bg gold-shimmer"
                    : "border-card-border bg-card-bg"
                  }
                  ${hasTranscript ? "cursor-pointer hover:border-accent-cyan/60 transition-colors" : ""}`}
              >
                {/* Gold top-edge glow for #1 */}
                {isGold && (
                  <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-accent-gold to-transparent" />
                )}

                <div className="flex items-start gap-5">
                  {/* Rank badge */}
                  <div
                    className={`flex-shrink-0 w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold
                      ${isGold
                        ? "bg-accent-gold/15 text-accent-gold border border-accent-gold/30"
                        : "bg-white/5 text-foreground/70 border border-white/10"
                      }`}
                  >
                    #{entry.rank}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    {/* Name row */}
                    <div className="flex items-baseline justify-between gap-3 mb-1">
                      <div>
                        <span className="text-base font-semibold text-foreground">
                          {entry.name}
                        </span>
                        <span className="text-xs text-foreground/50 ml-2">{entry.role}</span>
                      </div>
                      <div className="flex items-baseline gap-1 flex-shrink-0">
                        <AnimatedScore score={entry.score} active={isRevealed} isGold={isGold} />
                        <span className="text-xs text-foreground/50">/10</span>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="mb-3">
                      <ScoreBar score={entry.score} active={isRevealed} isGold={isGold} />
                    </div>

                    {/* Tagline */}
                    {entry.tagline && (
                      <p className="text-sm text-foreground/50 italic mb-3">
                        &ldquo;{entry.tagline}&rdquo;
                      </p>
                    )}

                    {/* Stats row */}
                    <div className="flex flex-col gap-1 text-xs text-foreground/80">
                      {entry.line1 && <span>{entry.line1}</span>}
                      {entry.line2 && <span className="text-foreground/60">{entry.line2}</span>}
                    </div>

                    {hasTranscript && (
                      <div className="mt-3 text-[11px] font-mono uppercase tracking-wider text-accent-cyan/80">
                        Click to see reasoning →
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Superlatives                                                      */}
      {/* ----------------------------------------------------------------- */}
      {showStats && transcripts && Object.keys(transcripts).length > 0 && (
        <Superlatives transcripts={transcripts} />
      )}

      {/* ----------------------------------------------------------------- */}
      {/* Stats Footer                                                      */}
      {/* ----------------------------------------------------------------- */}
      <AnimatePresence>
        {showStats && (
          <motion.div
            key="stats-footer"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="w-full max-w-2xl mb-8"
          >
            <div className="rounded-xl border border-card-border bg-card-bg p-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-xs text-foreground/50 uppercase tracking-wider mb-1">AI review cost</p>
                  <p className="text-lg font-semibold text-accent-cyan">
                    {data.cost}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-foreground/50 uppercase tracking-wider mb-1">Time elapsed</p>
                  <p className="text-lg font-semibold text-foreground">
                    {formatTime(elapsedTime)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-foreground/50 uppercase tracking-wider mb-1">Human equivalent</p>
                  <p className="text-lg font-semibold text-accent-amber">
                    {data.humanEquivalent}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ----------------------------------------------------------------- */}
      {/* Schedule Button                                                   */}
      {/* ----------------------------------------------------------------- */}
      <AnimatePresence>
        {showScheduleBtn && (
          <motion.div
            key="schedule-btn"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <button
              onClick={toggleSchedule}
              className="rounded-full bg-accent-cyan px-8 py-3 text-sm font-semibold text-black
                         hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer"
            >
              Schedule Review Meetings via cal.com
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ----------------------------------------------------------------- */}
      {/* Schedule Modal                                                    */}
      {/* ----------------------------------------------------------------- */}
      <AnimatePresence>
        {scheduleOpen && (
          <motion.div
            key="schedule-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-50 flex items-center justify-center px-4"
            onClick={toggleSchedule}
          >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

            {/* Panel */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 24 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 24 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="relative w-full max-w-lg rounded-2xl border border-card-border bg-card-bg p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal header */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">
                    Scheduled Review Meetings
                  </h3>
                  <p className="text-xs text-foreground/50 mt-0.5">via cal.com</p>
                </div>
                <button
                  onClick={toggleSchedule}
                  className="text-foreground/50 hover:text-foreground transition-colors p-1 cursor-pointer"
                  aria-label="Close"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Meeting list */}
              <div className="space-y-3">
                {meetings.map((meeting, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1, duration: 0.35 }}
                    className="rounded-lg border border-card-border bg-background p-4"
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {meeting.engineer}
                        </p>
                        <p className="text-xs text-foreground/50 mt-0.5">{meeting.date}</p>
                      </div>
                      <span className="flex-shrink-0 text-xs font-mono text-accent-cyan bg-accent-cyan/10 rounded-full px-2.5 py-0.5">
                        {meeting.duration}
                      </span>
                    </div>
                    <p className="text-xs text-foreground/80 leading-relaxed">
                      {meeting.note}
                    </p>
                  </motion.div>
                ))}
              </div>

              {/* Footer */}
              <div className="mt-6 pt-4 border-t border-card-border text-center">
                <p className="text-xs text-foreground/50">
                  All meetings scheduled based on AI-prioritised review order
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ----------------------------------------------------------------- */}
      {/* Reasoning Detail Modal                                            */}
      {/* ----------------------------------------------------------------- */}
      <AnimatePresence>
        {activeTranscript && (
          <motion.div
            key="detail-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8"
            onClick={() => setDetailId(null)}
          >
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 16 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="relative w-full max-w-3xl max-h-full overflow-y-auto rounded-2xl border border-card-border bg-card-bg p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between mb-5">
                <div>
                  <p className="text-[11px] font-mono uppercase tracking-[0.25em] text-foreground/50 mb-1">
                    Review reasoning
                  </p>
                  <h3 className="text-xl font-semibold text-foreground">
                    {activeTranscript.name}
                  </h3>
                  {activeTranscript.verdict && (
                    <p className="text-sm text-accent-cyan italic mt-1">
                      &ldquo;{activeTranscript.verdict.tagline}&rdquo; ·{" "}
                      <span className="text-accent-gold">
                        {activeTranscript.verdict.score}/10
                      </span>
                    </p>
                  )}
                </div>
                <button
                  onClick={() => setDetailId(null)}
                  className="text-foreground/50 hover:text-foreground transition-colors p-1 cursor-pointer"
                  aria-label="Close"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {activeTranscript.commits.length > 0 && (
                <Section title={`Commits analyzed (${activeTranscript.commits.length})`}>
                  <ul className="space-y-1 font-mono text-xs">
                    {activeTranscript.commits.slice(0, 8).map((c, i) => (
                      <li key={`${c.sha}-${i}`} className="flex gap-3">
                        <span className="text-accent-cyan w-14 shrink-0">{c.sha}</span>
                        <span className="text-foreground/80 truncate">{c.message}</span>
                      </li>
                    ))}
                  </ul>
                </Section>
              )}

              {activeTranscript.prs.length > 0 && (
                <Section title={`Notable PRs (${activeTranscript.prs.length})`}>
                  <ul className="space-y-1.5 text-xs">
                    {activeTranscript.prs.map((pr) => (
                      <li key={pr.number} className="flex gap-3">
                        <span className="text-accent-cyan font-mono shrink-0">#{pr.number}</span>
                        <span className="text-foreground/80 flex-1">{pr.title}</span>
                        <span className="text-foreground/50 font-mono shrink-0">
                          <span className="text-accent-green">+{pr.additions}</span>{" "}
                          <span className="text-accent-red">-{pr.deletions}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </Section>
              )}

              {activeTranscript.analyzing && (
                <Section title="Analysis" accent="var(--accent-cyan)">
                  <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">
                    {activeTranscript.analyzing}
                  </p>
                </Section>
              )}

              {activeTranscript.audit && (
                <Section title="Code audit" accent="#a78bfa">
                  <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">
                    {activeTranscript.audit}
                  </p>
                </Section>
              )}

              {activeTranscript.advocate && (
                <Section title="Advocate" accent="var(--accent-green)">
                  <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">
                    {activeTranscript.advocate}
                  </p>
                </Section>
              )}

              {activeTranscript.challenger && (
                <Section title="Challenger" accent="var(--accent-amber)">
                  <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">
                    {activeTranscript.challenger}
                  </p>
                </Section>
              )}

              {activeTranscript.rebuttal && (
                <Section title="Advocate rebuttal" accent="var(--accent-green)">
                  <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">
                    {activeTranscript.rebuttal}
                  </p>
                </Section>
              )}

              {activeTranscript.verdict && (
                <Section title="Final verdict" accent="var(--accent-gold)">
                  <p className="text-sm text-foreground/80 leading-relaxed">
                    {activeTranscript.verdict.summary}
                  </p>
                </Section>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

interface Award {
  label: string;
  icon: string;
  winner: string;
  detail: string;
}

const FIX_RE = /\b(fix|bug|hotfix|patch|revert|issue|broken|crash)\b/i;

function computeAwards(transcripts: Record<string, ReviewTranscript>): Award[] {
  const rows = Object.values(transcripts);
  if (rows.length === 0) return [];

  const stat = rows.map((t) => {
    const prs = t.prs ?? [];
    const commits = t.commits ?? [];
    const adds = prs.reduce((s, p) => s + (p.additions ?? 0), 0);
    const dels = prs.reduce((s, p) => s + (p.deletions ?? 0), 0);
    const fixes = commits.filter((c) => FIX_RE.test(c.message)).length;
    return {
      id: t.id,
      name: t.name,
      score: t.verdict?.score ?? 0,
      prCount: prs.length,
      commitCount: commits.length,
      adds,
      dels,
      net: adds - dels,
      fixes,
    };
  });

  const pick = <T,>(arr: T[], key: (t: T) => number) => {
    return [...arr].sort((a, b) => key(b) - key(a))[0];
  };

  const awards: Award[] = [];

  const shipper = pick(stat, (s) => s.prCount);
  if (shipper && shipper.prCount > 0) {
    awards.push({
      label: "Top Shipper",
      icon: "🚀",
      winner: shipper.name,
      detail: `${shipper.prCount} notable PR${shipper.prCount === 1 ? "" : "s"}`,
    });
  }

  const builder = pick(stat, (s) => s.commitCount);
  if (builder && builder.commitCount > 0) {
    awards.push({
      label: "Builder",
      icon: "🔨",
      winner: builder.name,
      detail: `${builder.commitCount} recent commit${builder.commitCount === 1 ? "" : "s"}`,
    });
  }

  const fixer = pick(stat, (s) => s.fixes);
  if (fixer && fixer.fixes > 0) {
    awards.push({
      label: "The Fixer",
      icon: "🐛",
      winner: fixer.name,
      detail: `${fixer.fixes} fix-type commit${fixer.fixes === 1 ? "" : "s"}`,
    });
  }

  const volume = pick(stat, (s) => s.adds);
  if (volume && volume.adds > 0) {
    awards.push({
      label: "Heavy Lifter",
      icon: "💪",
      winner: volume.name,
      detail: `+${volume.adds.toLocaleString()} lines across PRs`,
    });
  }

  const refactorer = pick(stat, (s) => s.dels - s.adds);
  if (refactorer && refactorer.dels > refactorer.adds && refactorer.dels > 0) {
    awards.push({
      label: "Refactorer",
      icon: "🧹",
      winner: refactorer.name,
      detail: `net −${(refactorer.dels - refactorer.adds).toLocaleString()} lines`,
    });
  }

  const mvp = pick(stat, (s) => s.score);
  if (mvp && mvp.score > 0) {
    awards.push({
      label: "MVP",
      icon: "🏆",
      winner: mvp.name,
      detail: `${mvp.score.toFixed(1)}/10 verdict`,
    });
  }

  return awards;
}

function Superlatives({ transcripts }: { transcripts: Record<string, ReviewTranscript> }) {
  const awards = computeAwards(transcripts);
  if (awards.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.4 }}
      className="w-full max-w-2xl mb-8"
    >
      <div className="flex items-center gap-3 mb-3">
        <div className="h-px flex-1 bg-card-border" />
        <h3 className="text-xs font-mono uppercase tracking-[0.3em] text-foreground/50">
          Awards
        </h3>
        <div className="h-px flex-1 bg-card-border" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {awards.map((a, i) => (
          <motion.div
            key={a.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 * i }}
            className="rounded-xl border border-card-border bg-card-bg p-4 flex items-start gap-3"
          >
            <span className="text-2xl" aria-hidden>
              {a.icon}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-mono uppercase tracking-wider text-foreground/50 mb-0.5">
                {a.label}
              </p>
              <p className="text-sm font-semibold text-foreground truncate">
                {a.winner}
              </p>
              <p className="text-xs text-foreground/80 mt-0.5 truncate">{a.detail}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

function Section({
  title,
  accent,
  children,
}: {
  title: string;
  accent?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-5 rounded-lg border border-card-border bg-[#0d0d0d] p-4"
         style={accent ? { borderLeft: `3px solid ${accent}` } : undefined}>
      <p className="text-[10px] font-mono uppercase tracking-[0.25em] text-foreground/50 mb-2"
         style={accent ? { color: accent } : undefined}>
        {title}
      </p>
      {children}
    </div>
  );
}
