import { NextRequest, NextResponse } from "next/server";
import { trillium } from "@/lib/trillium/client";

export async function GET(request: NextRequest) {
  const pubkey = request.nextUrl.searchParams.get("pubkey");

  if (!pubkey) {
    return NextResponse.json({ error: "pubkey required" }, { status: 400 });
  }

  try {
    const rewards = await trillium.getValidatorRewards(pubkey);

    if (!rewards || !rewards.length) {
      return NextResponse.json({ error: "No data found for this validator" }, { status: 404 });
    }

    // Return a simplified format for comparison
    const data = rewards
      .sort((a, b) => a.epoch - b.epoch)
      .map((r) => ({
        epoch: r.epoch,
        pubkey: r.identity_pubkey,
        name: r.name || null,
        compoundOverallApy: r.compound_overall_apy,
        totalInflationApy: r.total_inflation_apy,
        totalMevApy: r.total_mev_apy,
        epochCredits: r.epoch_credits,
        skipRate: r.skip_rate,
        mevEarned: r.mev_earned,
        activeStake: r.activated_stake ?? r.active_stake,
        avgSlotDurationMs: r.avg_slot_duration_ms,
        meanVoteLatency: r.mean_vote_latency,
        avgCuPerBlock: r.avg_cu_per_block,
        rewards: r.rewards,
        voteCost: r.vote_cost,
        jip25Rank: r.jip25_rank,
        voteCreditsRank: r.vote_credits_rank,
      }));

    return NextResponse.json({
      pubkey: rewards[0].identity_pubkey,
      name: rewards[0].name || null,
      data,
    });
  } catch (error) {
    console.error("[Compare] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Fetch failed" },
      { status: 500 }
    );
  }
}