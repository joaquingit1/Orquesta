import { Card, CardHeader, CardTitle } from "@/components/Card";
import { PageHeader } from "@/components/PageHeader";
import { QualityBadge } from "@/components/QualityBadge";
import { api } from "@/lib/api";
import { formatDate, formatTokens, formatUsd } from "@/lib/utils";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function CommitsPage() {
  const commits = await api.commits(200).catch(() => []);

  return (
    <>
      <PageHeader
        title="Commits"
        subtitle="Every commit, its AI cost, and its quality — correlated."
      />
      <Card>
        <CardHeader>
          <CardTitle>{commits.length} commits</CardTitle>
        </CardHeader>
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-fg-muted border-b border-border">
                <th className="text-left font-medium py-2 pr-4">Commit</th>
                <th className="text-left font-medium py-2 pr-4">Engineer</th>
                <th className="text-right font-medium py-2 pr-4">Files</th>
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
                  <td className="py-3 pr-4 text-xs text-fg-muted truncate max-w-[140px]">
                    {c.engineer?.name || c.engineer?.email || "—"}
                  </td>
                  <td className="py-3 pr-4 text-right tabular-nums text-fg-muted">
                    {c.files_changed}
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
                  <td colSpan={8} className="py-12 text-center text-fg-muted text-sm">
                    No commits yet.
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
