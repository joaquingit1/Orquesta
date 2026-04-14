"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { GitHubLogin } from "@/components/GitHubLogin";
import { RepoPicker } from "@/components/RepoPicker";
import { TeamOverview } from "@/components/TeamOverview";
import { LiveReview } from "@/components/LiveReview";
import { RankingScreen } from "@/components/RankingScreen";
import {
  fetchMe,
  streamAllReviews,
  streamGitHubReview,
  type AuthUser,
  type Contributor,
  type ImportResponse,
} from "@/lib/api";
import type { Commit, PR, ReviewState, VerdictData } from "@/types";

type AppScreen = "landing" | "overview" | "review" | "ranking";

const initialReviewState: ReviewState = {
  phase: "idle",
  currentEngineer: null,
  engineerIndex: -1,
  thinkingText: [],
  advocateText: [],
  challengerText: [],
  rebuttalText: "",
  currentStreamingText: "",
  prs: [],
  commits: [],
  kpis: null,
  aiUsage: null,
  profile: null,
  verdict: null,
  completedReviews: {},
};

interface GitHubSession {
  sessionId: string;
  repo: string;
  contributors: Contributor[];
}

export interface ReviewTranscript {
  id: string;
  name: string;
  commits: Commit[];
  prs: PR[];
  analyzing: string;
  advocate: string;
  challenger: string;
  rebuttal: string;
  verdict: VerdictData | null;
}

