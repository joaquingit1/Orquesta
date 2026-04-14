import { Card, CardHeader, CardTitle } from "@/components/Card";
import { PageHeader } from "@/components/PageHeader";
import { QualityBadge } from "@/components/QualityBadge";
import { api } from "@/lib/api";
import { formatTokens, formatUsd } from "@/lib/utils";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function EngineersPage() {
  const engineers = await api.engineers().catch(() => []);

  return (
    <>
      <PageHeader
        title="Engineers"
        subtitle="Ranked by AI spend. Efficiency = productive lines per $ spent."
      />
      <Card>
        <CardHeader>
          <CardTitle>{engineers.length} engineers</CardTitle>
        </CardHeader>
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-fg-muted border-b border-border">
                <th className="text-left font-medium py-2 pr-4">Engineer</th>
                <th className="text-right font-medium py-2 pr-4">Commits</th>
                <th className="text-right font-medium py-2 pr-4">Lines</th>
                <th className="text-right font-medium py-2 pr-4">Tokens</th>
                <th className="text-right font-medium py-2 pr-4">AI spend</th>
                <th className="text-right font-medium py-2 pr-4">Efficiency</th>
                <th className="text-right font-medium py-2">Quality</th>
              </tr>
            </thead>
            <tbody>
              {engineers.map((e) => (
                <tr
                  key={e.id}
                  className="border-b border-border/50 hover:bg-bg-hover/50 transition-colors"
                >
                  <td className="py-3 pr-4">
                    <Link href={`/engineers/${e.id}`} className="flex items-center gap-3 group">
                      <div className="w-8 h-8 rounded-full bg-accent-soft grid place-items-center text-accent text-xs font-semibold">
                        {(e.name || e.email)[0]?.toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium group-hover:text-accent transition-colors">
                          {e.name || e.email}
                        </div>
                        <div className="text-xs text-fg-muted">{e.email}</div>
                      </div>
                    </Link>
                  </td>
                  <td className="py-3 pr-4 text-right tabular-nums">{e.commits}</td>
                  <td className="py-3 pr-4 text-right tabular-nums text-fg-muted">
                    {e.lines.toLocaleString()}
                  </td>
                  <td className="py-3 pr-4 text-right tabular-nums">
                    {formatTokens(e.tokens)}
                  </td>
                  <td className="py-3 pr-4 text-right tabular-nums font-medium">
                    {formatUsd(e.cost_usd)}
                  </td>
                  <td className="py-3 pr-4 text-right tabular-nums text-fg-muted">
                    {e.efficiency > 0 ? `${e.efficiency.toFixed(0)} L/$` : "—"}
                  </td>
                  <td className="py-3 text-right">
                    <QualityBadge score={e.avg_quality} />
                  </td>
                </tr>
              ))}
              {engineers.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-fg-muted text-sm">
                    No engineers have committed yet.
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
