"use client";

import { useState, useEffect, useRef } from "react";
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
import { Search, X } from "lucide-react";
import { toNum, rawField, formatNumber, formatPercent, shortenPubkey, formatCompact } from "@/lib/utils";
import { COLORS, CHART_AXIS, CHART_GRID, CHART_TOOLTIP } from "@/lib/constants";
import type { ValidatorEpoch, BenchmarkEpoch } from "@/lib/db/schema";

interface ComparisonTabProps {
  data: ValidatorEpoch[];
  benchmarks: Record<string, BenchmarkEpoch[]>;
}

interface SearchResult {
  name: string;
  pubkey: string;
  stake: number;
  apy: number;
}

interface CompareEpoch {
  epoch: number;
  pubkey: string;
  name: string | null;
  compoundOverallApy: number;
  totalInflationApy: number;
  totalMevApy: number;
  epochCredits: number;
  skipRate: number;
  mevEarned: number;
  activeStake: number;
  avgSlotDurationMs: number;
  meanVoteLatency: number;
  avgCuPerBlock: number;
  rewards: number;
  voteCost: number;
  jip25Rank: number;
  voteCreditsRank: number;
}

interface CompareData {
  pubkey: string;
  name: string | null;
  data: CompareEpoch[];
}

export function ComparisonTab({ data, benchmarks }: ComparisonTabProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [compareValidator, setCompareValidator] = useState<CompareData | null>(null);
  const [loadingCompare, setLoadingCompare] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>(null);

  const sorted = [...data].sort((a, b) => a.epoch - b.epoch);
  const latest = sorted[sorted.length - 1];

  const shinobiTop = benchmarks?.shinobi_top || [];
  const networkAvg = benchmarks?.network_avg || [];

  const latestSt = shinobiTop.length ? shinobiTop.reduce((a, b) => (a.epoch > b.epoch ? a : b)) : null;
  const latestNa = networkAvg.length ? networkAvg.reduce((a, b) => (a.epoch > b.epoch ? a : b)) : null;

  const topPerformerRaw = latestSt?.rawData as Record<string, unknown> | null;
  const topPerformerName = (topPerformerRaw?.name as string) || null;

  // Search debounce
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (searchQuery.length < 2) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/validators/search?q=${encodeURIComponent(searchQuery)}`);
        const json = await res.json();
        setSearchResults(json.results || []);
        setShowDropdown(true);
      } catch {
        setSearchResults([]);
      }
      setIsSearching(false);
    }, 300);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchQuery]);

  // Click outside to close
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selectValidator = async (result: SearchResult) => {
    setShowDropdown(false);
    setSearchQuery(result.name);
    setLoadingCompare(true);
    try {
      const res = await fetch(`/api/validators/compare?pubkey=${encodeURIComponent(result.pubkey)}`);
      const json = await res.json();
      if (json.data) {
        setCompareValidator(json);
      }
    } catch (err) {
      console.error("Failed to load comparison data:", err);
    }
    setLoadingCompare(false);
  };

  const clearComparison = () => {
    setCompareValidator(null);
    setSearchQuery("");
  };

  if (!latest) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        No comparison data available.
      </div>
    );
  }

  // Determine comparison target
  const compareLabel = compareValidator?.name
    ? compareValidator.name.length > 25 ? compareValidator.name.slice(0, 25) + "…" : compareValidator.name
    : topPerformerName
    ? topPerformerName.length > 25 ? topPerformerName.slice(0, 25) + "…" : topPerformerName
    : "Top Performer";

  // Get comparison epoch data
  const getCompareVal = (epoch: number, field: keyof CompareEpoch): number => {
    if (compareValidator) {
      const d = compareValidator.data.find((e) => e.epoch === epoch);
      return d ? Number(d[field]) || 0 : 0;
    }
    return 0;
  };

  const getLatestCompareVal = (field: keyof CompareEpoch): number | null => {
    if (compareValidator?.data.length) {
      const latestComp = compareValidator.data[compareValidator.data.length - 1];
      return Number(latestComp[field]) || 0;
    }
    if (latestSt) {
      // Fall back to top performer from benchmarks
      const map: Record<string, string> = {
        compoundOverallApy: "compoundOverallApy",
        skipRate: "skipRate",
        epochCredits: "epochCredits",
        mevEarned: "mevEarned",
        activeStake: "activeStake",
      };
      const bmField = map[field];
      if (bmField && latestSt[bmField as keyof typeof latestSt] != null) {
        return toNum(latestSt[bmField as keyof typeof latestSt] as string);
      }
    }
    return null;
  };

  // Get APY values for reference
  const topApy = getLatestCompareVal("compoundOverallApy") ?? (latestSt ? toNum(latestSt.compoundOverallApy) : null);
  const avgApy = latestNa ? toNum(latestNa.compoundOverallApy) : null;

  // Radar data
  const maxCredits = 445000;
  const maxApy = Math.max(toNum(latest.compoundOverallApy), topApy ?? 0, 10) * 1.2;

  const compCredits = getLatestCompareVal("epochCredits");
  const compSkip = getLatestCompareVal("skipRate");
  const compApy = getLatestCompareVal("compoundOverallApy");
  const compMev = getLatestCompareVal("mevEarned");

  const radarData = [
    {
      metric: "TVC Credits",
      chainflow: Math.min(100, (toNum(latest.epochCredits) / maxCredits) * 100),
      compare: compCredits != null ? Math.min(100, (compCredits / maxCredits) * 100) : 0,
      avg: latestNa ? Math.min(100, (toNum(latestNa.epochCredits) / maxCredits) * 100) : 0,
    },
    {
      metric: "Low Skip Rate",
      chainflow: Math.max(0, 100 - toNum(latest.skipRate) * 10),
      compare: compSkip != null ? Math.max(0, 100 - compSkip * 10) : 0,
      avg: latestNa ? Math.max(0, 100 - toNum(latestNa.skipRate) * 10) : 0,
    },
    {
      metric: "APY",
      chainflow: Math.min(100, (toNum(latest.compoundOverallApy) / maxApy) * 100),
      compare: compApy != null ? Math.min(100, (compApy / maxApy) * 100) : 0,
      avg: latestNa ? Math.min(100, (toNum(latestNa.compoundOverallApy) / maxApy) * 100) : 0,
    },
    {
      metric: "MEV Earnings",
      chainflow: Math.min(100, (toNum(latest.mevEarned) / 0.6) * 100),
      compare: compMev != null ? Math.min(100, (compMev / 0.6) * 100) : 0,
      avg: 50,
    },
    {
      metric: "Slot Speed",
      chainflow: latest.avgSlotDurationMs ? Math.max(0, 100 - (toNum(latest.avgSlotDurationMs) - 400) / 1.2) : 70,
      compare: 60,
      avg: 60,
    },
  ];

  // Head-to-head
  const comparisons = [
    { metric: "TVC Credits", cf: toNum(latest.epochCredits), st: compCredits, fmt: (v: number) => formatNumber(v, 0), better: "higher" as const },
    { metric: "Skip Rate", cf: toNum(latest.skipRate), st: compSkip, fmt: (v: number) => formatPercent(v), better: "lower" as const },
    { metric: "Overall APY", cf: toNum(latest.compoundOverallApy), st: compApy, fmt: (v: number) => formatPercent(v, 3), better: "higher" as const },
    { metric: "MEV Earned", cf: toNum(latest.mevEarned), st: compMev, fmt: (v: number) => `${formatNumber(v, 4)} SOL`, better: "higher" as const },
    { metric: "Active Stake", cf: toNum(latest.activeStake), st: getLatestCompareVal("activeStake"), fmt: (v: number) => `${formatCompact(v)} SOL`, better: "higher" as const },
  ];

  // Chart data
  const barChartData = sorted.map((d) => ({
    epoch: d.epoch,
    chainflow: toNum(d.compoundOverallApy),
    compare: compareValidator ? getCompareVal(d.epoch, "compoundOverallApy") || undefined : topApy,
    avg: avgApy,
  }));

  return (
    <div>
      {/* Header with search */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground">
            Chainflow vs {compareLabel}
          </h2>
          {(compareValidator || topPerformerName) && (
            <p className="text-xs text-muted-foreground">
              Comparing against{" "}
              <span className="font-semibold text-emerald-400">
                {compareValidator?.name || topPerformerName}
              </span>
              {compareValidator && (
                <button onClick={clearComparison} className="ml-2 text-red-400 hover:text-red-300">
                  <X size={12} className="inline" /> clear
                </button>
              )}
            </p>
          )}
        </div>

        {/* Validator Search */}
        <div ref={searchRef} className="relative w-full sm:w-80">
          <div className="flex items-center gap-2 rounded-lg border border-border bg-secondary px-3 py-2">
            <Search size={14} className="text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search validator name or pubkey..."
              className="w-full bg-transparent text-xs text-foreground outline-none placeholder:text-muted-foreground"
            />
            {isSearching && (
              <div className="h-3 w-3 animate-spin rounded-full border border-primary border-t-transparent" />
            )}
          </div>

          {showDropdown && searchResults.length > 0 && (
            <div className="absolute top-full z-50 mt-1 w-full rounded-lg border border-border bg-card shadow-xl">
              <div className="max-h-64 overflow-auto py-1">
                {searchResults.map((r) => (
                  <button
                    key={r.pubkey}
                    onClick={() => selectValidator(r)}
                    className="flex w-full items-center justify-between px-3 py-2 text-left text-xs transition-colors hover:bg-primary/10"
                  >
                    <div>
                      <span className="font-semibold text-foreground">{r.name}</span>
                      <span className="ml-2 font-mono text-[10px] text-muted-foreground">
                        {shortenPubkey(r.pubkey, 4)}
                      </span>
                    </div>
                    <span className="font-mono text-emerald-400">{r.apy.toFixed(2)}%</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {showDropdown && searchResults.length === 0 && searchQuery.length >= 2 && !isSearching && (
            <div className="absolute top-full z-50 mt-1 w-full rounded-lg border border-border bg-card px-3 py-3 text-center text-xs text-muted-foreground shadow-xl">
              No validators found
            </div>
          )}
        </div>
      </div>

      {loadingCompare && (
        <div className="mb-5 flex items-center gap-2 text-xs text-muted-foreground">
          <div className="h-3 w-3 animate-spin rounded-full border border-primary border-t-transparent" />
          Loading comparison data...
        </div>
      )}

      <div className="mb-5 grid gap-4 md:grid-cols-2">
        {/* Radar */}
        <div className="glass-card">
          <h3 className="mb-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Current Epoch Snapshot
          </h3>
          <p className="mb-3 text-[10px] text-muted-foreground">Normalized 0–100 scale</p>
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="hsl(240 4% 18%)" />
              <PolarAngleAxis dataKey="metric" tick={{ fill: "hsl(240 5% 55%)", fontSize: 11 }} />
              <PolarRadiusAxis tick={false} axisLine={false} domain={[0, 100]} />
              <Radar name="Chainflow" dataKey="chainflow" stroke={COLORS.primary} fill={COLORS.primary} fillOpacity={0.2} strokeWidth={2} />
              <Radar name={compareLabel} dataKey="compare" stroke={COLORS.shinobiTop} fill={COLORS.shinobiTop} fillOpacity={0.1} strokeWidth={1.5} strokeDasharray="4 4" />
              <Radar name="Network Avg" dataKey="avg" stroke={COLORS.networkAvg} fill={COLORS.networkAvg} fillOpacity={0.05} strokeWidth={1} />
              <Legend wrapperStyle={{ fontSize: "11px" }} />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Head-to-Head */}
        <div className="glass-card">
          <h3 className="mb-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Head-to-Head (Epoch {latest.epoch})
          </h3>
          <table className="w-full border-collapse font-mono text-xs">
            <thead>
              <tr className="border-b border-white/[0.08]">
                <th className="px-3 py-2.5 text-left font-semibold text-muted-foreground">Metric</th>
                <th className="px-3 py-2.5 text-right font-semibold text-purple-400">Chainflow</th>
                <th className="px-3 py-2.5 text-right font-semibold text-emerald-400">{compareLabel}</th>
                <th className="px-3 py-2.5 text-right font-semibold text-muted-foreground">Δ Delta</th>
              </tr>
            </thead>
            <tbody>
              {comparisons.map((row) => {
                const delta = row.st != null ? row.cf - row.st : null;
                const isGood = delta != null ? (row.better === "higher" ? delta >= 0 : delta <= 0) : true;
                return (
                  <tr key={row.metric} className="border-b border-white/[0.03]">
                    <td className="px-3 py-2.5 text-muted-foreground">{row.metric}</td>
                    <td className="px-3 py-2.5 text-right text-purple-300 font-semibold">{row.fmt(row.cf)}</td>
                    <td className="px-3 py-2.5 text-right text-emerald-300">{row.st != null ? row.fmt(row.st) : "—"}</td>
                    <td className={`px-3 py-2.5 text-right font-bold ${delta == null ? "text-muted-foreground" : isGood ? "text-emerald-400" : "text-red-400"}`}>
                      {delta != null ? `${delta >= 0 ? "+" : ""}${formatNumber(delta, 2)}` : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* APY Comparison Chart */}
      <div className="glass-card">
        <h3 className="mb-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          APY Comparison Over Time
        </h3>
        <p className="mb-3 text-[10px] text-muted-foreground">
          {compareValidator ? `Chainflow vs ${compareLabel} per epoch` : "Bars = Chainflow · Lines = benchmark reference"}
        </p>
        <ResponsiveContainer width="100%" height={320}>
          <ComposedChart data={barChartData}>
            <defs>
              <linearGradient id="gBar" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={COLORS.primary} stopOpacity={0.9} />
                <stop offset="100%" stopColor={COLORS.primary} stopOpacity={0.4} />
              </linearGradient>
            </defs>
            <CartesianGrid {...CHART_GRID} />
            <XAxis dataKey="epoch" {...CHART_AXIS} />
            <YAxis {...CHART_AXIS} unit="%" />
            <Tooltip
              {...CHART_TOOLTIP}
              formatter={(value: number, name: string) => {
                const label = name === "chainflow" ? "Chainflow" : name === "compare" ? compareLabel : name === "avg" ? "Network Avg" : name;
                return [value != null ? `${value.toFixed(2)}%` : "—", label];
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: "11px" }}
              formatter={(value: string) => value === "chainflow" ? "Chainflow" : value === "compare" ? compareLabel : value === "avg" ? "Network Avg" : value}
            />
            <Bar dataKey="chainflow" fill="url(#gBar)" radius={[4, 4, 0, 0]} barSize={compareValidator ? 20 : 40} />
            {compareValidator && (
              <Bar dataKey="compare" fill={`${COLORS.shinobiTop}80`} radius={[4, 4, 0, 0]} barSize={20} />
            )}
            {!compareValidator && topApy != null && (
              <Line type="monotone" dataKey="compare" stroke={COLORS.shinobiTop} strokeWidth={2.5} dot={{ r: 4, fill: COLORS.shinobiTop, strokeWidth: 0 }} strokeDasharray="8 4" />
            )}
            {avgApy != null && (
              <Line type="monotone" dataKey="avg" stroke={COLORS.networkAvg} strokeWidth={2} dot={{ r: 3, fill: COLORS.networkAvg, strokeWidth: 0 }} strokeDasharray="4 4" />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}