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
import { Upload, Download, Settings } from "lucide-react";
import { CsvUpload } from "./csv-upload";
import { toNum, rawField, formatNumber } from "@/lib/utils";
import { COLORS, CHART_AXIS, CHART_GRID, CHART_TOOLTIP } from "@/lib/constants";
import type { ValidatorEpoch, SolPrice } from "@/lib/db/schema";

interface IncomeTabProps {
  data: ValidatorEpoch[];
  prices: SolPrice[];
}

/** Dual-epoch income card */
function IncomeCard({
  title,
  total,
  current,
  prev,
  currentEpoch,
  prevEpoch,
  epochCount,
  color,
  isNegative,
}: {
  title: string;
  total: number;
  current: number;
  prev: number;
  currentEpoch: number;
  prevEpoch: number;
  epochCount: number;
  color: string;
  isNegative?: boolean;
}) {
  return (
    <div className="glass-card" style={{ padding: "1.5rem" }}>
      <p className="mb-2 text-sm font-bold uppercase tracking-wider text-zinc-300">
        {title}
      </p>
      <div className="flex items-baseline gap-2">
        <span className="font-mono text-2xl font-extrabold" style={{ color }}>
          {isNegative ? "-" : ""}{formatNumber(Math.abs(total), 4)}
        </span>
        <span className="text-sm text-zinc-400">SOL</span>
      </div>
      <p className="mb-3 text-xs text-zinc-500">Last {epochCount} epochs</p>
      <div className="flex items-center gap-3 border-t border-white/[0.08] pt-3 text-sm">
        <div>
          <span className="text-zinc-400">E{currentEpoch}: </span>
          <span className="font-mono font-semibold text-white">{formatNumber(current, 4)}</span>
        </div>
        <span className="text-zinc-600">|</span>
        <div>
          <span className="text-zinc-500">E{prevEpoch}: </span>
          <span className="font-mono text-zinc-300">{formatNumber(prev, 4)}</span>
        </div>
      </div>
    </div>
  );
}

