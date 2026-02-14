"use client";

import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { toNum, formatNumber, formatPercent, shortenPubkey } from "@/lib/utils";
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

  // Get latest benchmark data
  const latestSt = shinobiTop.length
    ? shinobiTop.reduce((a, b) => (a.epoch > b.epoch ? a : b))
    : null;
  const latestNa = networkAvg.length
    ? networkAvg.reduce((a, b) => (a.epoch > b.epoch ? a : b))
    : null;

  // Extract top performer name from rawData
  const topPerformerRaw = latestSt?.rawData as Record<string, unknown> | null;
  const topPerformerName = (topPerformerRaw?.name as string) || null;
  const topPerformerPubkey = latestSt?.pubkey;

  const topLabel = topPerformerName
    ? topPerformerName.length > 25
      ? topPerformerName.slice(0, 25) + "…"
      : topPerformerName
    : topPerformerPubkey
    ? shortenPubkey(topPerformerPubkey, 6)
    : "Top Performer";

  if (!latest) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        No comparison data available.
      </div>
    );
  }

  // Get benchmark values (use latest known)
  const topApy = latestSt ? toNum(latestSt.compoundOverallApy) : null;
  const avgApy = latestNa ? toNum(latestNa.compoundOverallApy) : null;

  // Radar data (normalized to 0–100 scale)
  const maxCredits = 445000;
  const maxApy = Math.max(toNum(latest.compoundOverallApy), topApy ?? 0, 10) * 1.2;

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

  // Bar chart data — direct comparison per epoch with benchmark reference lines
  const barChartData = sorted.map((d) => ({
    epoch: d.epoch,
    chainflow: toNum(d.compoundOverallApy),
    top_ref: topApy,
    avg_ref: avgApy,
  }));

  return (
    <div>
      <h2 className="mb-2 text-lg font-bold text-foreground">
        Chainflow vs {topLabel} vs Network
      </h2>
      {topPerformerName && (
        <p className="mb-5 text-xs text-muted-foreground">
          Top performer: <span className="font-semibold text-emerald-400">{topPerformerName}</span>
          {topPerformerPubkey && (
            <span className="ml-1.5 font-mono text-[10px] text-muted-foreground/60">
              ({shortenPubkey(topPerformerPubkey, 4)})
            </span>
          )}
          <span className="ml-1.5">
            — {formatPercent(latestSt?.compoundOverallApy, 2)} APY
          </span>
        </p>
      )}

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
              <Radar name={topLabel} dataKey="top" stroke={COLORS.shinobiTop} fill={COLORS.shinobiTop} fillOpacity={0.1} strokeWidth={1.5} strokeDasharray="4 4" />
              <Radar name="Network Avg" dataKey="avg" stroke={COLORS.networkAvg} fill={COLORS.networkAvg} fillOpacity={0.05} strokeWidth={1} />
              <Legend wrapperStyle={{ fontSize: "11px" }} />
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
                <th className="px-3 py-2.5 text-right font-semibold text-emerald-400">{topLabel}</th>
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

      {/* APY Comparison - ComposedChart with bars + reference lines */}
      <div className="glass-card">
        <h3 className="mb-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          APY Comparison Over Time
        </h3>
        <p className="mb-3 text-[10px] text-muted-foreground">
          Bars = Chainflow per epoch · Lines = latest benchmark reference
        </p>
        <ResponsiveContainer width="100%" height={320}>
          <ComposedChart data={barChartData}>
            <defs>
              <linearGradient id="gBar" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={COLORS.primary} stopOpacity={0.9} />
                <stop offset="100%" stopColor={COLORS.primary} stopOpacity={0.4} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 4% 14%)" />
            <XAxis dataKey="epoch" stroke="hsl(240 4% 24%)" fontSize={11} fontFamily="var(--font-mono)" />
            <YAxis stroke="hsl(240 4% 24%)" fontSize={11} fontFamily="var(--font-mono)" unit="%" />
            <Tooltip
              contentStyle={{
                background: "hsl(240 10% 6% / 0.95)",
                border: "1px solid hsl(263 70% 50% / 0.3)",
                borderRadius: "8px",
                fontSize: "12px",
              }}
              formatter={(value: number, name: string) => {
                const label =
                  name === "chainflow" ? "Chainflow" :
                  name === "top_ref" ? topLabel :
                  name === "avg_ref" ? "Network Avg" : name;
                return [`${value.toFixed(2)}%`, label];
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: "11px" }}
              formatter={(value: string) =>
                value === "chainflow" ? "Chainflow" :
                value === "top_ref" ? topLabel :
                value === "avg_ref" ? "Network Avg" : value
              }
            />
            <Bar dataKey="chainflow" fill="url(#gBar)" radius={[4, 4, 0, 0]} barSize={40} />
            {topApy != null && (
              <Line
                type="monotone"
                dataKey="top_ref"
                stroke={COLORS.shinobiTop}
                strokeWidth={2.5}
                strokeDasharray="8 4"
                dot={{ r: 4, fill: COLORS.shinobiTop, strokeWidth: 0 }}
                activeDot={{ r: 6 }}
              />
            )}
            {avgApy != null && (
              <Line
                type="monotone"
                dataKey="avg_ref"
                stroke={COLORS.networkAvg}
                strokeWidth={2}
                strokeDasharray="4 4"
                dot={{ r: 3, fill: COLORS.networkAvg, strokeWidth: 0 }}
                activeDot={{ r: 5 }}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
