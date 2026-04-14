import { Card, CardHeader, CardTitle } from "@/components/Card";
import { KpiCard } from "@/components/KpiCard";
import { PageHeader } from "@/components/PageHeader";
import { QualityBadge } from "@/components/QualityBadge";
import { TrendChart } from "@/components/TrendChart";
import { api } from "@/lib/api";
import { formatDate, formatTokens, formatUsd } from "@/lib/utils";
import { DollarSign, GitCommit, Sparkles, TrendingUp } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function EngineerDetailPage({ params }: { params: { id: string } }) {
  const id = parseInt(params.id, 10);
  let data;
  try {
    data = await api.engineer(id);
  } catch {
    notFound();
  }
  if (!data) notFound();

  const { engineer, summary, timeseries, commits } = data;

  return (
    <>
      <div className="mb-6">
        <Link href="/engineers" className="text-xs text-fg-muted hover:text-fg">
          ← Engineers
        </Link>
      </div>
      <PageHeader
        title={engineer.name || engineer.email}
        subtitle={engineer.email}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <KpiCard
          label="AI spend"
          value={formatUsd(summary.cost_usd)}
          sub="All-time"
          icon={DollarSign}
          tone="accent"
        />
        <KpiCard
          label="Commits"
          value={summary.commits}
          icon={GitCommit}
        />
        <KpiCard
          label="Tokens"
          value={formatTokens(summary.tokens)}
          icon={Sparkles}
        />
        <KpiCard
          label="Avg quality"
          value={summary.avg_quality > 0 ? summary.avg_quality.toFixed(1) : "—"}
          icon={TrendingUp}
          tone={summary.avg_quality >= 8 ? "good" : summary.avg_quality >= 6 ? "warn" : "default"}
        />
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Daily AI spend</CardTitle>
        </CardHeader>
        {timeseries.length > 0 ? (
          <TrendChart data={timeseries} metric="cost" />
        ) : (
          <div className="h-[240px] flex items-center justify-center text-sm text-fg-muted">
            No activity yet.
          </div>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Commits ({commits.length})</CardTitle>
        </CardHeader>
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-fg-muted border-b border-border">
                <th className="text-left font-medium py-2 pr-4">Commit</th>
                <th className="text-right font-medium py-2 pr-4">Changes</th>
                <th className="text-right font-medium py-2 pr-4">Tokens</th>
                <th className="text-right font-medium py-2 pr-4">Cost</th>
                <th className="text-right font-medium py-2 pr-4">Quality</th>
                <th className="text-right font-medium py-2">When</th>
              </tr>
            </thead>
            <tbody>
              {commits.map((c) => (
                <tr
                  key={c.id}
                  className="border-b border-border/50 hover:bg-bg-hover/50 transition-colors"
                >
                  <td className="py-3 pr-4">
                    <Link
                      href={`/commits/${c.id}`}
                      className="font-mono text-xs text-accent hover:underline"
                    >
                      {c.short_sha}
                    </Link>
                    <div className="text-xs text-fg-muted truncate max-w-[280px]">
                      {c.subject}
                    </div>
                  </td>
                  <td className="py-3 pr-4 text-right font-mono text-xs tabular-nums">
                    <span className="text-good">+{c.additions}</span>
                    <span className="text-fg-subtle"> / </span>
                    <span className="text-bad">-{c.deletions}</span>
                  </td>
                  <td className="py-3 pr-4 text-right tabular-nums">
                    {formatTokens(c.total_tokens)}
                  </td>
                  <td className="py-3 pr-4 text-right tabular-nums font-medium">
                    {formatUsd(c.cost_usd)}
                  </td>
                  <td className="py-3 pr-4 text-right">
                    <QualityBadge score={c.quality_score} />
                  </td>
                  <td className="py-3 text-right text-xs text-fg-muted">
                    {formatDate(c.committed_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
