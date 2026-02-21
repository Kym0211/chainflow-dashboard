import { NextRequest, NextResponse } from "next/server";
import { trillium } from "@/lib/trillium/client";

// In-memory cache for the validator list (refreshed every 30 min)
let cachedValidators: { name: string; pubkey: string; stake: number; apy: number }[] = [];
let cacheTimestamp = 0;
const CACHE_TTL = 30 * 60 * 1000;

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.toLowerCase().trim();

  if (!q || q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  try {
    if (Date.now() - cacheTimestamp > CACHE_TTL || cachedValidators.length === 0) {
      console.log("[Search] Refreshing validator cache...");
      const all = await trillium.getLatestValidatorRewards();
      cachedValidators = all
        .filter((v) => (v.activated_stake ?? v.active_stake) > 100)
        .map((v) => ({
          name: v.name || "",
          pubkey: v.identity_pubkey,
          stake: v.activated_stake ?? v.active_stake ?? 0,
          apy: v.compound_overall_apy ?? 0,
        }));
      cacheTimestamp = Date.now();
      console.log(`[Search] Cached ${cachedValidators.length} validators`);
    }

    const results = cachedValidators
      .filter(
        (v) =>
          v.name.toLowerCase().includes(q) ||
          v.pubkey.toLowerCase().includes(q)
      )
      .sort((a, b) => b.stake - a.stake)
      .slice(0, 15)
      .map((v) => ({
        name: v.name || v.pubkey.slice(0, 12) + "...",
        pubkey: v.pubkey,
        stake: v.stake,
        apy: v.apy,
      }));

    return NextResponse.json({ results });
  } catch (error) {
    console.error("[Search] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Search failed" },
      { status: 500 }
    );
  }
}