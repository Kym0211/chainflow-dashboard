"use client";

import { useState } from "react";
import {
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
import { DollarSign, Cpu, TrendingUp, Zap, Upload, Download } from "lucide-react";
import { MetricCard } from "./metric-card";
import { CsvUpload } from "./csv-upload";
import { toNum, rawField, formatSol, formatNumber } from "@/lib/utils";
import { COLORS, CHART_AXIS, CHART_GRID, CHART_TOOLTIP } from "@/lib/constants";
import type { ValidatorEpoch, SolPrice } from "@/lib/db/schema";

interface IncomeTabProps {
  data: ValidatorEpoch[];
  prices: SolPrice[];
}

export function IncomeTab({ data, prices }: IncomeTabProps) {
  const [showUpload, setShowUpload] = useState(false);

  const sorted = [...data].sort((a, b) => a.epoch - b.epoch);

  const incomeData = sorted.map((d) => {
    const rewards = toNum(d.rewards);
    const mevToValidator = toNum(d.mevToValidator);
    const priorityFees = toNum(d.validatorPriorityFees);
    const voteCost = toNum(d.voteCost);
    const inflationReward = rawField(d, "total_inflation_reward") || rawField(d, "validator_inflation_reward");
    const avgRewardsPerBlock = rawField(d, "avg_rewards_per_block");
    const avgMevPerBlock = rawField(d, "avg_mev_per_block");
    const avgPriorityPerBlock = rawField(d, "avg_priority_fees_per_block");

    const price = prices.find((p) => p.epoch === d.epoch);
    const solPrice = price ? toNum(price.priceUsd) : 0;

    const totalRevenue = rewards + mevToValidator + priorityFees;
    const net = totalRevenue - voteCost;

    return {
      epoch: d.epoch,
      inflation: inflationReward,
      rewards,
      mev: mevToValidator,
      priority_fees: priorityFees,
      vote_cost: -voteCost,
      vote_cost_abs: voteCost,
      net,
      net_usd: net * solPrice,
      sol_price: solPrice,
      avg_rewards_per_block: avgRewardsPerBlock,
      avg_mev_per_block: avgMevPerBlock,
      avg_priority_per_block: avgPriorityPerBlock,
    };
  });

  const totals = incomeData.reduce(
    (acc, d) => ({
      revenue: acc.revenue + d.rewards + d.mev + d.priority_fees,
      voteCost: acc.voteCost + d.vote_cost_abs,
      mev: acc.mev + d.mev,
      net: acc.net + d.net,
    }),
    { revenue: 0, voteCost: 0, mev: 0, net: 0 }
  );

  const handleDownload = () => {
    const headers = ["Epoch", "Inflation Reward", "Block Rewards", "MEV", "Priority Fees", "Vote Cost", "Net Income", "Avg Rewards/Block", "Avg MEV/Block", "Avg Priority/Block"];
    const rows = incomeData.slice().reverse().map((d) => [
      d.epoch,
      d.inflation.toFixed(6),
      d.rewards.toFixed(6),
      d.mev.toFixed(6),
      d.priority_fees.toFixed(6),
      d.vote_cost_abs.toFixed(6),
      d.net.toFixed(6),
      d.avg_rewards_per_block.toFixed(6),
      d.avg_mev_per_block.toFixed(6),
      d.avg_priority_per_block.toFixed(6),
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `chainflow-income-${sorted[0]?.epoch}-${sorted[sorted.length - 1]?.epoch}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-lg font-bold text-foreground">Income & Revenue</h2>
        <div className="flex gap-2">
          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 rounded-lg bg-secondary/50 px-4 py-2 text-xs font-semibold text-muted-foreground ring-1 ring-white/10 transition-all hover:text-foreground"
          >
            <Download size={14} /> Download CSV
          </button>
          <button
            onClick={() => setShowUpload(!showUpload)}
            className="flex items-center gap-1.5 rounded-lg bg-primary/15 px-4 py-2 text-xs font-semibold text-primary ring-1 ring-primary/30 transition-all hover:bg-primary/25"
          >
            <Upload size={14} /> Upload CSV
          </button>
        </div>
      </div>

      {showUpload && <div className="mb-5"><CsvUpload /></div>}

      {/* Summary Cards */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard title="Total Revenue" value={formatSol(totals.revenue)} subtitle={`Last ${data.length} epochs`} icon={DollarSign} accent={COLORS.success} />
        <MetricCard title="Vote Costs" value={formatSol(totals.voteCost)} subtitle="Consensus participation" icon={Cpu} accent={COLORS.danger} />
        <MetricCard title="Net Profit" value={formatSol(totals.net)} subtitle="Revenue minus costs" icon={TrendingUp} accent={COLORS.primary} />
        <MetricCard title="MEV Income" value={formatSol(totals.mev)} subtitle="Validator MEV share" icon={Zap} accent={COLORS.warning} />
      </div>

      {/* Income Chart */}
      <div className="glass-card mb-5">
        <h3 className="mb-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Income Breakdown by Epoch
        </h3>
        <ResponsiveContainer width="100%" height={320}>
          <ComposedChart data={incomeData}>
            <CartesianGrid {...CHART_GRID} />
            <XAxis dataKey="epoch" {...CHART_AXIS} />
            <YAxis {...CHART_AXIS} unit=" SOL" />
            <Tooltip {...CHART_TOOLTIP} />
            <Legend wrapperStyle={{ fontSize: "12px" }} />
            <Bar dataKey="inflation" name="Inflation" stackId="rev" fill={COLORS.inflation} />
            <Bar dataKey="rewards" name="Block Rewards" stackId="rev" fill={COLORS.primary} />
            <Bar dataKey="mev" name="MEV" stackId="rev" fill={COLORS.secondary} />
            <Bar dataKey="priority_fees" name="Priority Fees" stackId="rev" fill={COLORS.success} radius={[4, 4, 0, 0]} />
            <Bar dataKey="vote_cost" name="Vote Cost" fill={`${COLORS.danger}40`} radius={[0, 0, 4, 4]} />
            <Line type="monotone" dataKey="net" name="Net Income" stroke={COLORS.warning} strokeWidth={2.5} dot={{ r: 3, fill: COLORS.warning }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Epoch Table */}
      <div className="glass-card overflow-auto">
        <h3 className="mb-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Epoch-by-Epoch Detail
        </h3>
        <table className="w-full border-collapse font-mono text-xs">
          <thead>
            <tr className="border-b border-white/[0.08]">
              {["Epoch", "Inflation", "Block Rewards", "MEV", "Priority Fees", "Vote Cost", "Net", "Avg/Block"].map(
                (h) => (
                  <th key={h} className="px-3 py-2 text-right font-semibold text-muted-foreground first:text-left">
                    {h}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            {incomeData.slice().reverse().slice(0, 15).map((d) => (
              <tr key={d.epoch} className="border-b border-white/[0.03]">
                <td className="px-3 py-2 text-left text-muted-foreground">{d.epoch}</td>
                <td className="px-3 py-2 text-right text-pink-400">{formatNumber(d.inflation, 4)}</td>
                <td className="px-3 py-2 text-right text-purple-400">{formatNumber(d.rewards, 4)}</td>
                <td className="px-3 py-2 text-right text-blue-400">{formatNumber(d.mev, 4)}</td>
                <td className="px-3 py-2 text-right text-emerald-400">{formatNumber(d.priority_fees, 4)}</td>
                <td className="px-3 py-2 text-right text-red-400">{formatNumber(d.vote_cost_abs, 4)}</td>
                <td className={`px-3 py-2 text-right font-bold ${d.net >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {formatNumber(d.net, 4)}
                </td>
                <td className="px-3 py-2 text-right text-muted-foreground">
                  {d.avg_rewards_per_block > 0 ? formatNumber(d.avg_rewards_per_block, 4) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}