export function IncomeTab({ data, prices }: IncomeTabProps) {
  const [showUpload, setShowUpload] = useState(false);
  const [marinadeFeePerEpoch, setMarinadeFeePerEpoch] = useState(0.5); // SOL per epoch
  const [showSettings, setShowSettings] = useState(false);

  const sorted = [...data].sort((a, b) => a.epoch - b.epoch);
  const epochCount = sorted.length;
  const latest = sorted[sorted.length - 1];
  const prev = sorted.length > 1 ? sorted[sorted.length - 2] : latest;

  if (!latest) {
    return (
      <div className="flex h-64 items-center justify-center text-zinc-400">
        No income data available.
      </div>
    );
  }

  // Parse per-epoch values
  const epochData = sorted.map((d) => {
    const inflation = rawField(d, "validator_inflation_reward");
    // const inflation = rawField(d, "validator_inflation_reward");
    const blockRewards = toNum(d.rewards);
    const mevToValidator = toNum(d.mevToValidator);
    const priorityFees = toNum(d.validatorPriorityFees);
    const voteCost = toNum(d.voteCost);
    const avgRewardsPerBlock = rawField(d, "avg_rewards_per_block");
    const avgMevPerBlock = rawField(d, "avg_mev_per_block");
    const avgPriorityPerBlock = rawField(d, "avg_priority_fees_per_block");

    const price = prices.find((p) => p.epoch === d.epoch);
    const solPrice = price ? toNum(price.priceUsd) : 0;

    const grossRevenue = inflation + blockRewards + mevToValidator + priorityFees;
    const totalCosts = voteCost + marinadeFeePerEpoch;
    const net = grossRevenue - totalCosts;

    return {
      epoch: d.epoch,
      inflation,
      blockRewards,
      mev: mevToValidator,
      priorityFees,
      voteCost,
      marinadeFee: marinadeFeePerEpoch,
      grossRevenue,
      net,
      net_usd: net * solPrice,
      solPrice,
      avgRewardsPerBlock,
      avgMevPerBlock,
      avgPriorityPerBlock,
      // For chart — negative costs
      vote_cost_neg: -voteCost,
      marinade_neg: -marinadeFeePerEpoch,
    };
  });

  // Helpers to sum a field across all epochs
  const sumAll = (field: keyof (typeof epochData)[0]): number =>
    epochData.reduce((s, d) => s + (Number(d[field]) || 0), 0);

  const getVal = (d: typeof latest, field: string): number => {
    if (field === "inflation") return rawField(d, "validator_inflation_reward");
    if (field === "blockRewards") return toNum(d.rewards);
    if (field === "mev") return toNum(d.mevToValidator);
    if (field === "priorityFees") return toNum(d.validatorPriorityFees);
    if (field === "voteCost") return toNum(d.voteCost);
    if (field === "marinadeFee") return marinadeFeePerEpoch;
    return 0;
  };

  const getNet = (d: typeof latest): number => {
    const gross = getVal(d, "inflation") + getVal(d, "blockRewards") + getVal(d, "mev") + getVal(d, "priorityFees");
    return gross - getVal(d, "voteCost") - marinadeFeePerEpoch;
  };

  // Chart data
  const chartData = epochData.map((d) => ({
    epoch: d.epoch,
    inflation: d.inflation,
    blockRewards: d.blockRewards,
    mev: d.mev,
    priorityFees: d.priorityFees,
    vote_cost: d.vote_cost_neg,
    marinade: d.marinade_neg,
    net: d.net,
  }));

  // CSV download
  const handleDownload = () => {
    const headers = [
      "Epoch", "Inflation", "Block Rewards", "MEV", "Priority Fees",
      "Vote Cost", "Marinade Fee", "Net Income",
      "Avg Rewards/Block", "Avg MEV/Block", "Avg Priority/Block",
    ];
    const rows = epochData.slice().reverse().map((d) => [
      d.epoch,
      d.inflation.toFixed(6),
      d.blockRewards.toFixed(6),
      d.mev.toFixed(6),
      d.priorityFees.toFixed(6),
      d.voteCost.toFixed(6),
      d.marinadeFee.toFixed(6),
      d.net.toFixed(6),
      d.avgRewardsPerBlock.toFixed(6),
      d.avgMevPerBlock.toFixed(6),
      d.avgPriorityPerBlock.toFixed(6),
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
      {/* Header */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-white">Income & Revenue</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="flex items-center gap-1.5 rounded-lg bg-secondary/50 px-3 py-2 text-xs font-semibold text-zinc-400 ring-1 ring-white/10 transition-all hover:text-white"
          >
            <Settings size={14} /> Costs
          </button>
          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 rounded-lg bg-secondary/50 px-3 py-2 text-xs font-semibold text-zinc-400 ring-1 ring-white/10 transition-all hover:text-white"
          >
            <Download size={14} /> CSV
          </button>
          <button
            onClick={() => setShowUpload(!showUpload)}
            className="flex items-center gap-1.5 rounded-lg bg-primary/15 px-3 py-2 text-xs font-semibold text-primary ring-1 ring-primary/30 transition-all hover:bg-primary/25"
          >
            <Upload size={14} /> Upload
          </button>
        </div>
      </div>

      {/* Marinade fee settings */}
      {showSettings && (
        <div className="mb-5 rounded-lg border border-border bg-secondary/30 p-4">
          <p className="mb-2 text-xs font-semibold text-white">Cost Settings</p>
          <div className="flex items-center gap-3">
            <label className="text-sm text-zinc-400">Marinade fee per epoch (SOL):</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={marinadeFeePerEpoch}
              onChange={(e) => setMarinadeFeePerEpoch(Math.max(0, parseFloat(e.target.value) || 0))}
              className="w-24 rounded border border-border bg-background px-2 py-1 font-mono text-sm text-white outline-none focus:ring-1 focus:ring-primary"
            />
            <span className="text-xs text-zinc-500">Subtracted from Net Profit each epoch</span>
          </div>
        </div>
      )}

      {showUpload && <div className="mb-5"><CsvUpload /></div>}

      {/* Income type cards — all with same timeline + current/prev epoch */}
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <IncomeCard
          title="Inflation Rewards"
          total={sumAll("inflation")}
          current={getVal(latest, "inflation")}
          prev={getVal(prev, "inflation")}
          currentEpoch={latest.epoch}
          prevEpoch={prev.epoch}
          epochCount={epochCount}
          color={COLORS.inflation}
        />
        <IncomeCard
          title="Block Rewards"
          total={sumAll("blockRewards")}
          current={getVal(latest, "blockRewards")}
          prev={getVal(prev, "blockRewards")}
          currentEpoch={latest.epoch}
          prevEpoch={prev.epoch}
          epochCount={epochCount}
          color={COLORS.primary}
        />
        <IncomeCard
          title="MEV Income"
          total={sumAll("mev")}
          current={getVal(latest, "mev")}
          prev={getVal(prev, "mev")}
          currentEpoch={latest.epoch}
          prevEpoch={prev.epoch}
          epochCount={epochCount}
          color={COLORS.secondary}
        />
        <IncomeCard
          title="Priority Fees"
          total={sumAll("priorityFees")}
          current={getVal(latest, "priorityFees")}
          prev={getVal(prev, "priorityFees")}
          currentEpoch={latest.epoch}
          prevEpoch={prev.epoch}
          epochCount={epochCount}
          color={COLORS.success}
        />
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <IncomeCard
          title="Vote Costs"
          total={sumAll("voteCost")}
          current={getVal(latest, "voteCost")}
          prev={getVal(prev, "voteCost")}
          currentEpoch={latest.epoch}
          prevEpoch={prev.epoch}
          epochCount={epochCount}
          color={COLORS.danger}
          isNegative
        />
        <IncomeCard
          title="Marinade Fees"
          total={marinadeFeePerEpoch * epochCount}
          current={marinadeFeePerEpoch}
          prev={marinadeFeePerEpoch}
          currentEpoch={latest.epoch}
          prevEpoch={prev.epoch}
          epochCount={epochCount}
          color={COLORS.warning}
          isNegative
        />
        <IncomeCard
          title="Net Profit"
          total={sumAll("net")}
          current={getNet(latest)}
          prev={getNet(prev)}
          currentEpoch={latest.epoch}
          prevEpoch={prev.epoch}
          epochCount={epochCount}
          color={sumAll("net") >= 0 ? COLORS.success : COLORS.danger}
        />
        <IncomeCard
          title="Avg Rewards/Block"
          total={epochData.reduce((s, d) => s + d.avgRewardsPerBlock, 0) / (epochCount || 1)}
          current={rawField(latest, "avg_rewards_per_block")}
          prev={rawField(prev, "avg_rewards_per_block")}
          currentEpoch={latest.epoch}
          prevEpoch={prev.epoch}
          epochCount={epochCount}
          color={COLORS.info}
        />
      </div>

      {/* Income Chart */}
      <div className="glass-card mb-5">
        <h3 className="mb-4 text-base font-bold uppercase tracking-wider text-zinc-300">
          Income Breakdown by Epoch
        </h3>
        <ResponsiveContainer width="100%" height={320}>
          <ComposedChart data={chartData}>
            <CartesianGrid {...CHART_GRID} />
            <XAxis dataKey="epoch" {...CHART_AXIS} />
            <YAxis {...CHART_AXIS} unit=" SOL" />
            <Tooltip {...CHART_TOOLTIP} />
            <Legend wrapperStyle={{ fontSize: "11px" }} />
            <Bar dataKey="inflation" name="Inflation" stackId="rev" fill={COLORS.inflation} />
            <Bar dataKey="blockRewards" name="Block Rewards" stackId="rev" fill={COLORS.primary} />
            <Bar dataKey="mev" name="MEV" stackId="rev" fill={COLORS.secondary} />
            <Bar dataKey="priorityFees" name="Priority Fees" stackId="rev" fill={COLORS.success} radius={[4, 4, 0, 0]} />
            <Bar dataKey="vote_cost" name="Vote Cost" stackId="cost" fill={`${COLORS.danger}60`} />
            <Bar dataKey="marinade" name="Marinade Fee" stackId="cost" fill={`${COLORS.warning}60`} radius={[0, 0, 4, 4]} />
            <Line type="monotone" dataKey="net" name="Net Income" stroke="#fbbf24" strokeWidth={2.5} dot={{ r: 3, fill: "#fbbf24" }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Epoch Table */}
      <div className="glass-card overflow-auto">
        <h3 className="mb-4 text-base font-bold uppercase tracking-wider text-zinc-300">
          Epoch-by-Epoch Detail
        </h3>
        <table className="w-full border-collapse font-mono text-sm">
          <thead>
            <tr className="border-b border-white/[0.08]">
              {["Epoch", "Inflation", "Block Rwd", "MEV", "Priority", "Vote Cost", "Marinade", "Net", "Avg/Block"].map(
                (h) => (
                  <th key={h} className="px-2 py-2 text-right font-semibold text-zinc-400 first:text-left">
                    {h}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            {epochData.slice().reverse().slice(0, 20).map((d) => (
              <tr key={d.epoch} className="border-b border-white/[0.03]">
                <td className="px-2 py-2 text-left text-zinc-400">{d.epoch}</td>
                <td className="px-2 py-2 text-right text-pink-400">{formatNumber(d.inflation, 4)}</td>
                <td className="px-2 py-2 text-right text-purple-400">{formatNumber(d.blockRewards, 4)}</td>
                <td className="px-2 py-2 text-right text-blue-400">{formatNumber(d.mev, 4)}</td>
                <td className="px-2 py-2 text-right text-emerald-400">{formatNumber(d.priorityFees, 4)}</td>
                <td className="px-2 py-2 text-right text-red-400">{formatNumber(d.voteCost, 4)}</td>
                <td className="px-2 py-2 text-right text-amber-400">{formatNumber(d.marinadeFee, 4)}</td>
                <td className={`px-2 py-2 text-right font-bold ${d.net >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {formatNumber(d.net, 4)}
                </td>
                <td className="px-2 py-2 text-right text-zinc-400">
                  {d.avgRewardsPerBlock > 0 ? formatNumber(d.avgRewardsPerBlock, 4) : "—"}
                </td>
              </tr>
            ))}
            {/* Totals row */}
            <tr className="border-t-2 border-white/[0.15]">
              <td className="px-2 py-2 text-left font-bold text-white">Total</td>
              <td className="px-2 py-2 text-right font-bold text-pink-400">{formatNumber(sumAll("inflation"), 4)}</td>
              <td className="px-2 py-2 text-right font-bold text-purple-400">{formatNumber(sumAll("blockRewards"), 4)}</td>
              <td className="px-2 py-2 text-right font-bold text-blue-400">{formatNumber(sumAll("mev"), 4)}</td>
              <td className="px-2 py-2 text-right font-bold text-emerald-400">{formatNumber(sumAll("priorityFees"), 4)}</td>
              <td className="px-2 py-2 text-right font-bold text-red-400">{formatNumber(sumAll("voteCost"), 4)}</td>
              <td className="px-2 py-2 text-right font-bold text-amber-400">{formatNumber(marinadeFeePerEpoch * epochCount, 4)}</td>
              <td className={`px-2 py-2 text-right font-extrabold ${sumAll("net") >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                {formatNumber(sumAll("net"), 4)}
              </td>
              <td className="px-2 py-2 text-right text-zinc-400">—</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}