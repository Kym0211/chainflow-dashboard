"use client";

import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { toNum, formatNumber, formatPercent } from "@/lib/utils";
import { COLORS } from "@/lib/constants";
import type { ValidatorEpoch, BenchmarkEpoch } from "@/lib/db/schema";

interface ComparisonTabProps {
  data: ValidatorEpoch[];
  benchmarks: Record<string, BenchmarkEpoch[]>;
}

export function ComparisonTab({ data, benchmarks }: ComparisonTabProps) {
  const sorted = [...data].sort((a, b) => a.epoch - b.epoch);
  const latest = sorted[sorted.length - 1];

  const shinobiTop = benchmarks?.shinobi_top || [];
  const networkAvg = benchmarks?.network_avg || [];

  const latestSt = shinobiTop.find((b) => b.epoch === latest?.epoch);
  const latestNa = networkAvg.find((b) => b.epoch === latest?.epoch);

  if (!latest) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        No comparison data available.
      </div>
    );
  }

  // Radar data (normalized to 0–100 scale)
  const maxCredits = 445000;
  const maxApy = 10;

  const radarData = [
    {
      metric: "TVC Credits",
      chainflow: Math.min(100, (toNum(latest.epochCredits) / maxCredits) * 100),
      top: latestSt ? Math.min(100, (toNum(latestSt.epochCredits) / maxCredits) * 100) : 0,
      avg: latestNa ? Math.min(100, (toNum(latestNa.epochCredits) / maxCredits) * 100) : 0,
    },
    {
      metric: "Low Skip Rate",
      chainflow: Math.max(0, 100 - toNum(latest.skipRate) * 10),
      top: latestSt ? Math.max(0, 100 - toNum(latestSt.skipRate) * 10) : 0,
      avg: latestNa ? Math.max(0, 100 - toNum(latestNa.skipRate) * 10) : 0,
    },
    {
      metric: "APY",
      chainflow: Math.min(100, (toNum(latest.compoundOverallApy) / maxApy) * 100),
      top: latestSt ? Math.min(100, (toNum(latestSt.compoundOverallApy) / maxApy) * 100) : 0,
      avg: latestNa ? Math.min(100, (toNum(latestNa.compoundOverallApy) / maxApy) * 100) : 0,
    },
    {
      metric: "MEV Earnings",
      chainflow: Math.min(100, (toNum(latest.mevEarned) / 0.6) * 100),
      top: latestSt ? Math.min(100, (toNum(latestSt.mevEarned) / 0.6) * 100) : 0,
      avg: 50,
    },
    {
      metric: "Slot Speed",
      chainflow: latest.avgSlotDurationMs
        ? Math.max(0, 100 - (toNum(latest.avgSlotDurationMs) - 400) / 1.2)
        : 70,
      top: latestSt?.avgSlotDurationMs
        ? Math.max(0, 100 - (toNum(latestSt.avgSlotDurationMs) - 400) / 1.2)
        : 80,
      avg: 60,
    },
  ];

  // Head-to-head metrics
  const comparisons = [
    { metric: "TVC Credits", cf: toNum(latest.epochCredits), st: latestSt ? toNum(latestSt.epochCredits) : null, fmt: (v: number) => formatNumber(v, 0), better: "higher" as const },
    { metric: "Skip Rate", cf: toNum(latest.skipRate), st: latestSt ? toNum(latestSt.skipRate) : null, fmt: (v: number) => formatPercent(v), better: "lower" as const },
    { metric: "Overall APY", cf: toNum(latest.compoundOverallApy), st: latestSt ? toNum(latestSt.compoundOverallApy) : null, fmt: (v: number) => formatPercent(v, 3), better: "higher" as const },
    { metric: "MEV Earned", cf: toNum(latest.mevEarned), st: latestSt ? toNum(latestSt.mevEarned) : null, fmt: (v: number) => `${formatNumber(v, 4)} SOL`, better: "higher" as const },
    { metric: "Active Stake", cf: toNum(latest.activeStake), st: latestSt ? toNum(latestSt.activeStake) : null, fmt: (v: number) => `${formatNumber(v / 1000, 1)}K SOL`, better: "higher" as const },
  ];

  // Historical chart data
  const historyData = sorted.map((d) => {
    const st = shinobiTop.find((b) => b.epoch === d.epoch);
    const na = networkAvg.find((b) => b.epoch === d.epoch);
    return {
      epoch: d.epoch,
      chainflow: toNum(d.compoundOverallApy),
      top: st ? toNum(st.compoundOverallApy) : undefined,
      avg: na ? toNum(na.compoundOverallApy) : undefined,
    };
  });

  return (
    <div>
      <h2 className="mb-5 text-lg font-bold text-foreground">
        Chainflow vs Top Performer vs Network
      </h2>

      <div className="mb-5 grid gap-4 md:grid-cols-2">
        {/* Radar Chart */}
        <div className="glass-card">
          <h3 className="mb-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Current Epoch Snapshot
          </h3>
          <p className="mb-3 text-[10px] text-muted-foreground">
            Normalized 0–100 scale
          </p>
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="hsl(240 4% 18%)" />
              <PolarAngleAxis
                dataKey="metric"
                tick={{ fill: "hsl(240 5% 55%)", fontSize: 11 }}
              />
              <PolarRadiusAxis tick={false} axisLine={false} domain={[0, 100]} />
              <Radar name="Chainflow" dataKey="chainflow" stroke={COLORS.primary} fill={COLORS.primary} fillOpacity={0.2} strokeWidth={2} />
              <Radar name="Top Performer" dataKey="top" stroke={COLORS.shinobiTop} fill={COLORS.shinobiTop} fillOpacity={0.1} strokeWidth={1.5} strokeDasharray="4 4" />
              <Radar name="Network Avg" dataKey="avg" stroke={COLORS.networkAvg} fill={COLORS.networkAvg} fillOpacity={0.05} strokeWidth={1} />
              <Legend wrapperStyle={{ fontSize: "12px" }} />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Head-to-Head Table */}
        <div className="glass-card">
          <h3 className="mb-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Head-to-Head (Epoch {latest.epoch})
          </h3>
          <table className="w-full border-collapse font-mono text-xs">
            <thead>
              <tr className="border-b border-white/[0.08]">
                <th className="px-3 py-2.5 text-left font-semibold text-muted-foreground">Metric</th>
                <th className="px-3 py-2.5 text-right font-semibold text-purple-400">Chainflow</th>
                <th className="px-3 py-2.5 text-right font-semibold text-emerald-400">Top Performer</th>
                <th className="px-3 py-2.5 text-right font-semibold text-muted-foreground">Δ Delta</th>
              </tr>
            </thead>
            <tbody>
              {comparisons.map((row) => {
                const delta = row.st != null ? row.cf - row.st : null;
                const isGood =
                  delta != null
                    ? row.better === "higher"
                      ? delta >= 0
                      : delta <= 0
                    : true;

                return (
                  <tr key={row.metric} className="border-b border-white/[0.03]">
                    <td className="px-3 py-2.5 text-muted-foreground">{row.metric}</td>
                    <td className="px-3 py-2.5 text-right text-purple-300 font-semibold">{row.fmt(row.cf)}</td>
                    <td className="px-3 py-2.5 text-right text-emerald-300">
                      {row.st != null ? row.fmt(row.st) : "—"}
                    </td>
                    <td
                      className={`px-3 py-2.5 text-right font-bold ${
                        delta == null ? "text-muted-foreground" : isGood ? "text-emerald-400" : "text-red-400"
                      }`}
                    >
                      {delta != null ? `${delta >= 0 ? "+" : ""}${formatNumber(delta, 2)}` : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Historical APY Comparison */}
      <div className="glass-card">
        <h3 className="mb-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          APY Comparison Over Time
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={historyData}>
            <defs>
              <linearGradient id="gCfComp" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.25} />
                <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 4% 14%)" />
            <XAxis dataKey="epoch" stroke="hsl(240 4% 24%)" fontSize={11} fontFamily="var(--font-mono)" />
            <YAxis stroke="hsl(240 4% 24%)" fontSize={11} fontFamily="var(--font-mono)" unit="%" domain={["auto", "auto"]} />
            <Tooltip contentStyle={{ background: "hsl(240 10% 6% / 0.95)", border: "1px solid hsl(263 70% 50% / 0.3)", borderRadius: "8px", fontSize: "12px" }} />
            <Legend wrapperStyle={{ fontSize: "12px" }} />
            <Area type="monotone" dataKey="chainflow" name="Chainflow" stroke={COLORS.primary} fill="url(#gCfComp)" strokeWidth={2.5} />
            <Line type="monotone" dataKey="top" name="Top Performer" stroke={COLORS.shinobiTop} strokeWidth={2} dot={false} strokeDasharray="5 5" />
            <Line type="monotone" dataKey="avg" name="Network Average" stroke={COLORS.networkAvg} strokeWidth={1.5} dot={false} strokeDasharray="3 3" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
