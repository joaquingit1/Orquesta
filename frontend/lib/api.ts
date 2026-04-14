const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function fetchJSON<T>(path: string): Promise<T> {
  const res = await fetch(`${API}${path}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`${path} → ${res.status}`);
  return res.json();
}

export type Totals = {
  commits: number;
  tokens: number;
  cost_usd: number;
  cost_usd_30d: number;
  avg_quality: number;
  engineers: number;
  projects: number;
};

export type TimeseriesPoint = {
  date: string;
  cost: number;
  tokens: number;
  commits: number;
};

export type Engineer = {
  id: number;
  email: string;
  name: string;
  commits: number;
  tokens: number;
  cost_usd: number;
  lines: number;
  avg_quality: number;
  efficiency: number;
};

export type CommitRow = {
  id: number;
  sha: string;
  short_sha: string;
  subject: string;
  committed_at: string;
  additions: number;
  deletions: number;
  files_changed: number;
  total_tokens: number;
  input_tokens: number;
  output_tokens: number;
  cache_read_input_tokens: number;
  cache_creation_input_tokens: number;
  model: string;
  cost_usd: number;
  quality_score: number | null;
  quality_summary: string | null;
  quality_issues: { issues: any[]; dimensions: Record<string, number> } | null;
  engineer?: { id: number; email: string; name: string };
};

export const api = {
  overview: () =>
    fetchJSON<{ totals: Totals; timeseries: TimeseriesPoint[] }>("/overview"),
  engineers: () => fetchJSON<Engineer[]>("/engineers"),
  engineer: (id: number) =>
    fetchJSON<{
      engineer: { id: number; email: string; name: string };
      summary: { commits: number; tokens: number; cost_usd: number; avg_quality: number };
      timeseries: TimeseriesPoint[];
      commits: CommitRow[];
    }>(`/engineers/${id}`),
  commits: (limit = 100) => fetchJSON<CommitRow[]>(`/commits?limit=${limit}`),
  commit: (id: number) =>
    fetchJSON<CommitRow & { diff_patch: string | null }>(`/commits/${id}`),
};
