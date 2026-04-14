import { KpiCard } from "@/components/KpiCard";
import { Card, CardHeader, CardTitle } from "@/components/Card";
import { PageHeader } from "@/components/PageHeader";
import { TrendChart } from "@/components/TrendChart";
import { QualityBadge } from "@/components/QualityBadge";
import { EmptyState } from "@/components/EmptyState";
import { api } from "@/lib/api";
import { formatTokens, formatUsd, formatDate } from "@/lib/utils";
import { DollarSign, GitCommit, Sparkles, Users, TrendingUp } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function OverviewPage() {
  let data;
  try {
    data = await api.overview();
  } catch {
    return (
      <>
        <PageHeader title="Overview" subtitle="AI ROI across the entire team" />
        <EmptyState
          title="Backend not reachable"
          description="Start the FastAPI backend with `uvicorn main:app --reload` and refresh this page."
        />
      </>
    );
  }

  const { totals, timeseries } = data;
  const engineers = await api.engineers().catch(() => []);
  const commits = await api.commits(8).catch(() => []);

  return (
    <>
      <PageHeader
        title="Overview"
        subtitle="What your team spends on AI and what it returns."
        actions={
          <div className="text-xs text-fg-muted px-3 py-1.5 rounded-md border border-border bg-bg-card">
            Last 30 days
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <KpiCard
          label="AI spend (30d)"
          value={formatUsd(totals.cost_usd_30d)}
          sub={`All-time: ${formatUsd(totals.cost_usd)}`}
          icon={DollarSign}
          tone="accent"
        />
        <KpiCard
          label="Commits tracked"
          value={totals.commits.toLocaleString()}
          sub={`${totals.engineers} engineers · ${totals.projects} projects`}
          icon={GitCommit}
        />
        <KpiCard
          label="Tokens consumed"
          value={formatTokens(totals.tokens)}
          sub="Claude input + output + cache"
          icon={Sparkles}
        />
        <KpiCard
          label="Avg code quality"
          value={totals.avg_quality > 0 ? totals.avg_quality.toFixed(1) : "—"}
          sub="Claude-rated diffs, 1–10"
          icon={TrendingUp}
          tone={totals.avg_quality >= 8 ? "good" : totals.avg_quality >= 6 ? "warn" : "default"}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-6">
        <Card className="xl:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>AI spend over time</CardTitle>
              <span className="text-xs text-fg-muted">USD per day, last 30d</span>
            </div>
          </CardHeader>
          {timeseries.length > 0 ? (
            <TrendChart data={timeseries} metric="cost" />
          ) : (
            <div className="h-[240px] flex items-center justify-center text-sm text-fg-muted">
              No data yet — start committing to see your team's AI spend.
            </div>
          )}
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Top spenders</CardTitle>
              <Users className="w-4 h-4 text-fg-subtle" />
            </div>
          </CardHeader>
          <div className="flex flex-col gap-2">
            {engineers.slice(0, 5).map((e) => (
              <Link
                key={e.id}
                href={`/engineers/${e.id}`}
                className="flex items-center justify-between p-3 rounded-lg bg-bg-soft border border-border hover:border-border-strong hover:bg-bg-hover transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-accent-soft grid place-items-center text-accent text-xs font-semibold shrink-0">
                    {(e.name || e.email)[0]?.toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{e.name || e.email}</div>
                    <div className="text-xs text-fg-muted truncate">{e.commits} commits</div>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-sm font-semibold tabular-nums">
                    {formatUsd(e.cost_usd)}
                  </div>
                  <QualityBadge score={e.avg_quality} />
                </div>
              </Link>
            ))}
            {engineers.length === 0 && (
              <div className="text-xs text-fg-muted py-6 text-center">No engineers yet.</div>
            )}
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Recent commits</CardTitle>
            <Link href="/commits" className="text-xs text-accent hover:underline">
              View all →
            </Link>
          </div>
        </CardHeader>
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-fg-muted border-b border-border">
                <th className="text-left font-medium py-2 pr-4">Commit</th>
                <th className="text-left font-medium py-2 pr-4">Engineer</th>
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
                    <div className="text-xs text-fg-muted truncate max-w-[260px]">
                      {c.subject}
                    </div>
                  </td>
                  <td className="py-3 pr-4 text-fg-muted text-xs truncate max-w-[160px]">
                    {c.engineer?.name || c.engineer?.email || "—"}
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
              {commits.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-fg-muted text-sm">
                    No commits ingested yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
