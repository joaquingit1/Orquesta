import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatUsd(n: number) {
  if (n >= 1000) return `$${(n / 1000).toFixed(2)}k`;
  if (n >= 10) return `$${n.toFixed(2)}`;
  return `$${n.toFixed(3)}`;
}

export function formatTokens(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return `${n}`;
}

export function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function qualityColor(score: number | null | undefined) {
  if (score == null || score === 0) return "text-fg-muted";
  if (score >= 8) return "text-good";
  if (score >= 6) return "text-warn";
  return "text-bad";
}

export function qualityBg(score: number | null | undefined) {
  if (score == null || score === 0) return "bg-fg-subtle/20";
  if (score >= 8) return "bg-good/15 text-good border-good/30";
  if (score >= 6) return "bg-warn/15 text-warn border-warn/30";
  return "bg-bad/15 text-bad border-bad/30";
}
