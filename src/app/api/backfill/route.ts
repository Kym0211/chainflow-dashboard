import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { validatorEpochs, benchmarkEpochs } from "@/lib/db/schema";
import { trillium } from "@/lib/trillium/client";
import { CHAINFLOW_PUBKEY, BENCHMARKS } from "@/lib/constants";
import { eq, and } from "drizzle-orm";

export const maxDuration = 300; // 5 minutes max for backfill batches

/**
 * Backfill historical epoch data from Trillium API.
 *
 * Query params:
 *   from_epoch  – Start epoch (default: 67, Chainflow's first epoch)
 *   to_epoch    – End epoch (default: latest in DB)
 *   batch_size  – Epochs per call (default: 10, max: 50)
 *   benchmarks  – Also backfill benchmark data (default: true)
 *
 * Call repeatedly to backfill incrementally. Already-fetched epochs are skipped.
 *
 * Example:
 *   /api/backfill?from_epoch=67&to_epoch=937&batch_size=10
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const fromEpoch = parseInt(url.searchParams.get("from_epoch") || "67");
  const toEpoch = parseInt(url.searchParams.get("to_epoch") || "937");
  const batchSize = Math.min(parseInt(url.searchParams.get("batch_size") || "10"), 50);
  const withBenchmarks = url.searchParams.get("benchmarks") !== "false";

  try {
    console.log(`[Backfill] Starting: epochs ${fromEpoch}–${toEpoch}, batch=${batchSize}`);

    // Find which epochs we already have
    const existingRows = await db
      .select({ epoch: validatorEpochs.epoch })
      .from(validatorEpochs)
      .where(eq(validatorEpochs.pubkey, CHAINFLOW_PUBKEY));

    const existingEpochs = new Set(existingRows.map((r) => r.epoch));

    // Build list of missing epochs
    const missingEpochs: number[] = [];
    for (let e = fromEpoch; e <= toEpoch; e++) {
      if (!existingEpochs.has(e)) {
        missingEpochs.push(e);
      }
    }

    if (missingEpochs.length === 0) {
      return NextResponse.json({
        success: true,
        message: "All epochs already backfilled",
        range: { from: fromEpoch, to: toEpoch },
        existingCount: existingEpochs.size,
      });
    }

    // Take only the batch
    const batch = missingEpochs.slice(0, batchSize);
    console.log(`[Backfill] ${missingEpochs.length} epochs missing, processing batch of ${batch.length}: [${batch.join(", ")}]`);

    let inserted = 0;
    let benchmarksInserted = 0;
    const errors: string[] = [];
    const skipped: number[] = [];

    for (const epoch of batch) {
      try {
        console.log(`[Backfill] Fetching epoch ${epoch}...`);

        // Fetch ALL validators for this epoch
        const allValidators = await trillium.getEpochValidators(epoch);

        if (!allValidators || allValidators.length === 0) {
          console.warn(`[Backfill] No data for epoch ${epoch}`);
          skipped.push(epoch);
          continue;
        }

        // Find Chainflow in the list
        const chainflow = allValidators.find(
          (v) => v.identity_pubkey === CHAINFLOW_PUBKEY
        );

        if (!chainflow) {
          console.warn(`[Backfill] Chainflow not found in epoch ${epoch} (${allValidators.length} validators)`);
          skipped.push(epoch);
          continue;
        }

        // Insert Chainflow data
        await upsertValidatorEpoch(chainflow);
        inserted++;

        // Optionally backfill benchmarks
        if (withBenchmarks) {
          try {
            const topPerformer = trillium.findTopPerformer(allValidators, "compound_overall_apy");
            if (topPerformer) {
              await upsertBenchmark({
                benchmarkId: BENCHMARKS.SHINOBI_TOP,
                benchmarkLabel: "Top Performer",
                pubkey: topPerformer.identity_pubkey,
                epoch,
                data: topPerformer,
              });
              benchmarksInserted++;
            }

            const avgData = trillium.calculateNetworkAverages(allValidators);
            await upsertBenchmark({
              benchmarkId: BENCHMARKS.NETWORK_AVG,
              benchmarkLabel: "Network Average",
              pubkey: null,
              epoch,
              data: { ...avgData, epoch },
            });
            benchmarksInserted++;
          } catch (benchErr) {
            console.error(`[Backfill] Benchmark error for epoch ${epoch}:`, benchErr);
          }
        }

        // Rate limit: wait 1.5s between epoch fetches to be nice to Trillium
        if (batch.indexOf(epoch) < batch.length - 1) {
          await new Promise((r) => setTimeout(r, 1500));
        }
      } catch (epochErr) {
        const msg = epochErr instanceof Error ? epochErr.message : String(epochErr);
        console.error(`[Backfill] Error on epoch ${epoch}: ${msg}`);
        errors.push(`Epoch ${epoch}: ${msg}`);

        // If we get a 404/429, wait longer
        if (msg.includes("429") || msg.includes("rate")) {
          console.log("[Backfill] Rate limited, waiting 10s...");
          await new Promise((r) => setTimeout(r, 10000));
        }
      }
    }

    const remaining = missingEpochs.length - batch.length;

    console.log(`[Backfill] Done: ${inserted} inserted, ${skipped.length} skipped, ${errors.length} errors, ${remaining} remaining`);

    return NextResponse.json({
      success: true,
      range: { from: fromEpoch, to: toEpoch },
      batch: { size: batch.length, epochs: batch },
      results: {
        inserted,
        benchmarksInserted,
        skipped,
        errors: errors.length > 0 ? errors : undefined,
      },
      progress: {
        totalMissing: missingEpochs.length,
        processedThisBatch: batch.length,
        remaining,
        existingInDb: existingEpochs.size,
        nextCall: remaining > 0
          ? `/api/backfill?from_epoch=${fromEpoch}&to_epoch=${toEpoch}&batch_size=${batchSize}`
          : null,
      },
    });
  } catch (error) {
    console.error("[Backfill] Fatal error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function upsertValidatorEpoch(raw: any) {
  const row = {
    pubkey: raw.identity_pubkey,
    epoch: raw.epoch,
    epochCredits: safeStr(raw.epoch_credits),
    votesCast: safeInt(raw.votes_cast),
    skipRate: safeStr(raw.skip_rate),
    leaderSlots: safeInt(raw.leader_slots),
    signatures: safeInt(raw.signatures),
    jip25Rank: safeInt(raw.jip25_rank),
    jitoOverallRank: safeInt(raw.jito_overall_rank),
    compoundOverallApy: safeStr(raw.compound_overall_apy),
    totalInflationApy: safeStr(raw.total_inflation_apy),
    totalMevApy: safeStr(raw.total_mev_apy),
    delegatorBlockRewardsApy: safeStr(raw.delegator_block_rewards_apy),
    delegatorCompoundBlockRewardsApy: safeStr(raw.delegator_compound_block_rewards_apy),
    totalCompoundInflationApy: safeStr(raw.total_compound_inflation_apy),
    totalCompoundMevApy: safeStr(raw.total_compound_mev_apy),
    rewards: safeStr(raw.rewards),
    mevEarned: safeStr(raw.mev_earned),
    mevToValidator: safeStr(raw.mev_to_validator),
    mevToStakers: safeStr(raw.mev_to_stakers),
    voteCost: safeStr(raw.vote_cost),
    totalBlockRewardsBeforeBurn: safeStr(raw.total_block_rewards_before_burn),
    totalBlockRewardsAfterBurn: safeStr(raw.total_block_rewards_after_burn),
    validatorSignatureFees: safeStr(raw.validator_signature_fees),
    validatorPriorityFees: safeStr(raw.validator_priority_fees),
    priorityFeeCommission: safeStr(raw.priority_fee_commission),
    priorityFeeTips: safeStr(raw.priority_fee_tips),
    totalPriorityFees: safeStr(raw.total_priority_fees),
    delegatorPriorityFees: safeStr(raw.delegator_priority_fees),
    activeStake: safeStr(raw.activated_stake ?? raw.active_stake),
    stakePercentage: safeStr(raw.stake_percentage),
    avgSlotDurationMs: safeStr(raw.avg_slot_duration_ms),
    medianSlotDurationMs: safeStr(raw.median_slot_duration_ms),
    commission: safeInt(raw.commission),
    mevCommission: safeInt(raw.mev_commission),
    clientType: raw.client_type ?? null,
    version: raw.version ?? null,
    fdSchedulerMode: raw.fd_scheduler_mode ?? null,
    totalFromStakePools: safeStr(raw.total_from_stake_pools),
    totalNotFromStakePools: safeStr(raw.total_not_from_stake_pools),
    isDz: raw.is_dz ?? null,
    isSfdp: raw.is_sfdp ?? null,
    ibrlScore: safeStr(raw.ibrl_score),
    rawData: raw,
  };

  const existing = await db
    .select({ id: validatorEpochs.id })
    .from(validatorEpochs)
    .where(
      and(
        eq(validatorEpochs.pubkey, raw.identity_pubkey),
        eq(validatorEpochs.epoch, raw.epoch)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(validatorEpochs)
      .set({ ...row, updatedAt: new Date() })
      .where(eq(validatorEpochs.id, existing[0].id));
  } else {
    await db.insert(validatorEpochs).values(row);
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

function safeStr(value: unknown): string | null {
  if (value == null) return null;
  return String(value);
}

function safeInt(value: unknown): number | null {
  if (value == null) return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  if (n > 2147483647 || n < -2147483648) return null;
  return Math.round(n);
}