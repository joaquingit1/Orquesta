"use client";

import { useRef, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { ReviewState, PR, Commit, KPIs, AIUsage, VerdictData } from "@/types";

interface Props {
  state: ReviewState;
  elapsedTime: number;
}

/* ---------- constants ---------- */

const TOTAL_ENGINEERS = 4;

const PHASE_LABELS: Record<string, string> = {
  idle: "Initializing",
  scanning: "Scanning evidence",
  thinking: "Analyzing",
  audit: "Auditing code",
  advocate: "Advocate speaking",
  challenger: "Challenger speaking",
  rebuttal: "Advocate rebuttal",
  verdict: "Rendering verdict",
  complete: "Review complete",
};

/* ---------- animation variants ---------- */

const fadeSlide = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.2 } },
};

const panelEntrance = {
  hidden: { opacity: 0, x: 24 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.45, ease: "easeOut" as const } },
};

const cardEntrance = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" as const } },
};

const verdictScale = {
  hidden: { opacity: 0, scale: 0.85 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as const },
  },
};

/* ---------- helpers ---------- */

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function scoreColor(score: number): string {
  if (score >= 8) return "text-accent-green";
  if (score >= 7) return "text-accent-cyan";
  if (score >= 6) return "text-accent-amber";
  return "text-accent-red";
}

function metricColor(label: string, value: number | string): string {
  const v = typeof value === "string" ? parseFloat(value) : value;
  if (label === "AI Adoption") {
    if (v >= 80) return "text-accent-green";
    if (v >= 50) return "text-accent-amber";
    return "text-accent-red";
  }
  return "text-accent-cyan";
}

/* ---------- sub-components ---------- */

function DiffBlock({ pr }: { pr: PR }) {
  const lines = (pr.diff_snippet ?? pr.description ?? "").split("\n");

  return (
    <motion.div variants={cardEntrance} initial="hidden" animate="visible" className="mb-4">
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <span className="text-xs font-mono text-accent-cyan">#{pr.number}</span>
        <span className="text-xs text-foreground/90 font-medium truncate">{pr.title}</span>
        <span className="text-xs text-foreground/50 ml-auto whitespace-nowrap">
          {pr.files_changed} file{pr.files_changed !== 1 ? "s" : ""}{" "}
          <span className="text-accent-green">+{pr.additions}</span>{" "}
          <span className="text-accent-red">-{pr.deletions}</span>
        </span>
      </div>
      <div className="rounded-lg border border-card-border bg-[#0d0d0d] p-3 overflow-x-auto">
        <pre className="font-mono text-xs leading-relaxed whitespace-pre-wrap">
          {lines.map((line, i) => {
            let cls = "diff-neutral";
            const trimmed = line.trimStart();
            if (trimmed.startsWith("//") || trimmed.startsWith("/*") || trimmed.startsWith("*")) {
              cls = "diff-comment";
            } else if (trimmed.startsWith("+") || trimmed.startsWith("AFTER:") || trimmed.startsWith("// AFTER")) {
              cls = "diff-add";
            } else if (trimmed.startsWith("-") || trimmed.startsWith("BEFORE:") || trimmed.startsWith("// BEFORE")) {
              cls = "diff-remove";
            }
            return (
              <div key={i} className={`${cls} px-1 ${cls === "diff-add" || cls === "diff-remove" ? "rounded" : ""}`}>
                {line || "\u00A0"}
              </div>
            );
          })}
        </pre>
      </div>
      {pr.quality_signals.length > 0 && (
        <div className="flex gap-1.5 mt-2 flex-wrap">
          {pr.quality_signals.map((sig, i) => (
            <span
              key={i}
              className="text-[10px] font-mono text-foreground/50 bg-white/5 rounded px-1.5 py-0.5"
            >
              {sig}
            </span>
          ))}
        </div>
      )}
    </motion.div>
  );
}

