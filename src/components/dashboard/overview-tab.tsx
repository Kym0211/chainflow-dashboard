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
import { toNum, rawField, formatPercent, formatCompact, formatSol, calcDelta } from "@/lib/utils";
import { COLORS, CHART_AXIS, CHART_GRID, CHART_TOOLTIP } from "@/lib/constants";
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

  const sorted = [...data].sort((a, b) => a.epoch - b.epoch);
  const latest = sorted[sorted.length - 1];
  const prev = sorted.length > 1 ? sorted[sorted.length - 2] : latest;

  const shinobiTop = benchmarks?.shinobi_top || [];
  const networkAvg = benchmarks?.network_avg || [];

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
      tvc_rank: rawField(d, "vote_credits_rank") || undefined,
      shinobi_skip: st ? toNum(st.skipRate) : undefined,
      network_skip: na ? toNum(na.skipRate) : undefined,
    };
  });

  const credDelta = calcDelta(toNum(latest.epochCredits), toNum(prev.epochCredits));
  const skipDelta = toNum(latest.skipRate) - toNum(prev.skipRate);
  const apyDelta = toNum(latest.compoundOverallApy) - toNum(prev.compoundOverallApy);
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

      {/* APY Breakdown Chart — now with Total APY line */}
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
            <CartesianGrid {...CHART_GRID} />
            <XAxis dataKey="epoch" {...CHART_AXIS} />
            <YAxis {...CHART_AXIS} unit="%" />
            <Tooltip {...CHART_TOOLTIP} />
            <Legend wrapperStyle={{ fontSize: "12px" }} />
            <Area type="monotone" dataKey="inflation_apy" name="Inflation APY" stroke={COLORS.primary} fill="url(#gInf)" strokeWidth={2} />
            <Area type="monotone" dataKey="mev_apy" name="MEV APY" stroke={COLORS.secondary} fill="url(#gMev)" strokeWidth={2} />
            <Area type="monotone" dataKey="block_apy" name="Block Rewards APY" stroke={COLORS.success} fill="url(#gBr)" strokeWidth={2} />
            <Line type="monotone" dataKey="overall_apy" name="Total APY" stroke="#fbbf24" strokeWidth={2.5} dot={{ r: 3, fill: "#fbbf24" }} strokeDasharray="0" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Bottom row: Skip Rate + TVC Rank */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="glass-card">
          <h3 className="mb-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Skip Rate Trend
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData}>
              <CartesianGrid {...CHART_GRID} />
              <XAxis dataKey="epoch" {...CHART_AXIS} fontSize={10} />
              <YAxis {...CHART_AXIS} fontSize={10} unit="%" />
              <Tooltip {...CHART_TOOLTIP} />
              <Legend wrapperStyle={{ fontSize: "11px" }} />
              <Line type="monotone" dataKey="skip_rate" name="Chainflow" stroke={COLORS.warning} strokeWidth={2} dot={{ r: 2 }} />
              <Line type="monotone" dataKey="shinobi_skip" name="Top Performer" stroke={COLORS.shinobiTop} strokeWidth={1.5} dot={false} strokeDasharray="4 4" />
              <Line type="monotone" dataKey="network_skip" name="Network Avg" stroke={COLORS.networkAvg} strokeWidth={1} dot={false} strokeDasharray="2 2" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-card">
          <h3 className="mb-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            TVC Rank Over Time
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData}>
              <CartesianGrid {...CHART_GRID} />
              <XAxis dataKey="epoch" {...CHART_AXIS} fontSize={10} />
              <YAxis {...CHART_AXIS} fontSize={10} reversed domain={["auto", "auto"]} />
              <Tooltip {...CHART_TOOLTIP} />
              <Line type="monotone" dataKey="tvc_rank" name="TVC Rank" stroke={COLORS.primary} strokeWidth={2.5} dot={{ r: 3, fill: COLORS.primary }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}