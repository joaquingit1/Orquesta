import { Card, CardHeader, CardTitle } from "@/components/Card";
import { KpiCard } from "@/components/KpiCard";
import { PageHeader } from "@/components/PageHeader";
import { QualityBadge } from "@/components/QualityBadge";
import { api } from "@/lib/api";
import { formatDate, formatTokens, formatUsd, cn } from "@/lib/utils";
import { DollarSign, FileDiff, Sparkles, TrendingUp } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function CommitDetailPage({ params }: { params: { id: string } }) {
  const id = parseInt(params.id, 10);
  let c;
  try {
    c = await api.commit(id);
  } catch {
    notFound();
  }
  if (!c) notFound();

  const issues = c.quality_issues?.issues || [];
  const dims = c.quality_issues?.dimensions || {};

  return (
    <>
      <div className="mb-6">
        <Link href="/commits" className="text-xs text-fg-muted hover:text-fg">
          ← Commits
        </Link>
      </div>
      <PageHeader
        title={<span className="font-mono text-accent">{c.short_sha}</span>}
        subtitle={c.subject}
        actions={
          <div className="flex items-center gap-3 text-sm">
            {c.engineer && (
              <Link
                href={`/engineers/${c.engineer.id}`}
                className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-border bg-bg-card hover:bg-bg-hover"
              >
                <div className="w-5 h-5 rounded-full bg-accent-soft grid place-items-center text-accent text-[10px] font-semibold">
                  {(c.engineer.name || c.engineer.email)[0]?.toUpperCase()}
                </div>
                <span className="text-xs">{c.engineer.name || c.engineer.email}</span>
              </Link>
            )}
            <div className="text-xs text-fg-muted">{formatDate(c.committed_at)}</div>
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <KpiCard
          label="Cost"
          value={formatUsd(c.cost_usd)}
          sub={c.model || "unknown model"}
          icon={DollarSign}
          tone="accent"
        />
        <KpiCard label="Tokens" value={formatTokens(c.total_tokens)} icon={Sparkles} />
        <KpiCard
          label="Changes"
          value={`+${c.additions} / -${c.deletions}`}
          sub={`${c.files_changed} files`}
          icon={FileDiff}
        />
        <KpiCard
          label="Quality score"
          value={c.quality_score ? c.quality_score.toFixed(1) : "—"}
          sub={c.quality_summary || "pending analysis"}
          icon={TrendingUp}
          tone={
            c.quality_score && c.quality_score >= 8
              ? "good"
              : c.quality_score && c.quality_score >= 6
              ? "warn"
              : "default"
          }
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-6">
        <Card className="xl:col-span-1">
          <CardHeader>
            <CardTitle>Quality dimensions</CardTitle>
          </CardHeader>
          {Object.keys(dims).length > 0 ? (
            <div className="flex flex-col gap-3">
              {Object.entries(dims).map(([k, v]) => (
                <div key={k}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="capitalize text-fg-muted">{k}</span>
                    <span className="tabular-nums">{(v as number).toFixed(1)}</span>
                  </div>
                  <div className="h-1.5 bg-bg-soft rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-accent to-purple-400"
                      style={{ width: `${(v as number) * 10}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-xs text-fg-muted py-6">No analysis yet.</div>
          )}
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Review findings</CardTitle>
              <QualityBadge score={c.quality_score} />
            </div>
          </CardHeader>
          {issues.length > 0 ? (
            <div className="flex flex-col gap-2">
              {issues.map((i: any, idx: number) => (
                <div
                  key={idx}
                  className={cn(
                    "p-3 rounded-lg border text-sm",
                    i.severity === "high"
                      ? "bg-bad/5 border-bad/30"
                      : i.severity === "medium"
                      ? "bg-warn/5 border-warn/30"
                      : "bg-fg-subtle/5 border-border"
                  )}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={cn(
                        "text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded",
                        i.severity === "high"
                          ? "bg-bad/20 text-bad"
                          : i.severity === "medium"
                          ? "bg-warn/20 text-warn"
                          : "bg-fg-subtle/20 text-fg-muted"
                      )}
                    >
                      {i.severity}
                    </span>
                    <span className="font-medium">{i.title}</span>
                  </div>
                  <p className="text-xs text-fg-muted">{i.detail}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-xs text-fg-muted py-6">
              {c.quality_summary || "Quality analysis pending. Refresh in a few seconds."}
            </div>
          )}
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Token breakdown</CardTitle>
        </CardHeader>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <Stat label="Input" value={formatTokens(c.input_tokens)} />
          <Stat label="Output" value={formatTokens(c.output_tokens)} />
          <Stat label="Cache read" value={formatTokens(c.cache_read_input_tokens)} />
          <Stat label="Cache write" value={formatTokens(c.cache_creation_input_tokens)} />
        </div>
      </Card>

      {c.diff_patch && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Diff</CardTitle>
          </CardHeader>
          <pre className="text-xs font-mono overflow-x-auto scrollbar-thin bg-bg-soft p-4 rounded-lg max-h-[500px] overflow-y-auto">
            {c.diff_patch.split("\n").map((line, i) => {
              let cls = "text-fg-muted";
              if (line.startsWith("+") && !line.startsWith("+++")) cls = "text-good";
              else if (line.startsWith("-") && !line.startsWith("---")) cls = "text-bad";
              else if (line.startsWith("@@")) cls = "text-accent";
              return (
                <div key={i} className={cls}>
                  {line || " "}
                </div>
              );
            })}
          </pre>
        </Card>
      )}
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-fg-muted uppercase tracking-wider mb-1">{label}</div>
      <div className="text-lg font-semibold tabular-nums">{value}</div>
    </div>
  );
}
