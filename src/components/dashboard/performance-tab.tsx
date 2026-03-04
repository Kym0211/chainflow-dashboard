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
import { Clock, Activity, Server, Cpu, BarChart3, Zap } from "lucide-react";
import { toNum, rawField, formatNumber, formatPercent } from "@/lib/utils";
import { COLORS, CHART_AXIS, CHART_GRID, CHART_TOOLTIP } from "@/lib/constants";
import type { ValidatorEpoch, BenchmarkEpoch } from "@/lib/db/schema";

interface PerformanceTabProps {
  data: ValidatorEpoch[];
  benchmarks: Record<string, BenchmarkEpoch[]>;
}

/** Dual-epoch metric card for performance */
function PerfCard({
  title,
  currentVal,
  prevVal,
  currentEpoch,
  prevEpoch,
  icon: Icon,
  accent,
  suffix,
  note,
}: {
  title: string;
  currentVal: string;
  prevVal: string;
  currentEpoch: number;
  prevEpoch: number;
  icon: React.ElementType;
  accent: string;
  suffix?: string;
  note?: string;
}) {
  return (
    <div className="glass-card relative overflow-hidden" style={{ padding: "1.5rem" }}>
      <div className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: `${accent}22` }}>
        <Icon size={18} style={{ color: accent }} />
      </div>
      <p className="mb-2 text-xs font-bold uppercase tracking-wider text-zinc-300">
        {title}
      </p>
      <div className="flex items-baseline gap-1.5">
        <span className="font-mono text-2xl font-extrabold text-white">{currentVal}</span>
        {suffix && <span className="text-sm text-zinc-400">{suffix}</span>}
      </div>
      <div className="mt-2 flex items-center gap-3 text-sm">
        <span className="text-zinc-300">E{currentEpoch}</span>
        <span className="text-zinc-600">|</span>
        <span className="text-zinc-500">E{prevEpoch}: <span className="font-mono text-zinc-400">{prevVal}</span>{suffix ? ` ${suffix}` : ""}</span>
      </div>
      {note && <p className="mt-1 text-xs text-zinc-500">{note}</p>}
    </div>
  );
}

