"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatUsd } from "@/lib/utils";

type Point = { date: string; cost: number; tokens: number; commits: number };

export function TrendChart({ data, metric = "cost" }: { data: Point[]; metric?: "cost" | "tokens" | "commits" }) {
  const formatter = (v: number) => {
    if (metric === "cost") return formatUsd(v);
    if (metric === "tokens") return v >= 1000 ? `${(v / 1000).toFixed(1)}k` : `${v}`;
    return `${v}`;
  };
  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7C5CFF" stopOpacity={0.45} />
            <stop offset="100%" stopColor="#7C5CFF" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="#22242F" strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fill: "#8B90A0", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(d) => d.slice(5)}
        />
        <YAxis
          tick={{ fill: "#8B90A0", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={formatter}
          width={48}
        />
        <Tooltip
          contentStyle={{
            background: "#141620",
            border: "1px solid #2D303D",
            borderRadius: 8,
            fontSize: 12,
          }}
          labelStyle={{ color: "#8B90A0" }}
          formatter={(v: any) => [formatter(v), metric]}
        />
        <Area
          type="monotone"
          dataKey={metric}
          stroke="#7C5CFF"
          strokeWidth={2}
          fill="url(#g1)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
