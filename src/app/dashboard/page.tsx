"use client";

import { useState, useCallback } from "react";
import { Activity, DollarSign, TrendingUp, BarChart3 } from "lucide-react";
import { useValidatorData } from "@/hooks/use-validator-data";
import { OverviewTab } from "@/components/dashboard/overview-tab";
import { IncomeTab } from "@/components/dashboard/income-tab";
import { PerformanceTab } from "@/components/dashboard/performance-tab";
import { ComparisonTab } from "@/components/dashboard/comparison-tab";
import { EpochRangePicker } from "@/components/dashboard/epoch-date-picker";
import { shortenPubkey, cn } from "@/lib/utils";
import { CHAINFLOW_PUBKEY } from "@/lib/constants";

const TABS = [
  { id: "overview", label: "Overview", icon: Activity },
  { id: "income", label: "Income", icon: DollarSign },
  { id: "performance", label: "Performance", icon: TrendingUp },
  { id: "comparison", label: "Comparison", icon: BarChart3 },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [epochLimit, setEpochLimit] = useState(20);
  const [customRange, setCustomRange] = useState<{ from: number; to: number } | null>(null);

  const handlePresetChange = useCallback((limit: number) => {
    setEpochLimit(limit);
    setCustomRange(null);
  }, []);

  const handleRangeChange = useCallback((fromEpoch: number, toEpoch: number) => {
    setCustomRange({ from: fromEpoch, to: toEpoch });
  }, []);

  const { data: response, isLoading, error } = useValidatorData("chainflow", {
    limit: customRange ? undefined : epochLimit,
    fromEpoch: customRange?.from,
    toEpoch: customRange?.to,
  });

  const validatorData = response?.data ?? [];
  const benchmarks = response?.benchmarks ?? {};
  const prices = response?.prices ?? [];

  const latestEpoch = validatorData.length
    ? Math.max(...validatorData.map((d) => d.epoch))
    : null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-gradient-to-br from-primary to-purple-700 text-base font-extrabold text-white">
              C
            </div>
            <div>
              <h1 className="text-sm font-bold text-foreground">
                Chainflow Validator
              </h1>
              <p className="font-mono text-[10px] text-muted-foreground">
                {shortenPubkey(CHAINFLOW_PUBKEY)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <EpochRangePicker
              epochLimit={epochLimit}
              latestEpoch={latestEpoch}
              onPresetChange={handlePresetChange}
              onRangeChange={handleRangeChange}
            />

            {latestEpoch && (
              <div className="flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-400">
                <div className="live-dot h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Epoch {latestEpoch}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <nav className="border-b border-border/50">
        <div className="mx-auto flex max-w-[1440px] gap-0.5 px-6 pt-2">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-1.5 rounded-t-lg border-b-2 px-4 py-2.5 text-xs font-medium transition-all",
                  active
                    ? "border-primary bg-primary/10 font-bold text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon size={14} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Content */}
      <main className="mx-auto max-w-[1440px] px-6 py-6">
        {isLoading && (
          <div className="flex h-64 items-center justify-center">
            <div className="flex items-center gap-3 text-muted-foreground">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              Loading validator data...
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-6 text-center">
            <p className="text-sm font-semibold text-red-400">
              Error loading data
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {error instanceof Error ? error.message : "Unknown error"}.
              Make sure the database is set up and the cron job has run at least once.
            </p>
          </div>
        )}

        {!isLoading && !error && (
          <>
            {activeTab === "overview" && (
              <OverviewTab data={validatorData} benchmarks={benchmarks} />
            )}
            {activeTab === "income" && (
              <IncomeTab data={validatorData} prices={prices} />
            )}
            {activeTab === "performance" && (
              <PerformanceTab data={validatorData} benchmarks={benchmarks} />
            )}
            {activeTab === "comparison" && (
              <ComparisonTab data={validatorData} benchmarks={benchmarks} />
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 px-6 py-3">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between text-[10px] text-muted-foreground">
          <span>Data: Trillium API · JPool · Staking.kiwi</span>
          <span className="font-mono">Chainflow Validator Dashboard v0.1</span>
        </div>
      </footer>
    </div>
  );
}