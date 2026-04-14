import { qualityBg } from "@/lib/utils";

export function QualityBadge({ score }: { score: number | null | undefined }) {
  const display = score == null || score === 0 ? "—" : score.toFixed(1);
  return (
    <span
      className={`inline-flex items-center justify-center rounded-md border px-2 py-0.5 text-xs font-semibold tabular-nums ${qualityBg(
        score
      )}`}
    >
      {display}
    </span>
  );
}
