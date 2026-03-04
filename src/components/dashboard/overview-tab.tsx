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
import { TrendingUp, Zap, Activity, Database, DollarSign } from "lucide-react";
import { toNum, rawField, formatPercent, formatCompact, formatNumber } from "@/lib/utils";
import { COLORS, CHART_AXIS, CHART_GRID, CHART_TOOLTIP } from "@/lib/constants";
import type { ValidatorEpoch, BenchmarkEpoch } from "@/lib/db/schema";

interface OverviewTabProps {
  data: ValidatorEpoch[];
  benchmarks: Record<string, BenchmarkEpoch[]>;
}

function EpochMetricCard({
  title, currentVal, prevVal, currentEpoch, prevEpoch,
  icon: Icon, accent, suffix, note,
}: {
  title: string; currentVal: string; prevVal: string;
  currentEpoch: number; prevEpoch: number;
  icon: React.ElementType; accent: string; suffix?: string; note?: string;
}) {
  return (
    <div className="glass-card relative overflow-hidden" style={{ padding: "1.75rem" }}>
      <div className="absolute right-5 top-5 flex h-12 w-12 items-center justify-center rounded-xl" style={{ background: `${accent}22` }}>
        <Icon size={22} style={{ color: accent }} />
      </div>
      <p className="mb-3 text-base font-bold uppercase tracking-wider text-zinc-300">
        {title}
      </p>
      <div className="flex items-baseline gap-2">
        <span className="font-mono text-4xl font-extrabold text-white">{currentVal}</span>
        {suffix && <span className="text-base font-medium text-zinc-400">{suffix}</span>}
      </div>
      <div className="mt-3 flex items-center gap-3 text-base">
        <span className="font-semibold text-zinc-200">E{currentEpoch}</span>
        <span className="text-zinc-600">|</span>
        <span className="text-zinc-400">E{prevEpoch}: <span className="font-mono font-medium text-zinc-300">{prevVal}</span>{suffix ? ` ${suffix}` : ""}</span>
      </div>
      {note && <p className="mt-2 text-sm text-zinc-500">{note}</p>}
    </div>
  );
}

