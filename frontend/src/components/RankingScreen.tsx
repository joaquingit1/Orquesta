"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { fetchRanking, fetchSchedule } from "@/lib/api";
import type { RankingEntry, ScheduleMeeting, PerformanceMetrics } from "@/types";

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
// Animated counter hook
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
// Metric bar color based on value (inverted for unnecessary_code)
// ---------------------------------------------------------------------------
function metricColor(value: number, inverted = false): string {
  const v = inverted ? 100 - value : value;
  if (v < 25) return "#ef4444";
  if (v < 60) return "#f59e0b";
  return "#22c55e";
}

// ---------------------------------------------------------------------------
// Score ring SVG
// ---------------------------------------------------------------------------
function ScoreRing({ score, isGold }: { score: number; isGold: boolean }) {
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const pct = score / 10;
  const color = isGold ? "#fbbf24" : "#06b6d4";

  return (
    <div className="relative w-16 h-16 flex items-center justify-center flex-shrink-0">
      <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 64 64">
        <circle cx="32" cy="32" r={radius} fill="none" stroke="#1e1e1e" strokeWidth="4" />
        <motion.circle
          cx="32" cy="32" r={radius}
          fill="none"
          stroke={color}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference * (1 - pct) }}
          transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
        />
      </svg>
      <span className={`text-sm font-bold tabular-nums ${isGold ? "text-accent-gold" : "text-accent-cyan"}`}>
        {score.toFixed(1)}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Single metric row
