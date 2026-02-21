"use client";

import {
  LineChart,
  Line,
  ComposedChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Clock, Activity, Server, Cpu } from "lucide-react";
import { MetricCard } from "./metric-card";
import { toNum, rawField, formatNumber, formatPercent } from "@/lib/utils";
import { COLORS, CHART_AXIS, CHART_GRID, CHART_TOOLTIP } from "@/lib/constants";
import type { ValidatorEpoch, BenchmarkEpoch } from "@/lib/db/schema";

interface PerformanceTabProps {
  data: ValidatorEpoch[];
  benchmarks: Record<string, BenchmarkEpoch[]>;
}

export function PerformanceTab({ data, benchmarks }: PerformanceTabProps) {
  const sorted = [...data].sort((a, b) => a.epoch - b.epoch);
  const latest = sorted[sorted.length - 1];

  if (!latest) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        No performance data available.
      </div>
    );
  }

  const shinobiTop = benchmarks?.shinobi_top || [];
  const networkAvg = benchmarks?.network_avg || [];

  // Extract key metrics from rawData
  const meanLatency = rawField(latest, "mean_vote_latency");
  const medianLatency = rawField(latest, "median_vote_latency");
  const avgCuPerBlock = rawField(latest, "avg_cu_per_block");
  const avgNonvoteCu = rawField(latest, "avg_nonvote_cu_per_block");
  const consensusFirst = rawField(latest, "avg_vote_pct_first_third");
  const consensusMid = rawField(latest, "avg_vote_pct_mid_third");
  const consensusLast = rawField(latest, "avg_vote_pct_last_third");
  const consensusTotal = consensusFirst + consensusMid + consensusLast;
  const blocksProduced = rawField(latest, "blocks_produced");

  // Chart data
  const chartData = sorted.map((d) => {
    const st = shinobiTop.find((b) => b.epoch === d.epoch);
    const stRaw = st?.rawData as Record<string, unknown> | null;

    return {
      epoch: d.epoch,
      // Consensus voting
      first_third: rawField(d, "avg_vote_pct_first_third"),
      mid_third: rawField(d, "avg_vote_pct_mid_third"),
      last_third: rawField(d, "avg_vote_pct_last_third"),
      // Vote latency
      mean_latency: rawField(d, "mean_vote_latency"),
      median_latency: rawField(d, "median_vote_latency"),
      top_latency: stRaw ? Number(stRaw.mean_vote_latency ?? 0) || undefined : undefined,
      // Compute units
      avg_cu: rawField(d, "avg_cu_per_block") / 1_000_000, // Convert to M CU
      avg_nonvote_cu: rawField(d, "avg_nonvote_cu_per_block") / 1_000_000,
      // APY for reference
      overall_apy: toNum(d.compoundOverallApy),
    };
  });

  return (
    <div>
      {/* Top metrics */}
      <div className="mb-7 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard
          title="Avg Vote Latency"
          value={meanLatency > 0 ? `${formatNumber(meanLatency, 2)} slots` : "—"}
          subtitle={medianLatency > 0 ? `Median: ${formatNumber(medianLatency, 2)} slots` : "Vote timing"}
          icon={Clock}
          accent={meanLatency > 0 && meanLatency < 2 ? COLORS.success : COLORS.warning}
        />
        <MetricCard
          title="Consensus Voting"
          value={consensusTotal > 0 ? formatPercent(consensusTotal) : "—"}
          subtitle={consensusFirst > 0 ? `1st third: ${formatPercent(consensusFirst)}` : "Vote participation"}
          icon={Activity}
          accent={consensusTotal > 90 ? COLORS.success : COLORS.warning}
        />
        <MetricCard
          title="Avg CU/Block"
          value={avgCuPerBlock > 0 ? `${formatNumber(avgCuPerBlock / 1_000_000, 2)}M` : "—"}
          subtitle={avgNonvoteCu > 0 ? `Non-vote: ${formatNumber(avgNonvoteCu / 1_000_000, 2)}M` : "Compute units per block"}
          icon={Cpu}
          accent={COLORS.secondary}
        />
        <MetricCard
          title="Client"
          value={latest.clientType || "Unknown"}
          subtitle={latest.version || ""}
          icon={Server}
          accent={COLORS.info}
        />
      </div>

      {/* Row 1: Consensus Voting + Vote Latency */}
      <div className="mb-5 grid gap-4 md:grid-cols-2">
        <div className="glass-card">
          <h3 className="mb-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Consensus Voting Over Time
          </h3>
          <p className="mb-3 text-[10px] text-muted-foreground">
            % of votes in each third of the epoch
          </p>
          <ResponsiveContainer width="100%" height={240}>
            <ComposedChart data={chartData}>
              <CartesianGrid {...CHART_GRID} />
              <XAxis dataKey="epoch" {...CHART_AXIS} fontSize={10} />
              <YAxis {...CHART_AXIS} fontSize={10} unit="%" />
              <Tooltip {...CHART_TOOLTIP} />
              <Legend wrapperStyle={{ fontSize: "10px" }} />
              <Bar dataKey="first_third" name="1st Third" stackId="cv" fill={COLORS.success} />
              <Bar dataKey="mid_third" name="Mid Third" stackId="cv" fill={COLORS.secondary} />
              <Bar dataKey="last_third" name="Last Third" stackId="cv" fill={COLORS.primary} radius={[4, 4, 0, 0]} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-card">
          <h3 className="mb-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Vote Latency Over Time
          </h3>
          <p className="mb-3 text-[10px] text-muted-foreground">
            Lower is better · measured in slots
          </p>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={chartData}>
              <CartesianGrid {...CHART_GRID} />
              <XAxis dataKey="epoch" {...CHART_AXIS} fontSize={10} />
              <YAxis {...CHART_AXIS} fontSize={10} unit=" sl" />
              <Tooltip {...CHART_TOOLTIP} />
              <Legend wrapperStyle={{ fontSize: "10px" }} />
              <Line type="monotone" dataKey="mean_latency" name="Mean Latency" stroke={COLORS.warning} strokeWidth={2.5} dot={{ r: 3, fill: COLORS.warning }} />
              <Line type="monotone" dataKey="median_latency" name="Median Latency" stroke={COLORS.info} strokeWidth={2} dot={{ r: 2, fill: COLORS.info }} />
              <Line type="monotone" dataKey="top_latency" name="Top Performer" stroke={COLORS.shinobiTop} strokeWidth={1.5} dot={false} strokeDasharray="4 4" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Row 2: Avg CU + Vote Latency vs APY */}
      <div className="mb-5 grid gap-4 md:grid-cols-2">
        <div className="glass-card">
          <h3 className="mb-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Avg Compute Units Over Time
          </h3>
          <p className="mb-3 text-[10px] text-muted-foreground">
            Total CU and non-vote CU per block (millions)
          </p>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={chartData}>
              <CartesianGrid {...CHART_GRID} />
              <XAxis dataKey="epoch" {...CHART_AXIS} fontSize={10} />
              <YAxis {...CHART_AXIS} fontSize={10} unit="M" />
              <Tooltip {...CHART_TOOLTIP} />
              <Legend wrapperStyle={{ fontSize: "10px" }} />
              <Line type="monotone" dataKey="avg_cu" name="Total CU/Block" stroke={COLORS.primary} strokeWidth={2.5} dot={{ r: 3, fill: COLORS.primary }} />
              <Line type="monotone" dataKey="avg_nonvote_cu" name="Non-vote CU" stroke={COLORS.secondary} strokeWidth={2} dot={{ r: 2, fill: COLORS.secondary }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-card">
          <h3 className="mb-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Overall APY Trend
          </h3>
          <p className="mb-3 text-[10px] text-muted-foreground">
            Compound overall APY per epoch
          </p>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={chartData}>
              <CartesianGrid {...CHART_GRID} />
              <XAxis dataKey="epoch" {...CHART_AXIS} fontSize={10} />
              <YAxis {...CHART_AXIS} fontSize={10} unit="%" domain={["auto", "auto"]} />
              <Tooltip {...CHART_TOOLTIP} />
              <Line type="monotone" dataKey="overall_apy" name="Chainflow APY" stroke={COLORS.primary} strokeWidth={2.5} dot={{ r: 3, fill: COLORS.primary }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Detailed metrics table */}
      <div className="glass-card overflow-auto">
        <h3 className="mb-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Epoch-by-Epoch Performance
        </h3>
        <table className="w-full border-collapse font-mono text-xs">
          <thead>
            <tr className="border-b border-white/[0.08]">
              {["Epoch", "Vote Latency", "Consensus %", "CU/Block", "Skip Rate", "TVC Credits", "TVC Rank", "Blocks"].map(
                (h) => (
                  <th key={h} className="px-3 py-2 text-right font-semibold text-muted-foreground first:text-left">
                    {h}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            {sorted.slice().reverse().slice(0, 15).map((d) => {
              const ml = rawField(d, "mean_vote_latency");
              const ct = rawField(d, "avg_vote_pct_first_third") + rawField(d, "avg_vote_pct_mid_third") + rawField(d, "avg_vote_pct_last_third");
              const cu = rawField(d, "avg_cu_per_block");
              const rank = rawField(d, "vote_credits_rank");
              const blocks = rawField(d, "blocks_produced");

              return (
                <tr key={d.epoch} className="border-b border-white/[0.03]">
                  <td className="px-3 py-2 text-left text-muted-foreground">{d.epoch}</td>
                  <td className="px-3 py-2 text-right text-amber-400">{ml > 0 ? `${formatNumber(ml, 2)} sl` : "—"}</td>
                  <td className="px-3 py-2 text-right text-emerald-400">{ct > 0 ? formatPercent(ct) : "—"}</td>
                  <td className="px-3 py-2 text-right text-blue-400">{cu > 0 ? `${formatNumber(cu / 1_000_000, 2)}M` : "—"}</td>
                  <td className="px-3 py-2 text-right text-orange-400">{formatPercent(d.skipRate)}</td>
                  <td className="px-3 py-2 text-right text-purple-400">{formatNumber(toNum(d.epochCredits), 0)}</td>
                  <td className="px-3 py-2 text-right text-cyan-400">{rank > 0 ? `#${rank}` : "—"}</td>
                  <td className="px-3 py-2 text-right text-muted-foreground">{blocks > 0 ? blocks : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}