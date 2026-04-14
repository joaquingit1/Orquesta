import { Card } from "./Card";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon?: LucideIcon;
  tone?: "default" | "good" | "warn" | "accent";
}) {
  const tones = {
    default: "text-fg",
    good: "text-good",
    warn: "text-warn",
    accent: "text-accent",
  };
  return (
    <Card className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-fg-muted">
          {label}
        </span>
        {Icon && <Icon className="w-4 h-4 text-fg-subtle" />}
      </div>
      <div className={cn("text-3xl font-semibold tabular-nums", tones[tone])}>{value}</div>
      {sub && <div className="text-xs text-fg-muted">{sub}</div>}
    </Card>
  );
}
