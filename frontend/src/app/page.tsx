"use client";

import { useState, useCallback, useRef } from "react";
import { AnimatePresence } from "framer-motion";
import { TeamOverview } from "@/components/TeamOverview";
import { LiveReview } from "@/components/LiveReview";
import { RankingScreen } from "@/components/RankingScreen";
import { streamAllReviews } from "@/lib/api";
import type {
  AppScreen,
  ReviewState,
  VerdictData,
  PR,
  KPIs,
  AIUsage,
} from "@/types";

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
  kpis: null,
  aiUsage: null,
  profile: null,
  verdict: null,
  completedReviews: {},
};

export default function Home() {
  const [screen, setScreen] = useState<AppScreen>("overview");
  const [reviewState, setReviewState] = useState<ReviewState>(initialReviewState);
  const [completedEngineers, setCompletedEngineers] = useState<string[]>([]);
  const [elapsedTime, setElapsedTime] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startReviewCycle = useCallback(() => {
    setScreen("review");
    setReviewState({ ...initialReviewState, phase: "scanning" });
    setCompletedEngineers([]);
    setElapsedTime(0);

    timerRef.current = setInterval(() => {
      setElapsedTime((t) => t + 1);
    }, 1000);

    streamAllReviews(
      (event) => {
        const type = event.type as string;

        switch (type) {
          case "engineer_start":
            setReviewState((prev) => ({
              ...prev,
              phase: "scanning",
              currentEngineer: event.id as string,
              engineerIndex: event.index as number,
              thinkingText: [],
              advocateText: [],
              challengerText: [],
              rebuttalText: "",
              currentStreamingText: "",
              prs: [],
              kpis: null,
              aiUsage: null,
              profile: null,
              verdict: null,
            }));
            break;

          case "profile":
            setReviewState((prev) => ({
              ...prev,
              profile: event.data as ReviewState["profile"],
            }));
            break;

          case "pr":
            setReviewState((prev) => ({
              ...prev,
              prs: [...prev.prs, event.data as PR],
            }));
            break;

          case "kpis":
            setReviewState((prev) => ({
              ...prev,
              kpis: event.data as KPIs,
            }));
            break;

          case "ai_usage":
            setReviewState((prev) => ({
              ...prev,
              aiUsage: event.data as AIUsage,
            }));
            break;

          case "thinking_start":
            setReviewState((prev) => ({
              ...prev,
              phase: "thinking",
              currentStreamingText: "",
            }));
            break;

          case "thinking_chunk":
            setReviewState((prev) => ({
              ...prev,
              currentStreamingText: prev.currentStreamingText + (event.content as string),
            }));
            break;

          case "thinking_end":
            setReviewState((prev) => ({
              ...prev,
              thinkingText: [...prev.thinkingText, prev.currentStreamingText],
              currentStreamingText: "",
            }));
            break;

          case "thinking_complete":
            setReviewState((prev) => ({
              ...prev,
              phase: "advocate",
              currentStreamingText: "",
            }));
            break;

          case "advocate_start":
            setReviewState((prev) => ({
              ...prev,
              phase: "advocate",
              currentStreamingText: "",
            }));
            break;

          case "advocate_chunk":
            setReviewState((prev) => ({
              ...prev,
              currentStreamingText: prev.currentStreamingText + (event.content as string),
            }));
            break;

          case "advocate_end":
            setReviewState((prev) => ({
              ...prev,
              advocateText: [...prev.advocateText, prev.currentStreamingText],
              currentStreamingText: "",
            }));
            break;

          case "challenger_start":
            setReviewState((prev) => ({
              ...prev,
              phase: "challenger",
              currentStreamingText: "",
            }));
            break;

          case "challenger_chunk":
            setReviewState((prev) => ({
              ...prev,
              currentStreamingText: prev.currentStreamingText + (event.content as string),
            }));
            break;

          case "challenger_end":
            setReviewState((prev) => ({
              ...prev,
              challengerText: [...prev.challengerText, prev.currentStreamingText],
              currentStreamingText: "",
            }));
            break;

          case "rebuttal_start":
            setReviewState((prev) => ({
              ...prev,
              phase: "rebuttal",
              currentStreamingText: "",
            }));
            break;

          case "rebuttal_chunk":
            setReviewState((prev) => ({
              ...prev,
              currentStreamingText: prev.currentStreamingText + (event.content as string),
            }));
            break;

          case "rebuttal_end":
            setReviewState((prev) => ({
              ...prev,
              rebuttalText: prev.currentStreamingText,
              currentStreamingText: "",
            }));
            break;

          case "verdict":
            setReviewState((prev) => ({
              ...prev,
              phase: "verdict",
              verdict: event.data as VerdictData,
            }));
            break;

          case "engineer_complete":
            setReviewState((prev) => ({
              ...prev,
              phase: "complete",
              completedReviews: {
                ...prev.completedReviews,
                [event.id as string]: prev.verdict!,
              },
            }));
            setCompletedEngineers((prev) => [...prev, event.id as string]);
            break;

          case "cycle_complete":
            if (timerRef.current) clearInterval(timerRef.current);
            setTimeout(() => setScreen("ranking"), 1500);
            break;
        }
      },
      () => {
        if (timerRef.current) clearInterval(timerRef.current);
      }
    );
  }, []);

  return (
    <main className="min-h-screen bg-background">
      <AnimatePresence mode="wait">
        {screen === "overview" && (
          <TeamOverview
            key="overview"
            onStart={startReviewCycle}
            completedEngineers={completedEngineers}
          />
        )}
        {screen === "review" && (
          <LiveReview
            key="review"
            state={reviewState}
            elapsedTime={elapsedTime}
          />
        )}
        {screen === "ranking" && (
          <RankingScreen
            key="ranking"
            elapsedTime={elapsedTime}
          />
        )}
      </AnimatePresence>
    </main>
  );
}