export function PerformanceTab({ data, benchmarks }: PerformanceTabProps) {
  const sorted = [...data].sort((a, b) => a.epoch - b.epoch);
  const latest = sorted[sorted.length - 1];
  const prev = sorted.length > 1 ? sorted[sorted.length - 2] : latest;

  if (!latest) {
    return (
      <div className="flex h-64 items-center justify-center text-zinc-400">
        No performance data available.
      </div>
    );
  }

  const shinobiTop = benchmarks?.shinobi_top || [];

  // Current + prev values
  const curAvgTxn = rawField(latest, "avg_tx_per_block");
  const prevAvgTxn = rawField(prev, "avg_tx_per_block");
  const curAvgVote = rawField(latest, "avg_vote_tx_per_block");
  const prevAvgVote = rawField(prev, "avg_vote_tx_per_block");
  const curAvgUser = rawField(latest, "avg_user_tx_per_block");
  const prevAvgUser = rawField(prev, "avg_user_tx_per_block");
  const curMeanLatency = rawField(latest, "mean_vote_latency");
  const prevMeanLatency = rawField(prev, "mean_vote_latency");
  const curConsensus = rawField(latest, "avg_vote_pct_first_third") + rawField(latest, "avg_vote_pct_mid_third") + rawField(latest, "avg_vote_pct_last_third");
  const prevConsensus = rawField(prev, "avg_vote_pct_first_third") + rawField(prev, "avg_vote_pct_mid_third") + rawField(prev, "avg_vote_pct_last_third");

  // Chart data
  const chartData = sorted.map((d) => {
    const st = shinobiTop.find((b) => b.epoch === d.epoch);
    const stRaw = st?.rawData as Record<string, unknown> | null;

    return {
      epoch: d.epoch,
      // Firedancer-recommended: AVG TXN, AVG vote, AVG user
      avg_txn: rawField(d, "avg_tx_per_block"),
      avg_vote: rawField(d, "avg_vote_tx_per_block"),
      avg_user: rawField(d, "avg_user_tx_per_block"),
      // Consensus voting
      first_third: rawField(d, "avg_vote_pct_first_third"),
      mid_third: rawField(d, "avg_vote_pct_mid_third"),
      last_third: rawField(d, "avg_vote_pct_last_third"),
      // Vote latency
      mean_latency: rawField(d, "mean_vote_latency"),
      median_latency: rawField(d, "median_vote_latency"),
      top_latency: stRaw ? Number(stRaw.mean_vote_latency ?? 0) || undefined : undefined,
      // Compute units
      avg_cu: rawField(d, "avg_cu_per_block") / 1_000_000,
      avg_nonvote_cu: rawField(d, "avg_nonvote_cu_per_block") / 1_000_000,
    };
  });

  return (
    <div>
      {/* Metric cards — dual epoch */}
      <div className="mb-7 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <PerfCard
          title="Avg TXN/Block"
          currentVal={curAvgTxn > 0 ? formatNumber(curAvgTxn, 1) : "—"}
          prevVal={prevAvgTxn > 0 ? formatNumber(prevAvgTxn, 1) : "—"}
          currentEpoch={latest.epoch}
          prevEpoch={prev.epoch}
          icon={BarChart3}
          accent={COLORS.primary}
          note="Total transactions per block"
        />
        <PerfCard
          title="Avg Vote TX"
          currentVal={curAvgVote > 0 ? formatNumber(curAvgVote, 1) : "—"}
          prevVal={prevAvgVote > 0 ? formatNumber(prevAvgVote, 1) : "—"}
          currentEpoch={latest.epoch}
          prevEpoch={prev.epoch}
          icon={Zap}
          accent={COLORS.secondary}
          note="Vote transactions per block"
        />
        <PerfCard
          title="Avg User TX"
          currentVal={curAvgUser > 0 ? formatNumber(curAvgUser, 1) : "—"}
          prevVal={prevAvgUser > 0 ? formatNumber(prevAvgUser, 1) : "—"}
          currentEpoch={latest.epoch}
          prevEpoch={prev.epoch}
          icon={Activity}
          accent={COLORS.success}
          note="User transactions per block"
        />
        <PerfCard
          title="Vote Latency"
          currentVal={curMeanLatency > 0 ? formatNumber(curMeanLatency, 2) : "—"}
          prevVal={prevMeanLatency > 0 ? formatNumber(prevMeanLatency, 2) : "—"}
          currentEpoch={latest.epoch}
          prevEpoch={prev.epoch}
          icon={Clock}
          accent={curMeanLatency > 0 && curMeanLatency < 2 ? COLORS.success : COLORS.warning}
          suffix="slots"
        />
        <PerfCard
          title="Consensus %"
          currentVal={curConsensus > 0 ? formatPercent(curConsensus) : "—"}
          prevVal={prevConsensus > 0 ? formatPercent(prevConsensus) : "—"}
          currentEpoch={latest.epoch}
          prevEpoch={prev.epoch}
          icon={Activity}
          accent={curConsensus > 90 ? COLORS.success : COLORS.warning}
        />
        <PerfCard
          title="Client"
          currentVal={latest.clientType || "Unknown"}
          prevVal={prev.clientType || "—"}
          currentEpoch={latest.epoch}
          prevEpoch={prev.epoch}
          icon={Server}
          accent={COLORS.info}
          note={latest.version || ""}
        />
      </div>

      {/* Row 1: AVG TXN breakdown + Vote Latency */}
      <div className="mb-5 grid gap-4 md:grid-cols-2">
        <div className="glass-card">
          <h3 className="mb-1 text-base font-bold uppercase tracking-wider text-zinc-300">
            Avg Transactions Per Block
          </h3>
          <p className="mb-3 text-sm text-zinc-500">
            Total, vote, and user transactions per block
          </p>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={chartData}>
              <CartesianGrid {...CHART_GRID} />
              <XAxis dataKey="epoch" {...CHART_AXIS} fontSize={10} />
              <YAxis {...CHART_AXIS} fontSize={10} />
              <Tooltip {...CHART_TOOLTIP} />
              <Legend wrapperStyle={{ fontSize: "13px" }} />
              <Line type="monotone" dataKey="avg_txn" name="Total TXN" stroke={COLORS.primary} strokeWidth={2.5} dot={{ r: 3, fill: COLORS.primary }} />
              <Line type="monotone" dataKey="avg_vote" name="Vote TXN" stroke={COLORS.secondary} strokeWidth={2} dot={{ r: 2, fill: COLORS.secondary }} />
              <Line type="monotone" dataKey="avg_user" name="User TXN" stroke={COLORS.success} strokeWidth={2} dot={{ r: 2, fill: COLORS.success }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-card">
          <h3 className="mb-1 text-base font-bold uppercase tracking-wider text-zinc-300">
            Vote Latency Over Time
          </h3>
          <p className="mb-3 text-sm text-zinc-500">
            Lower is better · measured in slots
          </p>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={chartData}>
              <CartesianGrid {...CHART_GRID} />
              <XAxis dataKey="epoch" {...CHART_AXIS} fontSize={10} />
              <YAxis {...CHART_AXIS} fontSize={10} unit=" sl" />
              <Tooltip {...CHART_TOOLTIP} />
              <Legend wrapperStyle={{ fontSize: "13px" }} />
              <Line type="monotone" dataKey="mean_latency" name="Mean Latency" stroke={COLORS.warning} strokeWidth={2.5} dot={{ r: 3, fill: COLORS.warning }} />
              <Line type="monotone" dataKey="median_latency" name="Median Latency" stroke={COLORS.info} strokeWidth={2} dot={{ r: 2, fill: COLORS.info }} />
              <Line type="monotone" dataKey="top_latency" name="Top Performer" stroke={COLORS.shinobiTop} strokeWidth={1.5} dot={false} strokeDasharray="4 4" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Row 2: Consensus Voting + Compute Units */}
      <div className="mb-5 grid gap-4 md:grid-cols-2">
        <div className="glass-card">
          <h3 className="mb-1 text-base font-bold uppercase tracking-wider text-zinc-300">
            Consensus Voting Over Time
          </h3>
          <p className="mb-3 text-sm text-zinc-500">
            % of votes in each third of the epoch
          </p>
          <ResponsiveContainer width="100%" height={240}>
            <ComposedChart data={chartData}>
              <CartesianGrid {...CHART_GRID} />
              <XAxis dataKey="epoch" {...CHART_AXIS} fontSize={10} />
              <YAxis {...CHART_AXIS} fontSize={10} unit="%" />
              <Tooltip {...CHART_TOOLTIP} />
              <Legend wrapperStyle={{ fontSize: "13px" }} />
              <Bar dataKey="first_third" name="1st Third" stackId="cv" fill={COLORS.success} />
              <Bar dataKey="mid_third" name="Mid Third" stackId="cv" fill={COLORS.secondary} />
              <Bar dataKey="last_third" name="Last Third" stackId="cv" fill={COLORS.primary} radius={[4, 4, 0, 0]} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-card">
          <h3 className="mb-1 text-base font-bold uppercase tracking-wider text-zinc-300">
            Avg Compute Units Over Time
          </h3>
          <p className="mb-3 text-sm text-zinc-500">
            Total CU and non-vote CU per block (millions)
          </p>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={chartData}>
              <CartesianGrid {...CHART_GRID} />
              <XAxis dataKey="epoch" {...CHART_AXIS} fontSize={10} />
              <YAxis {...CHART_AXIS} fontSize={10} unit="M" />
              <Tooltip {...CHART_TOOLTIP} />
              <Legend wrapperStyle={{ fontSize: "13px" }} />
              <Line type="monotone" dataKey="avg_cu" name="Total CU/Block" stroke={COLORS.primary} strokeWidth={2.5} dot={{ r: 3, fill: COLORS.primary }} />
              <Line type="monotone" dataKey="avg_nonvote_cu" name="Non-vote CU" stroke={COLORS.secondary} strokeWidth={2} dot={{ r: 2, fill: COLORS.secondary }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Detailed metrics table */}
      <div className="glass-card overflow-auto">
        <h3 className="mb-4 text-base font-bold uppercase tracking-wider text-zinc-300">
          Epoch-by-Epoch Performance
        </h3>
        <table className="w-full border-collapse font-mono text-sm">
          <thead>
            <tr className="border-b border-white/[0.08]">
              {["Epoch", "Avg TXN", "Avg Vote", "Avg User", "Latency", "Consensus %", "CU/Block", "Skip Rate", "TVC Credits", "TVC Rank"].map(
                (h) => (
                  <th key={h} className="px-2 py-2 text-right font-semibold text-zinc-400 first:text-left">
                    {h}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            {sorted.slice().reverse().slice(0, 20).map((d) => {
              const ml = rawField(d, "mean_vote_latency");
              const ct = rawField(d, "avg_vote_pct_first_third") + rawField(d, "avg_vote_pct_mid_third") + rawField(d, "avg_vote_pct_last_third");
              const cu = rawField(d, "avg_cu_per_block");
              const rank = rawField(d, "vote_credits_rank");
              const avgTxn = rawField(d, "avg_tx_per_block");
              const avgVote = rawField(d, "avg_vote_tx_per_block");
              const avgUser = rawField(d, "avg_user_tx_per_block");

              return (
                <tr key={d.epoch} className="border-b border-white/[0.03]">
                  <td className="px-2 py-2 text-left text-zinc-400">{d.epoch}</td>
                  <td className="px-2 py-2 text-right text-purple-400">{avgTxn > 0 ? formatNumber(avgTxn, 1) : "—"}</td>
                  <td className="px-2 py-2 text-right text-blue-400">{avgVote > 0 ? formatNumber(avgVote, 1) : "—"}</td>
                  <td className="px-2 py-2 text-right text-emerald-400">{avgUser > 0 ? formatNumber(avgUser, 1) : "—"}</td>
                  <td className="px-2 py-2 text-right text-amber-400">{ml > 0 ? `${formatNumber(ml, 2)} sl` : "—"}</td>
                  <td className="px-2 py-2 text-right text-emerald-400">{ct > 0 ? formatPercent(ct) : "—"}</td>
                  <td className="px-2 py-2 text-right text-blue-400">{cu > 0 ? `${formatNumber(cu / 1_000_000, 2)}M` : "—"}</td>
                  <td className="px-2 py-2 text-right text-orange-400">{formatPercent(d.skipRate)}</td>
                  <td className="px-2 py-2 text-right text-purple-400">{formatNumber(toNum(d.epochCredits), 0)}</td>
                  <td className="px-2 py-2 text-right text-cyan-400">{rank > 0 ? `#${rank}` : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}