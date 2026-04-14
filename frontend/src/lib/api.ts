const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// ---------- Demo endpoints (hardcoded engineers) ----------

export async function fetchTeam() {
  const res = await fetch(`${API_BASE}/api/team`);
  return res.json();
}

export async function fetchRanking() {
  const res = await fetch(`${API_BASE}/api/ranking`);
  return res.json();
}

export async function fetchGitHubRanking(sessionId: string) {
  const res = await fetch(`${API_BASE}/api/github/${encodeURIComponent(sessionId)}/ranking`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error(`ranking ${res.status}`);
  return res.json();
}

export function streamAllReviews(
  onEvent: (event: Record<string, unknown>) => void,
  onDone: () => void
) {
  const evtSource = new EventSource(`${API_BASE}/api/review/start/all`);

  evtSource.onmessage = (e) => {
    try {
      const data = JSON.parse(e.data);
      if (data.type === "cycle_complete") {
        onEvent(data);
        evtSource.close();
        onDone();
      } else {
        onEvent(data);
      }
    } catch {
      // ignore parse errors
    }
  };

  evtSource.onerror = () => {
    evtSource.close();
    onDone();
  };

  return () => evtSource.close();
}

// ---------- Auth + GitHub ----------

export interface AuthUser {
  login: string;
  name: string;
  avatar_url: string;
}

export interface Repo {
  full_name: string;
  name: string;
  private: boolean;
  description: string | null;
  language: string | null;
  stars: number;
  pushed_at: string | null;
  default_branch: string;
}

export interface Contributor {
  id: string;
  name: string;
  prs_opened: number;
  prs_merged: number;
  commits: number;
}

export interface ImportResponse {
  session_id: string;
  repo: string;
  contributors: Contributor[];
}

export function loginUrl(): string {
  return `${API_BASE}/api/auth/github/login`;
}

export async function fetchMe(): Promise<AuthUser | null> {
  const res = await fetch(`${API_BASE}/api/me`, { credentials: "include" });
  if (res.status === 401) return null;
  if (!res.ok) throw new Error(`me ${res.status}`);
  const data = await res.json();
  return data.user as AuthUser;
}

export async function fetchMyRepos(): Promise<Repo[]> {
  const res = await fetch(`${API_BASE}/api/me/repos?per_page=50&sort=pushed`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error(`repos ${res.status}`);
  const data = await res.json();
  return data.repos as Repo[];
}

export async function logout(): Promise<void> {
  await fetch(`${API_BASE}/api/auth/logout`, {
    method: "POST",
    credentials: "include",
  });
}

export async function importRepo(repoFullName: string): Promise<ImportResponse> {
  const res = await fetch(`${API_BASE}/api/import/github`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ repo: repoFullName, max_contributors: 6 }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: `HTTP ${res.status}` }));
    throw new Error(err.detail || `import ${res.status}`);
  }
  return res.json();
}

/**
 * Streams the multi-agent review for a single GitHub contributor.
 * Backend emits named SSE events: scanning, thinking, advocate, challenger, advocate_reply, verdict, done, error.
 */
export function streamGitHubReview(
  sessionId: string,
  engineerId: string,
  handlers: {
    onEvent: (eventName: string, data: Record<string, unknown>) => void;
    onDone: () => void;
    onError?: (msg: string) => void;
  }
) {
  const url = `${API_BASE}/api/github/${encodeURIComponent(sessionId)}/review/${encodeURIComponent(engineerId)}/stream`;
  const evtSource = new EventSource(url, { withCredentials: true });

  const named = ["commit", "pr", "scanning", "thinking", "advocate", "challenger", "advocate_reply", "verdict", "done", "error"];
  named.forEach((name) => {
    evtSource.addEventListener(name, (e) => {
      try {
        const data = JSON.parse((e as MessageEvent).data);
        handlers.onEvent(name, data);
        if (name === "done") {
          evtSource.close();
          handlers.onDone();
        }
        if (name === "error") {
          evtSource.close();
          handlers.onError?.(typeof data.message === "string" ? data.message : "stream error");
          handlers.onDone();
        }
      } catch {
        // ignore parse errors
      }
    });
  });

  evtSource.onerror = () => {
    evtSource.close();
    handlers.onDone();
  };

  return () => evtSource.close();
}
