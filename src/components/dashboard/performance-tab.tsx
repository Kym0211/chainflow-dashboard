"use client";

import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Clock, Activity, Cpu, Zap } from "lucide-react";
import { MetricCard } from "./metric-card";
import { toNum, formatNumber, formatPercent } from "@/lib/utils";
import { COLORS } from "@/lib/constants";
import type { ValidatorEpoch, BenchmarkEpoch } from "@/lib/db/schema";

interface PerformanceTabProps {
  data: ValidatorEpoch[];
  benchmarks: Record<string, BenchmarkEpoch[]>;
}

export function PerformanceTab({ data, benchmarks }: PerformanceTabProps) {
  const sorted = [...data].sort((a, b) => a.epoch - b.epoch);
  const latest = sorted[sorted.length - 1];

  const shinobiTop = benchmarks?.shinobi_top || [];
  const networkAvg = benchmarks?.network_avg || [];

  const chartData = sorted.map((d) => {
    const st = shinobiTop.find((b) => b.epoch === d.epoch);
    const na = networkAvg.find((b) => b.epoch === d.epoch);

    return {
      epoch: d.epoch,
      jip25_rank: d.jip25Rank ?? undefined,
      slot_duration: toNum(d.avgSlotDurationMs),
      overall_apy: toNum(d.compoundOverallApy),
      credits: toNum(d.epochCredits),
      votes_cast: d.votesCast ?? 0,
      skip_rate: toNum(d.skipRate),
      shinobi_apy: st ? toNum(st.compoundOverallApy) : undefined,
      network_apy: na ? toNum(na.compoundOverallApy) : undefined,
    };
  });

  if (!latest) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        No performance data available.
      </div>
    );
  }

  return (
    <div>
      {/* Metric cards */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard
          title="Avg Slot Duration"
          value={`${formatNumber(latest.avgSlotDurationMs, 1)}ms`}
          subtitle="Block production speed"
          icon={Clock}
          accent={COLORS.info}
        />
        <MetricCard
          title="Votes Cast"
          value={formatNumber(latest.votesCast, 0)}
          subtitle="Consensus participation"
          icon={Activity}
          accent={COLORS.primary}
        />
        <MetricCard
          title="Leader Slots"
          value={String(latest.leaderSlots ?? 0)}
          subtitle={`${formatPercent(latest.skipRate)} skipped`}
          icon={Cpu}
          accent={COLORS.warning}
        />
        <MetricCard
          title="Client"
          value={latest.clientType ?? "Unknown"}
          subtitle={latest.version ?? ""}
          icon={Zap}
          accent={COLORS.success}
        />
      </div>

      {/* Top row: JIP-25 + Slot Duration */}
      <div className="mb-5 grid gap-4 md:grid-cols-2">
        <div className="glass-card">
          <h3 className="mb-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            JIP-25 Rank History
          </h3>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 4% 14%)" />
              <XAxis dataKey="epoch" stroke="hsl(240 4% 24%)" fontSize={10} fontFamily="var(--font-mono)" />
              <YAxis stroke="hsl(240 4% 24%)" fontSize={10} fontFamily="var(--font-mono)" reversed domain={[0, "auto"]} />
              <Tooltip contentStyle={{ background: "hsl(240 10% 6% / 0.95)", border: "1px solid hsl(263 70% 50% / 0.3)", borderRadius: "8px", fontSize: "12px" }} />
              <Line type="monotone" dataKey="jip25_rank" name="JIP-25 Rank" stroke={COLORS.warning} strokeWidth={2.5} dot={{ r: 3, fill: COLORS.warning }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-card">
          <h3 className="mb-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Slot Duration Over Time
          </h3>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="gSlot" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS.info} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={COLORS.info} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 4% 14%)" />
              <XAxis dataKey="epoch" stroke="hsl(240 4% 24%)" fontSize={10} fontFamily="var(--font-mono)" />
              <YAxis stroke="hsl(240 4% 24%)" fontSize={10} fontFamily="var(--font-mono)" unit="ms" />
              <Tooltip contentStyle={{ background: "hsl(240 10% 6% / 0.95)", border: "1px solid hsl(263 70% 50% / 0.3)", borderRadius: "8px", fontSize: "12px" }} />
              <Area type="monotone" dataKey="slot_duration" name="Avg Slot Duration" stroke={COLORS.info} fill="url(#gSlot)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* APY Comparison */}
      <div className="glass-card">
        <h3 className="mb-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Overall APY Trend
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 4% 14%)" />
            <XAxis dataKey="epoch" stroke="hsl(240 4% 24%)" fontSize={11} fontFamily="var(--font-mono)" />
            <YAxis stroke="hsl(240 4% 24%)" fontSize={11} fontFamily="var(--font-mono)" unit="%" domain={["auto", "auto"]} />
            <Tooltip contentStyle={{ background: "hsl(240 10% 6% / 0.95)", border: "1px solid hsl(263 70% 50% / 0.3)", borderRadius: "8px", fontSize: "12px" }} />
            <Legend wrapperStyle={{ fontSize: "12px" }} />
            <Line type="monotone" dataKey="overall_apy" name="Chainflow APY" stroke={COLORS.primary} strokeWidth={2.5} dot={{ r: 3, fill: COLORS.primary }} />
            <Line type="monotone" dataKey="shinobi_apy" name="Top Performer APY" stroke={COLORS.shinobiTop} strokeWidth={1.5} dot={false} strokeDasharray="4 4" />
            <Line type="monotone" dataKey="network_apy" name="Network Avg APY" stroke={COLORS.networkAvg} strokeWidth={1} dot={false} strokeDasharray="2 2" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
