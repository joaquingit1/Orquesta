export interface EngineerSummary {
  prs_opened: number;
  prs_merged: number;
  commits: number;
  reviews_given: number;
  avg_pr_size: string;
  avg_review_turnaround: string;
  test_coverage_trend: string;
  ai_tool_sessions: number;
  ai_tool_adoption: string;
}

export interface PR {
  number: number;
  title: string;
  files_changed: number;
  additions: number;
  deletions: number;
  description: string;
  diff_snippet?: string;
  quality_signals: string[];
}

export interface Commit {
  sha: string;
  message: string;
  date: string;
  url: string;
}

export interface KPIGoal {
  goal: string;
  status: "completed" | "missed" | "in_progress";
  impact: string;
}

export interface KPIs {
  sprint_velocity: string;
  goals_completed: string;
  goals: KPIGoal[];
}

export interface AIUsage {
  total_sessions: number;
  total_tokens: string;
  adoption_rate: string;
  use_cases: string[];
  pattern: string;
  quality_note: string;
}

export interface VerdictData {
  score: number;
  tagline: string;
  summary: string;
  detail: string;
  evidence_positive: string[];
  evidence_negative: string[];
  ai_note: string;
}

export interface Engineer {
  id: string;
  name: string;
  role: string;
  avatar: string;
  tenure: string;
  summary: EngineerSummary;
  notable_prs: PR[];
  kpis: KPIs;
  anthropic_usage: AIUsage;
  score: number;
  verdict_tagline: string;
  rank: number;
}

export interface RankingEntry {
  rank: number;
  id: string;
  name: string;
  role: string;
  score: number;
  tagline: string;
  prs: number;
  kpis: string;
  ai_adoption: string;
}

export interface ScheduleMeeting {
  date: string;
  engineer: string;
  duration: string;
  note: string;
}

export type AppScreen = "overview" | "review" | "ranking";

export interface ReviewState {
  phase: "idle" | "scanning" | "thinking" | "audit" | "advocate" | "challenger" | "rebuttal" | "verdict" | "complete";
  currentEngineer: string | null;
  engineerIndex: number;
  thinkingText: string[];
  auditText: string[];
  advocateText: string[];
  challengerText: string[];
  rebuttalText: string;
  currentStreamingText: string;
  prs: PR[];
  commits: Commit[];
  kpis: KPIs | null;
  aiUsage: AIUsage | null;
  profile: { name: string; role: string; id: string; tenure: string; summary: EngineerSummary } | null;
  verdict: VerdictData | null;
  completedReviews: Record<string, VerdictData>;
}
