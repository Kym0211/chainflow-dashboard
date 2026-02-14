import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { benchmarkEpochs } from "@/lib/db/schema";
import { trillium } from "@/lib/trillium/client";
import { BENCHMARKS } from "@/lib/constants";
import { eq, and } from "drizzle-orm";

export const runtime = "edge";
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

    // 1. Find top performer (best APY among quality validators)
    const topPerformer = trillium.findTopPerformer(allValidators, "compound_overall_apy");

    if (topPerformer) {
      await upsertBenchmark({
        benchmarkId: BENCHMARKS.SHINOBI_TOP,
        benchmarkLabel: "Top Performer",
        pubkey: topPerformer.identity_pubkey,
        epoch,
        data: topPerformer,
      });
      upserted++;
    }

    // 2. Calculate network averages
    const avgData = trillium.calculateNetworkAverages(allValidators);

    await upsertBenchmark({
      benchmarkId: BENCHMARKS.NETWORK_AVG,
      benchmarkLabel: "Network Average",
      pubkey: null,
      epoch,
      data: avgData,
    });
    upserted++;

    console.log(`[Cron] Benchmarks: ${upserted} upserted for epoch ${epoch}`);

    return NextResponse.json({
      success: true,
      epoch,
      totalValidators: allValidators.length,
      topPerformer: topPerformer?.identity_pubkey,
      upserted,
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
  data: Partial<import("@/lib/trillium/types").TrilliumValidatorReward>;
}) {
  const { benchmarkId, benchmarkLabel, pubkey, epoch, data } = params;

  const record = {
    benchmarkId,
    benchmarkLabel,
    pubkey,
    epoch,
    epochCredits: data.epoch_credits != null ? String(data.epoch_credits) : null,
    votesCast: data.votes_cast ?? null,
    skipRate: data.skip_rate != null ? String(data.skip_rate) : null,
    leaderSlots: data.leader_slots ?? null,
    compoundOverallApy: data.compound_overall_apy != null ? String(data.compound_overall_apy) : null,
    totalInflationApy: data.total_inflation_apy != null ? String(data.total_inflation_apy) : null,
    totalMevApy: data.total_mev_apy != null ? String(data.total_mev_apy) : null,
    rewards: data.rewards != null ? String(data.rewards) : null,
    mevEarned: data.mev_earned != null ? String(data.mev_earned) : null,
    activeStake: data.active_stake != null ? String(data.active_stake) : null,
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