// ---------------------------------------------------------------------------
function MetricRow({ label, value, inverted = false }: { label: string; value: number; inverted?: boolean }) {
  const color = metricColor(value, inverted);

  return (
    <div>
      <div className="flex justify-between items-baseline mb-1">
        <span className="text-xs text-foreground/60">{label}</span>
        <span className="text-xs font-mono font-semibold" style={{ color }}>{value}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Badge definitions
// ---------------------------------------------------------------------------
const BADGES = [
  { key: "fix_others_code",    label: "The Fixer",          icon: "🔧", subtitle: "fix others' code" },
  { key: "complexity_handled", label: "The Architect",       icon: "🏗️", subtitle: "complexity handled" },
  { key: "consistency",        label: "The Velocity Driver", icon: "⚡", subtitle: "consistency" },
  { key: "ai_adoption",        label: "The AI Power User",   icon: "🤖", subtitle: "AI adoption" },
  { key: "review_impact",      label: "The Guardian",        icon: "🛡️", subtitle: "review impact" },
  { key: "mentorship",         label: "The Mentor",          icon: "🎓", subtitle: "mentorship" },
] as const;

function BadgeGrid({ metrics }: { metrics: PerformanceMetrics }) {
  const topKey = BADGES.reduce((best, b) =>
    metrics[b.key] > metrics[best.key] ? b : best
  , BADGES[0]).key;

  return (
    <div className="grid grid-cols-3 gap-2">
      {BADGES.map((badge) => {
        const value = metrics[badge.key];
        const isTop = badge.key === topKey;
        return (
          <div
            key={badge.key}
            className={`rounded-lg p-2.5 border transition-all ${
              isTop
                ? "border-accent-cyan/40 bg-accent-cyan/10"
                : "border-white/5 bg-white/3 opacity-50"
            }`}
          >
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="text-sm">{badge.icon}</span>
              <span className={`text-xs font-semibold leading-tight ${isTop ? "text-foreground" : "text-foreground/60"}`}>
                {badge.label}
              </span>
            </div>
            <p className="text-[10px] text-foreground/40 leading-tight">{value}% {badge.subtitle}</p>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Engineer detail modal
// ---------------------------------------------------------------------------
function EngineerModal({ entry, onClose }: { entry: RankingEntry; onClose: () => void }) {
  const isGold = entry.rank === 1;
  const m = entry.performance_metrics;

  const metricsLeft = [
    { label: "AI Adoption",        value: m.ai_adoption,        inverted: false },
    { label: "Fix Others' Code",   value: m.fix_others_code,    inverted: false },
    { label: "KPI Completion",     value: m.kpi_completion,     inverted: false },
    { label: "Review Impact",      value: m.review_impact,      inverted: false },
    { label: "Complexity Handled", value: m.complexity_handled,  inverted: false },
  ];
  const metricsRight = [
    { label: "AI-Written Lines",   value: m.ai_written_lines,   inverted: false },
    { label: "Code Quality",       value: m.code_quality,       inverted: false },
    { label: "Unnecessary Code",   value: m.unnecessary_code,   inverted: true  },
    { label: "Consistency",        value: m.consistency,        inverted: false },
    { label: "Mentorship",         value: m.mentorship,         inverted: false },
  ];

  return (
    <motion.div
      key="modal-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" />

      {/* Panel */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="relative w-full max-w-2xl rounded-2xl border border-card-border bg-card-bg shadow-2xl overflow-y-auto max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Gold top glow */}
        {isGold && (
          <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-accent-gold to-transparent" />
        )}

        <div className="p-6">
          {/* ---- Header ---- */}
          <div className="flex items-start justify-between gap-4 mb-6">
            <div className="flex items-center gap-4">
              {/* Avatar */}
              <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-sm font-semibold text-foreground flex-shrink-0">
                {entry.id.split("-").map(p => p[0].toUpperCase()).join("").slice(0, 2)}
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground leading-tight">{entry.name}</h2>
                <p className="text-sm text-foreground/50">{entry.role}</p>
                <p className={`text-sm italic mt-0.5 ${isGold ? "text-accent-gold" : "text-accent-cyan"}`}>
                  &ldquo;{entry.tagline}&rdquo;
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <ScoreRing score={entry.score} isGold={isGold} />
              <button
                onClick={onClose}
                className="text-foreground/40 hover:text-foreground transition-colors p-1 cursor-pointer"
                aria-label="Close"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* ---- Performance Metrics ---- */}
          <div className="mb-6">
            <p className="text-[10px] font-mono tracking-widest text-foreground/40 uppercase mb-3">
              Performance Metrics
            </p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-3">
              <div className="space-y-3">
                {metricsLeft.map((m) => (
                  <MetricRow key={m.label} label={m.label} value={m.value} inverted={m.inverted} />
                ))}
              </div>
              <div className="space-y-3">
                {metricsRight.map((m) => (
                  <MetricRow key={m.label} label={m.label} value={m.value} inverted={m.inverted} />
                ))}
              </div>
            </div>
          </div>

          {/* ---- Badges ---- */}
          <div className="mb-6">
            <p className="text-[10px] font-mono tracking-widest text-foreground/40 uppercase mb-3">
              Badges
            </p>
            <BadgeGrid metrics={entry.performance_metrics} />
          </div>

          {/* ---- Evidence ---- */}
          <div>
            <p className="text-[10px] font-mono tracking-widest text-foreground/40 uppercase mb-3">
              Evidence
            </p>
            <div className="space-y-2">
              {entry.evidence_positive.map((ev, i) => (
                <div key={i} className="flex items-start gap-2 text-sm">
                  <span className="text-accent-green mt-0.5 flex-shrink-0">✓</span>
                  <span className="text-foreground/70">{ev}</span>
                </div>
              ))}
              {entry.evidence_negative.map((ev, i) => (
                <div key={i} className="flex items-start gap-2 text-sm">
                  <span className="text-accent-red mt-0.5 flex-shrink-0">✗</span>
                  <span className="text-foreground/70">{ev}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
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
  const [selectedEngineer, setSelectedEngineer] = useState<RankingEntry | null>(null);

  useEffect(() => {
    fetchRanking().then((res: RankingData) => setData(res));
    fetchSchedule().then((res: { meetings: ScheduleMeeting[] }) => setMeetings(res.meetings));
  }, []);

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

  useEffect(() => {
    if (!data) return;
    if (revealedCount < data.ranking.length) return;
    const t1 = setTimeout(() => setShowStats(true), 1000);
    const t2 = setTimeout(() => setShowScheduleBtn(true), 2000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [data, revealedCount]);

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
        <p className="text-foreground/40 text-sm animate-pulse">Loading rankings...</p>
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
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center mb-14"
      >
        <h1 className="text-sm font-mono tracking-[0.3em] text-foreground/60 uppercase mb-1">
          Orquesta
        </h1>
        <div className="w-8 h-px bg-accent-cyan mx-auto mb-8" />
        <h2 className="text-3xl font-semibold tracking-tight text-foreground mb-3">
          Q1 2026 Performance Ranking
        </h2>
        <p className="text-sm text-foreground/60 max-w-lg mx-auto leading-relaxed">
          Based on {data.stats.total_commits.toLocaleString()} commits,{" "}
          {data.stats.total_prs.toLocaleString()} PRs,{" "}
          {data.stats.total_reviews.toLocaleString()} code reviews,{" "}
          {data.stats.total_kpis} KPIs,{" "}
          {data.stats.total_ai_sessions.toLocaleString()} AI sessions
        </p>
      </motion.div>

      {/* Ranking Cards */}
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
                onClick={() => setSelectedEngineer(entry)}
                className={`relative rounded-xl border p-5 cursor-pointer transition-colors
                  ${isGold
                    ? "border-accent-gold/50 bg-card-bg gold-shimmer hover:border-accent-gold/80"
                    : "border-card-border bg-card-bg hover:border-accent-cyan/30"
                  }`}
              >
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
                    <div className="flex items-baseline justify-between gap-3 mb-1">
                      <div>
                        <span className="text-base font-semibold text-foreground">{entry.name}</span>
                        <span className="text-xs text-foreground/50 ml-2">{entry.role}</span>
                      </div>
                      <div className="flex items-baseline gap-1 flex-shrink-0">
                        <AnimatedScore score={entry.score} active={isRevealed} isGold={isGold} />
                        <span className="text-xs text-foreground/50">/10</span>
                      </div>
                    </div>

                    <div className="mb-3">
                      <ScoreBar score={entry.score} active={isRevealed} isGold={isGold} />
                    </div>

                    <p className="text-sm text-foreground/70 italic mb-3">
                      &ldquo;{entry.tagline}&rdquo;
                    </p>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 text-xs text-foreground/50">
                        <span>{entry.prs} PRs</span>
                        <span className="w-px h-3 bg-card-border" />
                        <span>KPIs {entry.kpis}</span>
                        <span className="w-px h-3 bg-card-border" />
                        <span>AI {entry.ai_adoption}</span>
                      </div>
                      <span className="text-xs text-foreground/30">Click to expand →</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Stats Footer */}
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
                  <p className="text-xs text-foreground/60 uppercase tracking-wider mb-1">AI review cost</p>
                  <p className="text-lg font-semibold text-accent-cyan">{data.stats.review_cost}</p>
                </div>
                <div>
                  <p className="text-xs text-foreground/60 uppercase tracking-wider mb-1">Time elapsed</p>
                  <p className="text-lg font-semibold text-foreground">{formatTime(elapsedTime)}</p>
                </div>
                <div>
                  <p className="text-xs text-foreground/60 uppercase tracking-wider mb-1">Human equivalent</p>
                  <p className="text-lg font-semibold text-accent-amber">{data.stats.human_equivalent}</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Schedule Button */}
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

      {/* Schedule Modal */}
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
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 24 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 24 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="relative w-full max-w-lg rounded-2xl border border-card-border bg-card-bg p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Scheduled Review Meetings</h3>
                  <p className="text-xs text-foreground/40 mt-0.5">via cal.com</p>
                </div>
                <button
                  onClick={toggleSchedule}
                  className="text-foreground/40 hover:text-foreground transition-colors p-1 cursor-pointer"
                  aria-label="Close"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

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
                        <p className="text-sm font-medium text-foreground">{meeting.engineer}</p>
                        <p className="text-xs text-foreground/40 mt-0.5">{meeting.date}</p>
                      </div>
                      <span className="flex-shrink-0 text-xs font-mono text-accent-cyan bg-accent-cyan/10 rounded-full px-2.5 py-0.5">
                        {meeting.duration}
                      </span>
                    </div>
                    <p className="text-xs text-foreground/60 leading-relaxed">{meeting.note}</p>
                  </motion.div>
                ))}
              </div>

              <div className="mt-6 pt-4 border-t border-card-border text-center">
                <p className="text-xs text-foreground/40">
                  All meetings scheduled based on AI-prioritised review order
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Engineer Detail Modal */}
      <AnimatePresence>
        {selectedEngineer && (
          <EngineerModal
            entry={selectedEngineer}
            onClose={() => setSelectedEngineer(null)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