function CommitsList({ commits, active }: { commits: Commit[]; active: boolean }) {
  const [cursor, setCursor] = useState(0);
  const activeRefs = useRef<Array<HTMLAnchorElement | null>>([]);

  useEffect(() => {
    if (!active || commits.length === 0) return;
    const id = setInterval(() => {
      setCursor((c) => (c + 1) % commits.length);
    }, 900);
    return () => clearInterval(id);
  }, [active, commits.length]);

  useEffect(() => {
    if (!active) return;
    const el = activeRefs.current[cursor];
    el?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [cursor, active]);

  if (commits.length === 0) return null;
  return (
    <motion.div variants={cardEntrance} initial="hidden" animate="visible" className="mb-4">
      <div className="flex items-center gap-2 mb-2">
        <h3 className="text-xs font-mono uppercase tracking-wider text-foreground/50">
          Recent Commits &middot; {commits.length}
        </h3>
        {active && (
          <span className="flex items-center gap-1.5 text-[10px] font-mono text-accent-cyan">
            <span className="w-1.5 h-1.5 rounded-full bg-accent-cyan animate-pulse" />
            reading
          </span>
        )}
      </div>
      <div className="rounded-lg border border-card-border bg-[#0d0d0d] divide-y divide-card-border overflow-hidden max-h-[28rem] overflow-y-auto">
        {commits.map((c, i) => {
          const when = c.date ? new Date(c.date).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "";
          const isActive = active && i === cursor;
          return (
            <motion.a
              key={`${c.sha}-${i}`}
              ref={(el) => {
                activeRefs.current[i] = el;
              }}
              href={c.url || undefined}
              target="_blank"
              rel="noreferrer noopener"
              initial={{ opacity: 0, x: -8 }}
              animate={{
                opacity: active ? (isActive ? 1 : 0.45) : 1,
                x: 0,
                backgroundColor: isActive ? "rgba(0, 214, 214, 0.08)" : "rgba(0, 0, 0, 0)",
              }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="relative flex items-start gap-3 px-3 py-2 hover:bg-white/5 transition-colors"
            >
              {isActive && (
                <span className="absolute inset-y-0 left-0 w-0.5 bg-accent-cyan" aria-hidden />
              )}
              <span className="text-[10px] font-mono text-accent-cyan shrink-0 mt-0.5 w-14">{c.sha}</span>
              <span className="text-xs text-foreground/80 flex-1 min-w-0 truncate">{c.message}</span>
              <span className="text-[10px] text-foreground/50 shrink-0">{when}</span>
            </motion.a>
          );
        })}
      </div>
    </motion.div>
  );
}

function MetricCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string | number;
  sub?: string;
}) {
  const color = metricColor(label, value);
  return (
    <motion.div
      variants={cardEntrance}
      initial="hidden"
      animate="visible"
      className="rounded-lg border border-card-border bg-card-bg p-3 flex flex-col gap-1"
    >
      <span className="text-[10px] uppercase tracking-wider text-foreground/50">{label}</span>
      <span className={`text-lg font-semibold ${color}`}>{value}</span>
      {sub && <span className="text-[10px] text-foreground/50">{sub}</span>}
    </motion.div>
  );
}

function MetricsGrid({ summary }: { summary: ReviewState["profile"] }) {
  if (!summary) return null;
  const s = summary.summary;
  return (
    <motion.div variants={cardEntrance} initial="hidden" animate="visible">
      <h3 className="text-xs font-mono uppercase tracking-wider text-foreground/50 mb-2">
        Activity Metrics
      </h3>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        <MetricCard label="PRs Opened" value={s.prs_opened} sub={`${s.prs_merged} merged`} />
        <MetricCard label="Commits" value={s.commits} />
        <MetricCard label="Reviews Given" value={s.reviews_given} sub={s.avg_review_turnaround} />
        <MetricCard label="AI Adoption" value={s.ai_tool_adoption} sub={`${s.ai_tool_sessions} sessions`} />
      </div>
    </motion.div>
  );
}

function AIUsageCard({ usage }: { usage: AIUsage }) {
  return (
    <motion.div
      variants={cardEntrance}
      initial="hidden"
      animate="visible"
      className="rounded-lg border border-card-border bg-card-bg p-3 mt-3"
    >
      <h3 className="text-xs font-mono uppercase tracking-wider text-foreground/50 mb-2">
        AI Tool Usage
      </h3>
      <div className="grid grid-cols-3 gap-3 mb-2">
        <div>
          <span className="text-[10px] text-foreground/50 block">Sessions</span>
          <span className="text-sm font-semibold text-accent-cyan">{usage.total_sessions}</span>
        </div>
        <div>
          <span className="text-[10px] text-foreground/50 block">Tokens</span>
          <span className="text-sm font-semibold text-accent-cyan">{usage.total_tokens}</span>
        </div>
        <div>
          <span className="text-[10px] text-foreground/50 block">Adoption</span>
          <span className="text-sm font-semibold text-accent-cyan">{usage.adoption_rate}</span>
        </div>
      </div>
      <div className="text-[10px] text-foreground/50 mb-1">
        <span className="text-foreground/70 font-medium">Pattern:</span> {usage.pattern}
      </div>
      <div className="flex flex-wrap gap-1">
        {usage.use_cases.map((uc, i) => (
          <span
            key={i}
            className="text-[10px] font-mono text-accent-cyan/80 bg-accent-cyan/5 rounded px-1.5 py-0.5"
          >
            {uc}
          </span>
        ))}
      </div>
    </motion.div>
  );
}

