import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { validatorEpochs } from "@/lib/db/schema";
import { trillium } from "@/lib/trillium/client";
import { CHAINFLOW_PUBKEY } from "@/lib/constants";
import { eq, and } from "drizzle-orm";

export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    console.log("[Cron] Fetching Trillium data for Chainflow...");

    const rewards = await trillium.getValidatorRewards(CHAINFLOW_PUBKEY);

    if (!rewards || !rewards.length) {
      return NextResponse.json({ error: "No data returned from Trillium" }, { status: 500 });
    }

    console.log(`[Cron] Got ${rewards.length} epochs from Trillium`);

    let inserted = 0;
    let updated = 0;
    const errors: string[] = [];

    for (const raw of rewards) {
      try {
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

        // All numeric DB columns get String(), all integer columns get safeInt()
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

        if (existing.length > 0) {
          await db
            .update(validatorEpochs)
            .set({ ...row, updatedAt: new Date() })
            .where(eq(validatorEpochs.id, existing[0].id));
          updated++;
        } else {
          await db.insert(validatorEpochs).values(row);
          inserted++;
        }
      } catch (rowError) {
        const msg = rowError instanceof Error ? rowError.message : String(rowError);
        console.error(`[Cron] Error on epoch ${raw.epoch}: ${msg}`);
        errors.push(`Epoch ${raw.epoch}: ${msg}`);
      }
    }

    console.log(`[Cron] Done: ${inserted} inserted, ${updated} updated, ${errors.length} errors`);

    return NextResponse.json({
      success: true,
      pubkey: CHAINFLOW_PUBKEY,
      epochs: rewards.map((r) => r.epoch),
      inserted,
      updated,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("[Cron] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

/** Convert any value to string for numeric columns */
function safeStr(value: unknown): string | null {
  if (value == null) return null;
  return String(value);
}

/** Safely convert to integer, returning null if it overflows int32 */
function safeInt(value: unknown): number | null {
  if (value == null) return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  if (n > 2147483647 || n < -2147483648) return null;
  return Math.round(n);
}