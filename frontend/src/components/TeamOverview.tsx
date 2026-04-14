"use client";

import { motion } from "framer-motion";
import type { ProjectSummary } from "@/lib/api";

interface Engineer {
  id: string;
  name: string;
  role: string;
  initials: string;
}

const defaultEngineers: Engineer[] = [
  { id: "ana-oliveira", name: "Ana Oliveira", role: "Senior Engineer", initials: "AO" },
  { id: "diego-ramirez", name: "Diego Ramirez", role: "Mid Engineer", initials: "DR" },
  { id: "carlos-mendez", name: "Carlos Mendez", role: "Senior Engineer", initials: "CM" },
  { id: "sofia-torres", name: "Sofia Torres", role: "Junior Engineer", initials: "ST" },
];

interface Props {
  onStart: () => void;
  completedEngineers: string[];
  // Optional — when provided, shows GitHub contributors instead of the demo team.
  engineers?: Engineer[];
  subtitle?: string;
  onBack?: () => void;
  project?: ProjectSummary | null;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.2,
    },
  },
  exit: {
    opacity: 0,
    y: -20,
    transition: { duration: 0.3 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" as const },
  },
};

export function TeamOverview({ onStart, completedEngineers, engineers, subtitle, onBack, project }: Props) {
  const list = engineers && engineers.length > 0 ? engineers : defaultEngineers;
  const gridCols = list.length >= 4
    ? "sm:grid-cols-2 lg:grid-cols-4"
    : list.length === 3
      ? "sm:grid-cols-3"
      : "sm:grid-cols-2";
  return (
    <motion.div
      key="overview"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="min-h-screen flex flex-col items-center justify-center px-6 py-16"
    >
      {/* Brand */}
      <motion.div variants={itemVariants} className="mb-16 text-center">
        <h1 className="text-sm font-mono tracking-[0.3em] text-foreground/50 uppercase mb-1">
          Orquesta
        </h1>
        <div className="w-8 h-px bg-accent-cyan mx-auto" />
      </motion.div>

      {/* Heading */}
      <motion.div variants={itemVariants} className="text-center mb-12">
        <h2 className="text-3xl font-semibold tracking-tight text-foreground mb-2">
          {engineers ? "Contributors" : "Your Engineering Team"}
        </h2>
        <p className="text-sm text-foreground/50">
          {subtitle || `${list.length} engineers · Q1 2026`}
        </p>
        {onBack && (
          <button
            onClick={onBack}
            className="mt-3 text-xs text-foreground/50 hover:text-foreground transition-colors cursor-pointer"
          >
            ← Pick another repo
          </button>
        )}
      </motion.div>

      {/* Project Summary (if available) */}
      {project && project.summary && (
        <motion.div
          variants={itemVariants}
          className="w-full max-w-3xl mb-10 rounded-xl border border-card-border bg-card-bg p-5"
        >
          <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
            <h3 className="text-xs font-mono uppercase tracking-wider text-foreground/50">
              Project profile
            </h3>
            <span className="text-[10px] font-mono text-foreground/50">
              {project.size_signal}{project.stars ? ` · ${project.stars.toLocaleString()}★` : ""}
            </span>
          </div>
          <p className="text-sm text-foreground/85 leading-relaxed mb-3">{project.summary}</p>
          {project.stack?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {project.stack.slice(0, 8).map((s) => (
                <span key={s} className="text-[10px] font-mono text-accent-cyan/90 bg-accent-cyan/5 rounded px-1.5 py-0.5">
                  {s}
                </span>
              ))}
            </div>
          )}
          {project.critical_paths?.length > 0 && (
            <div className="text-[11px] text-foreground/60">
              <span className="text-foreground/80 font-medium">Critical paths:</span>{" "}
              {project.critical_paths.slice(0, 6).join(" · ")}
            </div>
          )}
        </motion.div>
      )}

      {/* Engineer Cards */}
      <motion.div
        variants={itemVariants}
        className={`grid grid-cols-1 ${gridCols} gap-4 mb-16 w-full max-w-3xl`}
      >
        {list.map((eng) => {
          const isCompleted = completedEngineers.includes(eng.id);

          return (
            <motion.div
              key={eng.id}
              variants={itemVariants}
              whileHover={{ scale: 1.03, borderColor: "rgba(6, 182, 212, 0.3)" }}
              transition={{ duration: 0.2 }}
              className="flex flex-col items-center gap-3 rounded-xl border border-card-border bg-card-bg p-6
                         hover:border-accent-cyan/30 transition-colors cursor-default"
            >
              {/* Avatar */}
              <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-sm font-medium text-foreground/80">
                {eng.initials}
              </div>

              {/* Name & Role */}
              <div className="text-center">
                <p className="text-sm font-medium text-foreground">{eng.name}</p>
                <p className="text-xs text-foreground/50 mt-0.5">{eng.role}</p>
              </div>

              {/* Status */}
              {isCompleted ? (
                <div className="flex items-center gap-1.5 mt-1">
                  <svg
                    className="w-3.5 h-3.5 text-accent-green"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-xs text-accent-green font-medium">Reviewed</span>
                </div>
              ) : (
                <span className="text-xs text-foreground/60 mt-1">Not yet reviewed</span>
              )}
            </motion.div>
          );
        })}
      </motion.div>

      {/* CTA Button */}
      <motion.div variants={itemVariants}>
        <button
          onClick={onStart}
          className="pulse-glow rounded-full bg-accent-cyan px-8 py-3 text-sm font-semibold text-black
                     hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer"
        >
          Run Performance Review Cycle
        </button>
      </motion.div>
    </motion.div>
  );
}
