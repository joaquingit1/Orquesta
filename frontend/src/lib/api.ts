const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function fetchTeam() {
  const res = await fetch(`${API_BASE}/api/team`);
  return res.json();
}

export async function fetchRanking() {
  const res = await fetch(`${API_BASE}/api/ranking`);
  return res.json();
}

export async function fetchSchedule() {
  const res = await fetch(`${API_BASE}/api/schedule`);
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
