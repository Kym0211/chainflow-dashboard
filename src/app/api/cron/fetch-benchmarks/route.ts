import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { benchmarkEpochs } from "@/lib/db/schema";
import { trillium } from "@/lib/trillium/client";
import { BENCHMARKS } from "@/lib/constants";
import { eq, and } from "drizzle-orm";

export const maxDuration = 120;

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    console.log("[Cron] Fetching benchmark data...");

    // Get latest epoch data for ALL validators
    const allValidators = await trillium.getLatestValidatorRewards();

    if (!allValidators.length) {
      return NextResponse.json({ error: "No validator data" }, { status: 500 });
    }

    const epoch = allValidators[0].epoch;
    let upserted = 0;
    const details: Record<string, unknown> = {};

    // 1. Find top performer (best APY among quality validators)
    const topPerformer = trillium.findTopPerformer(allValidators, "compound_overall_apy");

    if (topPerformer) {
      console.log(`[Cron] Top performer: ${topPerformer.identity_pubkey} with APY ${topPerformer.compound_overall_apy}`);
      details.topPerformer = {
        pubkey: topPerformer.identity_pubkey,
        apy: topPerformer.compound_overall_apy,
        name: topPerformer.name,
      };

      try {
        await upsertBenchmark({
          benchmarkId: BENCHMARKS.SHINOBI_TOP,
          benchmarkLabel: "Top Performer",
          pubkey: topPerformer.identity_pubkey,
          epoch,
          data: topPerformer,
        });
        upserted++;
      } catch (err) {
        console.error("[Cron] Failed to upsert top performer:", err);
        details.topPerformerError = err instanceof Error ? err.message : String(err);
      }
    } else {
      console.warn("[Cron] No top performer found! Checking filter...");
      const active = allValidators.filter((v) => v.active_stake > 1000);
      const lowSkip = active.filter((v) => v.skip_rate < 20);
      const lowComm = lowSkip.filter((v) => v.commission <= 10);
      console.log(`[Cron] Filter: ${allValidators.length} total → ${active.length} active stake > 1000 → ${lowSkip.length} skip < 20 → ${lowComm.length} commission <= 10`);
      details.filterDebug = {
        total: allValidators.length,
        activeStakeGt1000: active.length,
        skipRateLt20: lowSkip.length,
        commissionLte10: lowComm.length,
      };
    }

    // 2. Calculate network averages
    const avgData = trillium.calculateNetworkAverages(allValidators);
    console.log("[Cron] Network avg APY:", avgData.compound_overall_apy);
    details.networkAvg = { apy: avgData.compound_overall_apy };

    try {
      await upsertBenchmark({
        benchmarkId: BENCHMARKS.NETWORK_AVG,
        benchmarkLabel: "Network Average",
        pubkey: null,
        epoch,
        data: { ...avgData, epoch },
      });
      upserted++;
    } catch (err) {
      console.error("[Cron] Failed to upsert network avg:", err);
      details.networkAvgError = err instanceof Error ? err.message : String(err);
    }

    console.log(`[Cron] Benchmarks: ${upserted} upserted for epoch ${epoch}`);

    return NextResponse.json({
      success: true,
      epoch,
      totalValidators: allValidators.length,
      upserted,
      details,
    });
  } catch (error) {
    console.error("[Cron] Error fetching benchmarks:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

async function upsertBenchmark(params: {
  benchmarkId: string;
  benchmarkLabel: string;
  pubkey: string | null;
  epoch: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
}) {
  const { benchmarkId, benchmarkLabel, pubkey, epoch, data } = params;

  const record = {
    benchmarkId,
    benchmarkLabel,
    pubkey,
    epoch,
    epochCredits: data.epoch_credits != null ? String(data.epoch_credits) : null,
    votesCast: safeInt(data.votes_cast),
    skipRate: data.skip_rate != null ? String(data.skip_rate) : null,
    leaderSlots: safeInt(data.leader_slots),
    compoundOverallApy: data.compound_overall_apy != null ? String(data.compound_overall_apy) : null,
    totalInflationApy: data.total_inflation_apy != null ? String(data.total_inflation_apy) : null,
    totalMevApy: data.total_mev_apy != null ? String(data.total_mev_apy) : null,
    rewards: data.rewards != null ? String(data.rewards) : null,
    mevEarned: data.mev_earned != null ? String(data.mev_earned) : null,
    avgSlotDurationMs: data.avg_slot_duration_ms != null ? String(data.avg_slot_duration_ms) : null,
    activeStake: data.activated_stake != null ? String(data.activated_stake) : (data.active_stake != null ? String(data.active_stake) : null),
    jip25Rank: safeInt(data.jip25_rank),
    rawData: data,
  };

  const existing = await db
    .select({ id: benchmarkEpochs.id })
    .from(benchmarkEpochs)
    .where(
      and(
        eq(benchmarkEpochs.benchmarkId, benchmarkId),
        eq(benchmarkEpochs.epoch, epoch)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(benchmarkEpochs)
      .set(record)
      .where(eq(benchmarkEpochs.id, existing[0].id));
  } else {
    await db.insert(benchmarkEpochs).values(record);
  }
}

function safeInt(value: unknown): number | null {
  if (value == null) return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  if (n > 2147483647 || n < -2147483648) return null;
  return Math.round(n);
}