function KPIPanel({ kpis }: { kpis: KPIs }) {
  return (
    <motion.div
      variants={cardEntrance}
      initial="hidden"
      animate="visible"
      className="rounded-lg border border-card-border bg-card-bg p-3 mt-3"
    >
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-mono uppercase tracking-wider text-foreground/50">KPI Goals</h3>
        <span className="text-xs font-semibold text-accent-cyan">{kpis.goals_completed}</span>
      </div>
      <div className="space-y-1.5">
        {kpis.goals.map((g, i) => {
          let icon: string;
          let iconColor: string;
          if (g.status === "completed") {
            icon = "\u2713";
            iconColor = "text-accent-green";
          } else if (g.status === "missed") {
            icon = "\u2717";
            iconColor = "text-accent-red";
          } else {
            icon = "\u25F7";
            iconColor = "text-accent-amber";
          }
          return (
            <div key={i} className="flex items-start gap-2 text-xs">
              <span className={`${iconColor} font-bold w-3 shrink-0 mt-px`}>{icon}</span>
              <span className="text-foreground/80">{g.goal}</span>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

function ProgressRing({ score, size = 96 }: { score: number; size?: number }) {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = score / 10;
  const offset = circumference * (1 - progress);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#262626"
          strokeWidth={4}
        />
        {/* Fill */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--accent-cyan)"
          strokeWidth={4}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{
            animation: "progress-fill 1.2s ease-out forwards",
          }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={`text-2xl font-bold ${scoreColor(score)}`}>{score}</span>
      </div>
    </div>
  );
}

function VerdictCard({ verdict, name }: { verdict: VerdictData; name: string }) {
  return (
    <motion.div
      variants={verdictScale}
      initial="hidden"
      animate="visible"
      className="rounded-xl border border-accent-cyan/30 bg-gradient-to-b from-card-bg to-[#0d1117] p-5"
    >
      <div className="flex items-center gap-5 mb-4">
        <ProgressRing score={verdict.score} />
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-foreground">{name}</h3>
          <p className="text-sm text-accent-cyan italic mt-0.5">
            &ldquo;{verdict.tagline}&rdquo;
          </p>
        </div>
      </div>

      <p className="text-sm text-foreground/80 leading-relaxed mb-4">{verdict.summary}</p>

      {/* Evidence */}
      <div className="space-y-1.5 mb-4">
        {verdict.evidence_positive.map((e, i) => (
          <div key={`p-${i}`} className="flex items-start gap-2 text-xs">
            <span className="text-accent-green font-bold shrink-0 mt-px">+</span>
            <span className="text-foreground/80">{e}</span>
          </div>
        ))}
        {verdict.evidence_negative.map((e, i) => (
          <div key={`n-${i}`} className="flex items-start gap-2 text-xs">
            <span className="text-accent-red font-bold shrink-0 mt-px">&minus;</span>
            <span className="text-foreground/80">{e}</span>
          </div>
        ))}
      </div>

      {/* AI note */}
      {verdict.ai_note && (
        <div className="rounded-lg bg-accent-cyan/5 border border-accent-cyan/10 px-3 py-2">
          <span className="text-[10px] font-mono uppercase tracking-wider text-accent-cyan block mb-0.5">
            AI Adoption Note
          </span>
          <span className="text-xs text-foreground/70">{verdict.ai_note}</span>
        </div>
      )}
    </motion.div>
  );
}

/* -------- streaming text block -------- */

function StreamingBlock({
  borderColor,
  label,
  labelColor,
  paragraphs,
  streamingText,
  isActive,
}: {
  borderColor: string;
  label: string;
  labelColor: string;
  paragraphs: string[];
  streamingText: string;
  isActive: boolean;
}) {
  return (
    <motion.div
      variants={panelEntrance}
      initial="hidden"
      animate="visible"
      className="rounded-lg bg-[#1a1a1a] p-4 mb-3"
      style={{ borderLeft: `3px solid ${borderColor}` }}
    >
      <div className="flex items-center gap-2 mb-2">
        <span
          className="text-[10px] font-mono uppercase tracking-wider font-bold"
          style={{ color: labelColor }}
        >
          {label}
        </span>
        {isActive && (
          <span
            className="w-1.5 h-1.5 rounded-full animate-pulse"
            style={{ backgroundColor: borderColor }}
          />
        )}
      </div>
      <div className="text-sm text-foreground/80 leading-relaxed font-mono space-y-2">
        {paragraphs.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
        {isActive && streamingText && (
          <p className="typing-cursor">{streamingText}</p>
        )}
      </div>
    </motion.div>
  );
}

/* ============================================================ */
/*  MAIN COMPONENT                                               */
/* ============================================================ */

export function LiveReview({ state, elapsedTime }: Props) {
  const agentScrollRef = useRef<HTMLDivElement>(null);
  const scrollBottomRef = useRef<HTMLDivElement>(null);

  // auto-scroll agent panel
  useEffect(() => {
    scrollBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [
    state.thinkingText,
    state.auditText,
    state.advocateText,
    state.challengerText,
    state.rebuttalText,
    state.currentStreamingText,
    state.verdict,
  ]);

  const phase = state.phase;
  const profile = state.profile;

  // determine which PR to highlight (cycle through during thinking)
  const activePrIndex = useMemo(() => {
    if (state.prs.length === 0) return -1;
    // During thinking, use the number of completed thinking paragraphs to pick a PR
    const idx = state.thinkingText.length % state.prs.length;
    return idx;
  }, [state.thinkingText.length, state.prs.length]);

  const showThinking =
    phase === "thinking" ||
    phase === "audit" ||
    phase === "advocate" ||
    phase === "challenger" ||
    phase === "rebuttal" ||
    phase === "verdict" ||
    phase === "complete";

  const showAudit =
    phase === "audit" ||
    phase === "advocate" ||
    phase === "challenger" ||
    phase === "rebuttal" ||
    phase === "verdict" ||
    phase === "complete";

  const showAdvocate =
    phase === "advocate" ||
    phase === "challenger" ||
    phase === "rebuttal" ||
    phase === "verdict" ||
    phase === "complete";

  const showChallenger =
    phase === "challenger" ||
    phase === "rebuttal" ||
    phase === "verdict" ||
    phase === "complete";

  const showRebuttal =
    (phase === "rebuttal" ||
      phase === "verdict" ||
      phase === "complete") &&
    (state.rebuttalText || (phase === "rebuttal" && state.currentStreamingText));

  const showVerdict =
    (phase === "verdict" || phase === "complete") && state.verdict;

  return (
    <motion.div
      key="review"
      variants={fadeSlide}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="h-screen flex flex-col bg-background overflow-hidden"
    >
      {/* -------- TOP BAR -------- */}
      <header className="shrink-0 flex items-center justify-between px-5 py-3 border-b border-card-border bg-card-bg/80 backdrop-blur">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <h1 className="text-xs font-mono tracking-[0.3em] text-foreground/50 uppercase">Orquesta</h1>
          <div className="w-px h-4 bg-card-border" />
          <span className="text-xs text-foreground/50">{PHASE_LABELS[phase] ?? phase}</span>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-4">
          <span className="text-xs text-foreground/70">
            Reviewing{" "}
            <span className="text-accent-cyan font-semibold">
              {state.engineerIndex + 1}
            </span>{" "}
            of {TOTAL_ENGINEERS}
          </span>
          <div className="flex gap-1">
            {Array.from({ length: TOTAL_ENGINEERS }).map((_, i) => (
              <div
                key={i}
                className={`w-6 h-1 rounded-full transition-colors duration-300 ${
                  i < state.engineerIndex
                    ? "bg-accent-green"
                    : i === state.engineerIndex
                    ? "bg-accent-cyan"
                    : "bg-white/10"
                }`}
              />
            ))}
          </div>
          <span className="text-xs font-mono text-foreground/50">{formatTime(elapsedTime)}</span>
        </div>
      </header>

      {/* -------- SPLIT LAYOUT -------- */}
      <div className="flex flex-1 overflow-hidden">
        {/* ====== LEFT PANEL: Evidence ====== */}
        <div className="w-[55%] border-r border-card-border overflow-y-auto p-5 space-y-4">
          {/* Engineer header */}
          <AnimatePresence mode="wait">
            {profile && (
              <motion.div
                key={profile.id}
                variants={fadeSlide}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="flex items-center gap-3 pb-3 border-b border-card-border"
              >
                <div className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-xs font-medium text-foreground/80">
                  {profile.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-foreground">
                    Currently reviewing:{" "}
                    <span className="text-accent-cyan">{profile.name}</span>
                  </h2>
                  <p className="text-xs text-foreground/50">
                    {profile.role} &middot; {profile.tenure}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Live commits list */}
          <CommitsList
            commits={state.commits}
            active={phase === "scanning" || phase === "thinking" || phase === "audit" || phase === "advocate" || phase === "challenger" || phase === "rebuttal"}
          />

          {/* Scanning placeholder */}
          {phase === "scanning" && state.prs.length === 0 && state.commits.length === 0 && (
            <motion.div
              variants={fadeSlide}
              initial="hidden"
              animate="visible"
              className="flex items-center gap-3 py-12 justify-center"
            >
              <div className="w-4 h-4 border-2 border-accent-cyan border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-foreground/50">Collecting evidence...</span>
            </motion.div>
          )}

          {/* Code Diffs */}
          {state.prs.length > 0 && (
            <div>
              <h3 className="text-xs font-mono uppercase tracking-wider text-foreground/50 mb-3">
                Code Evidence &middot; {state.prs.length} PR{state.prs.length !== 1 ? "s" : ""}
              </h3>
              {state.prs.map((pr, i) => (
                <div
                  key={pr.number}
                  className={`transition-opacity duration-300 ${
                    activePrIndex === i && phase === "thinking"
                      ? "opacity-100"
                      : phase === "thinking"
                      ? "opacity-40"
                      : "opacity-100"
                  }`}
                >
                  <DiffBlock pr={pr} />
                </div>
              ))}
            </div>
          )}

          {/* Metrics */}
          {profile && <MetricsGrid summary={profile} />}

          {/* AI Usage */}
          {state.aiUsage && <AIUsageCard usage={state.aiUsage} />}

          {/* KPIs */}
          {state.kpis && <KPIPanel kpis={state.kpis} />}
        </div>

        {/* ====== RIGHT PANEL: Agent ====== */}
        <div
          ref={agentScrollRef}
          className="w-[45%] overflow-y-auto p-5 space-y-3 bg-[#0e0e0e]"
        >
          {/* Scanning state */}
          {phase === "scanning" && (
            <motion.div
              variants={panelEntrance}
              initial="hidden"
              animate="visible"
              className="flex flex-col items-center justify-center h-full gap-3 text-center"
            >
              <div className="w-6 h-6 border-2 border-accent-cyan border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-foreground/50">Gathering data for analysis...</p>
            </motion.div>
          )}

          {/* Thinking */}
          {showThinking && (
            <StreamingBlock
              borderColor="var(--accent-cyan)"
              label="Analyzing"
              labelColor="var(--accent-cyan)"
              paragraphs={state.thinkingText}
              streamingText={phase === "thinking" ? state.currentStreamingText : ""}
              isActive={phase === "thinking"}
            />
          )}

          {/* Code Audit */}
          {showAudit && (
            <StreamingBlock
              borderColor="#a78bfa"
              label="Code Audit"
              labelColor="#a78bfa"
              paragraphs={state.auditText}
              streamingText={phase === "audit" ? state.currentStreamingText : ""}
              isActive={phase === "audit"}
            />
          )}

          {/* Advocate */}
          {showAdvocate && (
            <StreamingBlock
              borderColor="var(--accent-green)"
              label="Advocate"
              labelColor="var(--accent-green)"
              paragraphs={state.advocateText}
              streamingText={phase === "advocate" ? state.currentStreamingText : ""}
              isActive={phase === "advocate"}
            />
          )}

          {/* Challenger */}
          {showChallenger && (
            <StreamingBlock
              borderColor="var(--accent-amber)"
              label="Challenger"
              labelColor="var(--accent-amber)"
              paragraphs={state.challengerText}
              streamingText={phase === "challenger" ? state.currentStreamingText : ""}
              isActive={phase === "challenger"}
            />
          )}

          {/* Rebuttal */}
          {showRebuttal && (
            <StreamingBlock
              borderColor="var(--accent-green)"
              label="Advocate Rebuttal"
              labelColor="var(--accent-green)"
              paragraphs={state.rebuttalText ? [state.rebuttalText] : []}
              streamingText={phase === "rebuttal" ? state.currentStreamingText : ""}
              isActive={phase === "rebuttal"}
            />
          )}

          {/* Verdict */}
          <AnimatePresence>
            {showVerdict && state.verdict && (
              <VerdictCard
                verdict={state.verdict}
                name={profile?.name ?? state.currentEngineer ?? "Engineer"}
              />
            )}
          </AnimatePresence>

          {/* Scroll anchor */}
          <div ref={scrollBottomRef} />
        </div>
      </div>
    </motion.div>
  );
}