export function OverviewTab({ data, benchmarks }: OverviewTabProps) {
  if (!data.length) {
    return (
      <div className="flex h-64 items-center justify-center text-zinc-500">
        No data available. Run the cron job to fetch data from Trillium.
      </div>
    );
  }

  const sorted = [...data].sort((a, b) => a.epoch - b.epoch);
  const latest = sorted[sorted.length - 1];
  const prev = sorted.length > 1 ? sorted[sorted.length - 2] : latest;
  const shinobiTop = benchmarks?.shinobi_top || [];
  const networkAvg = benchmarks?.network_avg || [];
  const latestTvcRank = rawField(latest, "vote_credits_rank");
  const prevTvcRank = rawField(prev, "vote_credits_rank");
  const latestNet = toNum(latest.rewards) + toNum(latest.mevToValidator) - toNum(latest.voteCost);
  const prevNet = toNum(prev.rewards) + toNum(prev.mevToValidator) - toNum(prev.voteCost);

  const chartData = sorted.map((d) => {
    const st = shinobiTop.find((b) => b.epoch === d.epoch);
    const na = networkAvg.find((b) => b.epoch === d.epoch);
    return {
      epoch: d.epoch,
      inflation_apy: toNum(d.totalInflationApy),
      mev_apy: toNum(d.totalMevApy),
      block_apy: rawField(d, "total_block_rewards_apy"),
      overall_apy: toNum(d.compoundOverallApy),
      skip_rate: toNum(d.skipRate),
      tvc_rank: rawField(d, "vote_credits_rank") || undefined,
      net_earnings: toNum(d.rewards) + toNum(d.mevToValidator) - toNum(d.voteCost),
      shinobi_skip: st ? toNum(st.skipRate) : undefined,
      network_skip: na ? toNum(na.skipRate) : undefined,
    };
  });

  return (
    <div>
      <div className="mb-8 grid grid-cols-2 gap-5 lg:grid-cols-5">
        <EpochMetricCard title="Overall APY" currentVal={formatPercent(latest.compoundOverallApy)} prevVal={formatPercent(prev.compoundOverallApy)} currentEpoch={latest.epoch} prevEpoch={prev.epoch} icon={TrendingUp} accent={COLORS.primary} />
        <EpochMetricCard title="TVC Credits" currentVal={formatCompact(latest.epochCredits)} prevVal={formatCompact(prev.epochCredits)} currentEpoch={latest.epoch} prevEpoch={prev.epoch} icon={Zap} accent={COLORS.secondary} />
        <EpochMetricCard title="Skip Rate" currentVal={formatPercent(latest.skipRate)} prevVal={formatPercent(prev.skipRate)} currentEpoch={latest.epoch} prevEpoch={prev.epoch} icon={Activity} accent={toNum(latest.skipRate) < 2 ? COLORS.success : COLORS.warning} />
        <EpochMetricCard title="Active Stake" currentVal={formatCompact(latest.activeStake)} prevVal={formatCompact(prev.activeStake)} currentEpoch={latest.epoch} prevEpoch={prev.epoch} icon={Database} accent={COLORS.info} suffix="SOL" note={`${toNum(latest.stakePercentage).toFixed(4)}% of network`} />
        <EpochMetricCard title="Net Earnings" currentVal={formatNumber(latestNet, 2)} prevVal={formatNumber(prevNet, 2)} currentEpoch={latest.epoch} prevEpoch={prev.epoch} icon={DollarSign} accent={COLORS.success} suffix="SOL" note="Revenue − Vote Costs" />
      </div>

      <div className="glass-card mb-6">
        <h3 className="mb-5 text-base font-bold uppercase tracking-wider text-zinc-300">APY Breakdown Over Time</h3>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="gInf" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.3} /><stop offset="95%" stopColor={COLORS.primary} stopOpacity={0} /></linearGradient>
              <linearGradient id="gMev" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={COLORS.secondary} stopOpacity={0.3} /><stop offset="95%" stopColor={COLORS.secondary} stopOpacity={0} /></linearGradient>
              <linearGradient id="gBr" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={COLORS.success} stopOpacity={0.3} /><stop offset="95%" stopColor={COLORS.success} stopOpacity={0} /></linearGradient>
            </defs>
            <CartesianGrid {...CHART_GRID} />
            <XAxis dataKey="epoch" {...CHART_AXIS} />
            <YAxis {...CHART_AXIS} unit="%" />
            <Tooltip {...CHART_TOOLTIP} />
            <Legend wrapperStyle={{ fontSize: "14px" }} />
            <Area type="monotone" dataKey="inflation_apy" name="Inflation APY" stroke={COLORS.primary} fill="url(#gInf)" strokeWidth={2} />
            <Area type="monotone" dataKey="mev_apy" name="MEV APY" stroke={COLORS.secondary} fill="url(#gMev)" strokeWidth={2} />
            <Area type="monotone" dataKey="block_apy" name="Block Rewards APY" stroke={COLORS.success} fill="url(#gBr)" strokeWidth={2} />
            <Line type="monotone" dataKey="overall_apy" name="Total APY" stroke="#fbbf24" strokeWidth={2.5} dot={{ r: 3, fill: "#fbbf24" }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="mb-6 grid gap-5 md:grid-cols-2">
        <div className="glass-card">
          <h3 className="mb-5 text-base font-bold uppercase tracking-wider text-zinc-300">Skip Rate Trend</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData}>
              <CartesianGrid {...CHART_GRID} />
              <XAxis dataKey="epoch" {...CHART_AXIS} />
              <YAxis {...CHART_AXIS} unit="%" />
              <Tooltip {...CHART_TOOLTIP} />
              <Legend wrapperStyle={{ fontSize: "13px" }} />
              <Line type="monotone" dataKey="skip_rate" name="Chainflow" stroke={COLORS.warning} strokeWidth={2} dot={{ r: 2 }} />
              <Line type="monotone" dataKey="shinobi_skip" name="Top Performer" stroke={COLORS.shinobiTop} strokeWidth={1.5} dot={false} strokeDasharray="4 4" />
              <Line type="monotone" dataKey="network_skip" name="Network Avg" stroke={COLORS.networkAvg} strokeWidth={1} dot={false} strokeDasharray="2 2" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-card">
          <h3 className="mb-5 text-base font-bold uppercase tracking-wider text-zinc-300">Net Earnings Over Time</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="gNet" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={COLORS.success} stopOpacity={0.3} /><stop offset="95%" stopColor={COLORS.success} stopOpacity={0} /></linearGradient>
              </defs>
              <CartesianGrid {...CHART_GRID} />
              <XAxis dataKey="epoch" {...CHART_AXIS} />
              <YAxis {...CHART_AXIS} unit=" SOL" />
              <Tooltip {...CHART_TOOLTIP} />
              <Area type="monotone" dataKey="net_earnings" name="Net Earnings" stroke={COLORS.success} fill="url(#gNet)" strokeWidth={2.5} dot={{ r: 3, fill: COLORS.success }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="glass-card">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-base font-bold uppercase tracking-wider text-zinc-300">TVC Rank Over Time</h3>
          <span className="text-sm text-zinc-500">Source: Trillium API · vote_credits_rank</span>
        </div>
        <div className="mb-4 flex items-center gap-5">
          <div className="flex items-center gap-2">
            <span className="text-base text-zinc-300">E{latest.epoch}:</span>
            <span className="font-mono text-2xl font-bold text-white">{latestTvcRank > 0 ? `#${latestTvcRank}` : "—"}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-zinc-500">E{prev.epoch}:</span>
            <span className="font-mono text-xl text-zinc-400">{prevTvcRank > 0 ? `#${prevTvcRank}` : "—"}</span>
          </div>
          {latestTvcRank > 0 && prevTvcRank > 0 && (
            <span className={`text-base font-bold ${latestTvcRank <= prevTvcRank ? "text-emerald-400" : "text-red-400"}`}>
              {latestTvcRank < prevTvcRank ? `↑ ${prevTvcRank - latestTvcRank}` : latestTvcRank > prevTvcRank ? `↓ ${latestTvcRank - prevTvcRank}` : "="}
            </span>
          )}
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={chartData}>
            <CartesianGrid {...CHART_GRID} />
            <XAxis dataKey="epoch" {...CHART_AXIS} />
            <YAxis {...CHART_AXIS} reversed domain={["auto", "auto"]} />
            <Tooltip {...CHART_TOOLTIP} />
            <Line type="monotone" dataKey="tvc_rank" name="TVC Rank" stroke={COLORS.primary} strokeWidth={2.5} dot={{ r: 3, fill: COLORS.primary }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}