export default function Home() {
  const [screen, setScreen] = useState<AppScreen>("landing");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [ghSession, setGhSession] = useState<GitHubSession | null>(null);

  const [reviewState, setReviewState] = useState<ReviewState>(initialReviewState);
  const [transcripts, setTranscripts] = useState<Record<string, ReviewTranscript>>({});
  const [completedEngineers, setCompletedEngineers] = useState<string[]>([]);
  const [elapsedTime, setElapsedTime] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Bootstrap: read ?auth=ok / ?auth_error and check session
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const err = params.get("auth_error");
    if (err) setAuthError(decodeURIComponent(err));
    if (params.has("auth") || err) {
      window.history.replaceState({}, "", window.location.pathname);
    }

    fetchMe()
      .then((u) => setUser(u))
      .catch(() => setUser(null))
      .finally(() => setAuthChecked(true));
  }, []);

  const handleImported = useCallback((payload: ImportResponse) => {
    setGhSession({
      sessionId: payload.session_id,
      repo: payload.repo,
      contributors: payload.contributors,
    });
    setCompletedEngineers([]);
    setScreen("overview");
  }, []);

  const handleLoggedOut = useCallback(() => {
    setUser(null);
    setGhSession(null);
  }, []);

  const handleBackToPicker = useCallback(() => {
    setGhSession(null);
    setScreen("landing");
  }, []);

  // Demo cycle (hardcoded engineers — kept as fallback)
  const startDemoCycle = useCallback(() => {
    setScreen("review");
    setReviewState({ ...initialReviewState, phase: "scanning" });
    setCompletedEngineers([]);
    setElapsedTime(0);
    timerRef.current = setInterval(() => setElapsedTime((t) => t + 1), 1000);

    streamAllReviews(
      (event) => {
        const type = event.type as string;
        // (kept identical to the original demo switch; see git history)
        if (type === "cycle_complete") {
          if (timerRef.current) clearInterval(timerRef.current);
          setTimeout(() => setScreen("ranking"), 1500);
        }
      },
      () => {
        if (timerRef.current) clearInterval(timerRef.current);
      }
    );
  }, []);

  // GitHub cycle — stream contributors sequentially
  const startGitHubCycle = useCallback(() => {
    if (!ghSession) return;
    setScreen("review");
    setReviewState({ ...initialReviewState, phase: "scanning" });
    setTranscripts({});
    setCompletedEngineers([]);
    setElapsedTime(0);
    timerRef.current = setInterval(() => setElapsedTime((t) => t + 1), 1000);

    const contributors = ghSession.contributors;

    const runOne = (index: number) => {
      if (index >= contributors.length) {
        if (timerRef.current) clearInterval(timerRef.current);
        setTimeout(() => setScreen("ranking"), 1500);
        return;
      }
      const contrib = contributors[index];

      setReviewState((prev) => ({
        ...prev,
        phase: "scanning",
        currentEngineer: contrib.id,
        engineerIndex: index,
        thinkingText: [],
        advocateText: [],
        challengerText: [],
        rebuttalText: "",
        currentStreamingText: "",
        prs: [],
        commits: [],
        kpis: null,
        aiUsage: null,
        profile: {
          id: contrib.id,
          name: contrib.name,
          role: "Contributor",
          tenure: "",
          summary: {
            prs_opened: contrib.prs_opened,
            prs_merged: contrib.prs_merged,
            commits: contrib.commits,
            reviews_given: 0,
            avg_pr_size: "N/A",
            avg_review_turnaround: "N/A",
            test_coverage_trend: "N/A",
            ai_tool_sessions: 0,
            ai_tool_adoption: "N/A",
          },
        },
        verdict: null,
      }));

      streamGitHubReview(ghSession.sessionId, contrib.id, {
        onEvent: (eventName, data) => {
          const text = typeof data.text === "string" ? (data.text as string) : "";
          switch (eventName) {
            case "commit":
              setReviewState((prev) => ({
                ...prev,
                commits: [...prev.commits, data as unknown as Commit],
              }));
              break;
            case "pr":
              setReviewState((prev) => ({
                ...prev,
                prs: [...prev.prs, data as unknown as PR],
              }));
              break;
            case "scanning":
              setReviewState((prev) => ({
                ...prev,
                phase: "scanning",
                currentStreamingText: prev.currentStreamingText + text,
              }));
              break;
            case "thinking":
              setReviewState((prev) => ({
                ...prev,
                phase: "thinking",
                currentStreamingText: prev.currentStreamingText + text,
              }));
              break;
            case "advocate":
              setReviewState((prev) => {
                const switching = prev.phase !== "advocate";
                return {
                  ...prev,
                  phase: "advocate",
                  currentStreamingText: switching ? text : prev.currentStreamingText + text,
                  // flush whatever was streaming before into the previous bucket
                  thinkingText: switching && prev.phase === "thinking"
                    ? [...prev.thinkingText, prev.currentStreamingText]
                    : prev.thinkingText,
                };
              });
              break;
            case "challenger":
              setReviewState((prev) => {
                const switching = prev.phase !== "challenger";
                return {
                  ...prev,
                  phase: "challenger",
                  currentStreamingText: switching ? text : prev.currentStreamingText + text,
                  advocateText: switching && prev.phase === "advocate"
                    ? [...prev.advocateText, prev.currentStreamingText]
                    : prev.advocateText,
                };
              });
              break;
            case "advocate_reply":
              setReviewState((prev) => {
                const switching = prev.phase !== "rebuttal";
                return {
                  ...prev,
                  phase: "rebuttal",
                  currentStreamingText: switching ? text : prev.currentStreamingText + text,
                  challengerText: switching && prev.phase === "challenger"
                    ? [...prev.challengerText, prev.currentStreamingText]
                    : prev.challengerText,
                };
              });
              break;
            case "verdict": {
              const verdict: VerdictData = {
                score: Number(data.score ?? 0),
                tagline: String(data.text ?? ""),
                summary: String(data.text ?? ""),
                detail: "",
                evidence_positive: [],
                evidence_negative: [],
                ai_note: "",
              };
              setReviewState((prev) => ({
                ...prev,
                phase: "verdict",
                verdict,
                rebuttalText: prev.phase === "rebuttal"
                  ? prev.currentStreamingText
                  : prev.rebuttalText,
              }));
              break;
            }
          }
        },
        onError: (msg) => console.warn("stream error:", msg),
        onDone: () => {
          setReviewState((prev) => {
            const analyzing = [...prev.thinkingText, prev.phase === "thinking" ? prev.currentStreamingText : ""].filter(Boolean).join("\n\n");
            const advocate = [...prev.advocateText, prev.phase === "advocate" ? prev.currentStreamingText : ""].filter(Boolean).join("\n\n");
            const challenger = [...prev.challengerText, prev.phase === "challenger" ? prev.currentStreamingText : ""].filter(Boolean).join("\n\n");
            const rebuttal = prev.rebuttalText || (prev.phase === "rebuttal" ? prev.currentStreamingText : "");

            setTranscripts((tprev) => ({
              ...tprev,
              [contrib.id]: {
                id: contrib.id,
                name: contrib.name,
                commits: prev.commits,
                prs: prev.prs,
                analyzing,
                advocate,
                challenger,
                rebuttal,
                verdict: prev.verdict,
              },
            }));

            return {
              ...prev,
              phase: "complete",
              completedReviews: prev.verdict
                ? { ...prev.completedReviews, [contrib.id]: prev.verdict }
                : prev.completedReviews,
            };
          });
          setCompletedEngineers((prev) => [...prev, contrib.id]);
          setTimeout(() => runOne(index + 1), 1200);
        },
      });
    };

    runOne(0);
  }, [ghSession]);

  // Render
  if (!authChecked) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-sm text-muted">Loading…</p>
      </main>
    );
  }

  const overviewEngineers = ghSession
    ? ghSession.contributors.map((c) => ({
        id: c.id,
        name: c.name,
        role: "Contributor",
        initials: initials(c.name),
      }))
    : undefined;

  return (
    <main className="min-h-screen bg-background">
      <AnimatePresence mode="wait">
        {screen === "landing" && !user && (
          <GitHubLogin key="login" errorMessage={authError} />
        )}
        {screen === "landing" && user && (
          <RepoPicker
            key="picker"
            user={user}
            onImported={handleImported}
            onLoggedOut={handleLoggedOut}
          />
        )}
        {screen === "overview" && (
          <TeamOverview
            key="overview"
            onStart={ghSession ? startGitHubCycle : startDemoCycle}
            completedEngineers={completedEngineers}
            engineers={overviewEngineers}
            subtitle={ghSession ? ghSession.repo : undefined}
            onBack={ghSession ? handleBackToPicker : undefined}
          />
        )}
        {screen === "review" && (
          <LiveReview key="review" state={reviewState} elapsedTime={elapsedTime} />
        )}
        {screen === "ranking" && (
          <RankingScreen
            key="ranking"
            elapsedTime={elapsedTime}
            sessionId={ghSession?.sessionId}
            repoName={ghSession?.repo}
            transcripts={transcripts}
          />
        )}
      </AnimatePresence>
    </main>
  );
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
