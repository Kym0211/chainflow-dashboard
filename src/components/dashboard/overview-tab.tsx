"use client";

import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { TrendingUp, Zap, Activity, Award, Database, DollarSign } from "lucide-react";
import { MetricCard } from "./metric-card";
import { toNum, formatPercent, formatCompact, formatSol, calcDelta } from "@/lib/utils";
import { COLORS } from "@/lib/constants";
import type { ValidatorEpoch, BenchmarkEpoch } from "@/lib/db/schema";

interface OverviewTabProps {
  data: ValidatorEpoch[];
  benchmarks: Record<string, BenchmarkEpoch[]>;
}

export function OverviewTab({ data, benchmarks }: OverviewTabProps) {
  if (!data.length) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        No data available. Run the cron job to fetch data from Trillium.
      </div>
    );
  }

  // Sort by epoch ascending for charts
  const sorted = [...data].sort((a, b) => a.epoch - b.epoch);
  const latest = sorted[sorted.length - 1];
  const prev = sorted.length > 1 ? sorted[sorted.length - 2] : latest;

  const shinobiTop = benchmarks?.shinobi_top || [];
  const networkAvg = benchmarks?.network_avg || [];

  // Build chart data by merging validator + benchmark data
  const chartData = sorted.map((d) => {
    const epoch = d.epoch;
    const st = shinobiTop.find((b) => b.epoch === epoch);
    const na = networkAvg.find((b) => b.epoch === epoch);

    return {
      epoch,
      inflation_apy: toNum(d.totalInflationApy),
      mev_apy: toNum(d.totalMevApy),
      block_apy: toNum(d.delegatorBlockRewardsApy),
      overall_apy: toNum(d.compoundOverallApy),
      skip_rate: toNum(d.skipRate),
      credits: toNum(d.epochCredits),
      shinobi_skip: st ? toNum(st.skipRate) : undefined,
      shinobi_credits: st ? toNum(st.epochCredits) : undefined,
      network_skip: na ? toNum(na.skipRate) : undefined,
      network_credits: na ? toNum(na.epochCredits) : undefined,
    };
  });

  const credDelta = calcDelta(toNum(latest.epochCredits), toNum(prev.epochCredits));
  const skipDelta = toNum(latest.skipRate) - toNum(prev.skipRate);
  const apyDelta = toNum(latest.compoundOverallApy) - toNum(prev.compoundOverallApy);

  // Rough net income calc
  const netIncome = toNum(latest.rewards) + toNum(latest.mevToValidator) - toNum(latest.voteCost);

  return (
    <div>
      {/* Metric Cards */}
      <div className="mb-7 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <MetricCard
          title="Overall APY"
          value={formatPercent(latest.compoundOverallApy)}
          subtitle={`Epoch ${latest.epoch}`}
          trend={`${apyDelta >= 0 ? "+" : ""}${apyDelta.toFixed(2)}%`}
          trendUp={apyDelta >= 0}
          icon={TrendingUp}
          accent={COLORS.primary}
        />
        <MetricCard
          title="TVC Credits"
          value={formatCompact(latest.epochCredits)}
          subtitle="Timely Vote Credits"
          trend={`${credDelta.isPositive ? "+" : ""}${credDelta.value}%`}
          trendUp={credDelta.isPositive}
          icon={Zap}
          accent={COLORS.secondary}
        />
        <MetricCard
          title="Skip Rate"
          value={formatPercent(latest.skipRate)}
          subtitle={`${latest.leaderSlots ?? 0} leader slots`}
          trend={`${skipDelta >= 0 ? "+" : ""}${skipDelta.toFixed(2)}%`}
          trendUp={skipDelta <= 0}
          icon={Activity}
          accent={toNum(latest.skipRate) < 2 ? COLORS.success : COLORS.warning}
        />
        <MetricCard
          title="JIP-25 Rank"
          value={latest.jip25Rank ? `#${latest.jip25Rank}` : "—"}
          subtitle="Jito Stakenet"
          icon={Award}
          accent={COLORS.warning}
        />
        <MetricCard
          title="Active Stake"
          value={`${formatCompact(latest.activeStake)} SOL`}
          subtitle={`${toNum(latest.stakePercentage).toFixed(4)}% of network`}
          icon={Database}
          accent={COLORS.info}
        />
        <MetricCard
          title="Net Income"
          value={formatSol(netIncome)}
          subtitle="Revenue − Vote Costs"
          icon={DollarSign}
          accent={COLORS.success}
        />
      </div>

      {/* APY Breakdown Chart */}
      <div className="glass-card mb-5">
        <h3 className="mb-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          APY Breakdown Over Time
        </h3>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="gInf" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.3} />
                <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gMev" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={COLORS.secondary} stopOpacity={0.3} />
                <stop offset="95%" stopColor={COLORS.secondary} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gBr" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={COLORS.success} stopOpacity={0.3} />
                <stop offset="95%" stopColor={COLORS.success} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 4% 14%)" />
            <XAxis dataKey="epoch" stroke="hsl(240 4% 24%)" fontSize={11} fontFamily="var(--font-mono)" />
            <YAxis stroke="hsl(240 4% 24%)" fontSize={11} fontFamily="var(--font-mono)" unit="%" />
            <Tooltip contentStyle={{ background: "hsl(240 10% 6% / 0.95)", border: "1px solid hsl(263 70% 50% / 0.3)", borderRadius: "8px", fontSize: "12px" }} />
            <Legend wrapperStyle={{ fontSize: "12px" }} />
            <Area type="monotone" dataKey="inflation_apy" name="Inflation APY" stroke={COLORS.primary} fill="url(#gInf)" strokeWidth={2} />
            <Area type="monotone" dataKey="mev_apy" name="MEV APY" stroke={COLORS.secondary} fill="url(#gMev)" strokeWidth={2} />
            <Area type="monotone" dataKey="block_apy" name="Block Rewards APY" stroke={COLORS.success} fill="url(#gBr)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Bottom row: Skip Rate + TVC Credits trends */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="glass-card">
          <h3 className="mb-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Skip Rate Trend
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 4% 14%)" />
              <XAxis dataKey="epoch" stroke="hsl(240 4% 24%)" fontSize={10} fontFamily="var(--font-mono)" />
              <YAxis stroke="hsl(240 4% 24%)" fontSize={10} fontFamily="var(--font-mono)" unit="%" />
              <Tooltip contentStyle={{ background: "hsl(240 10% 6% / 0.95)", border: "1px solid hsl(263 70% 50% / 0.3)", borderRadius: "8px", fontSize: "12px" }} />
              <Line type="monotone" dataKey="skip_rate" name="Chainflow" stroke={COLORS.warning} strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="shinobi_skip" name="Top Performer" stroke={COLORS.shinobiTop} strokeWidth={1.5} dot={false} strokeDasharray="4 4" />
              <Line type="monotone" dataKey="network_skip" name="Network Avg" stroke={COLORS.networkAvg} strokeWidth={1} dot={false} strokeDasharray="2 2" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-card">
          <h3 className="mb-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            TVC Credits Trend
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 4% 14%)" />
              <XAxis dataKey="epoch" stroke="hsl(240 4% 24%)" fontSize={10} fontFamily="var(--font-mono)" />
              <YAxis stroke="hsl(240 4% 24%)" fontSize={10} fontFamily="var(--font-mono)" />
              <Tooltip contentStyle={{ background: "hsl(240 10% 6% / 0.95)", border: "1px solid hsl(263 70% 50% / 0.3)", borderRadius: "8px", fontSize: "12px" }} />
              <Line type="monotone" dataKey="credits" name="Chainflow" stroke={COLORS.primary} strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="shinobi_credits" name="Top Performer" stroke={COLORS.shinobiTop} strokeWidth={1.5} dot={false} strokeDasharray="4 4" />
              <Line type="monotone" dataKey="network_credits" name="Network Avg" stroke={COLORS.networkAvg} strokeWidth={1} dot={false} strokeDasharray="2 2" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
