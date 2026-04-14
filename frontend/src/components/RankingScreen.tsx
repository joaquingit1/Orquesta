"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { fetchRanking, fetchSchedule } from "@/lib/api";
import type { RankingEntry, ScheduleMeeting } from "@/types";

interface Props {
  elapsedTime: number;
}

interface RankingData {
  ranking: RankingEntry[];
  stats: {
    total_commits: number;
    total_prs: number;
    total_reviews: number;
    total_kpis: number;
    total_ai_sessions: number;
    review_cost: string;
    review_time: string;
    human_equivalent: string;
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
export function RankingScreen({ elapsedTime }: Props) {
  const [data, setData] = useState<RankingData | null>(null);
  const [meetings, setMeetings] = useState<ScheduleMeeting[]>([]);
  const [revealedCount, setRevealedCount] = useState(0);
  const [showStats, setShowStats] = useState(false);
  const [showScheduleBtn, setShowScheduleBtn] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);

  // Fetch ranking + schedule data on mount
  useEffect(() => {
    fetchRanking().then((res: RankingData) => setData(res));
    fetchSchedule().then((res: { meetings: ScheduleMeeting[] }) => setMeetings(res.meetings));
  }, []);

  // Staggered reveal: once data arrives, reveal cards one-by-one (reverse order)
  useEffect(() => {
    if (!data) return;

    const total = data.ranking.length;
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
    if (revealedCount < data.ranking.length) return;

    const t1 = setTimeout(() => setShowStats(true), 1000);
    const t2 = setTimeout(() => setShowScheduleBtn(true), 2000);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [data, revealedCount]);

  // Build reversed ranking list (lowest rank first for reveal)
  const sorted = data ? [...data.ranking].sort((a, b) => b.rank - a.rank) : [];

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
        <p className="text-muted text-sm animate-pulse">Loading rankings...</p>
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
        <h1 className="text-sm font-mono tracking-[0.3em] text-muted uppercase mb-1">
          Orquesta
        </h1>
        <div className="w-8 h-px bg-accent-cyan mx-auto mb-8" />
        <h2 className="text-3xl font-semibold tracking-tight text-foreground mb-3">
          Q1 2026 Performance Ranking
        </h2>
        <p className="text-sm text-muted max-w-lg mx-auto leading-relaxed">
          Based on {data.stats.total_commits.toLocaleString()} commits,{" "}
          {data.stats.total_prs.toLocaleString()} PRs,{" "}
          {data.stats.total_reviews.toLocaleString()} code reviews,{" "}
          {data.stats.total_kpis} KPIs,{" "}
          {data.stats.total_ai_sessions.toLocaleString()} AI sessions
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

            if (!isRevealed) return null;

            return (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, y: 60 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className={`relative rounded-xl border p-5
                  ${isGold
                    ? "border-accent-gold/50 bg-card-bg gold-shimmer"
                    : "border-card-border bg-card-bg"
                  }`}
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
                        <span className="text-xs text-muted ml-2">{entry.role}</span>
                      </div>
                      <div className="flex items-baseline gap-1 flex-shrink-0">
                        <AnimatedScore score={entry.score} active={isRevealed} isGold={isGold} />
                        <span className="text-xs text-muted">/10</span>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="mb-3">
                      <ScoreBar score={entry.score} active={isRevealed} isGold={isGold} />
                    </div>

                    {/* Tagline */}
                    <p className="text-sm text-muted italic mb-3">
                      &ldquo;{entry.tagline}&rdquo;
                    </p>

                    {/* Stats row */}
                    <div className="flex items-center gap-4 text-xs text-muted/80">
                      <span>{entry.prs} PRs</span>
                      <span className="w-px h-3 bg-card-border" />
                      <span>KPIs {entry.kpis}</span>
                      <span className="w-px h-3 bg-card-border" />
                      <span>AI {entry.ai_adoption}</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

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
                  <p className="text-xs text-muted uppercase tracking-wider mb-1">AI review cost</p>
                  <p className="text-lg font-semibold text-accent-cyan">
                    {data.stats.review_cost}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted uppercase tracking-wider mb-1">Time elapsed</p>
                  <p className="text-lg font-semibold text-foreground">
                    {formatTime(elapsedTime)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted uppercase tracking-wider mb-1">Human equivalent</p>
                  <p className="text-lg font-semibold text-accent-amber">
                    {data.stats.human_equivalent}
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
                  <p className="text-xs text-muted mt-0.5">via cal.com</p>
                </div>
                <button
                  onClick={toggleSchedule}
                  className="text-muted hover:text-foreground transition-colors p-1 cursor-pointer"
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
                        <p className="text-xs text-muted mt-0.5">{meeting.date}</p>
                      </div>
                      <span className="flex-shrink-0 text-xs font-mono text-accent-cyan bg-accent-cyan/10 rounded-full px-2.5 py-0.5">
                        {meeting.duration}
                      </span>
                    </div>
                    <p className="text-xs text-muted/80 leading-relaxed">
                      {meeting.note}
                    </p>
                  </motion.div>
                ))}
              </div>

              {/* Footer */}
              <div className="mt-6 pt-4 border-t border-card-border text-center">
                <p className="text-xs text-muted">
                  All meetings scheduled based on AI-prioritised review order
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
