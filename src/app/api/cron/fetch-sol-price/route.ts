import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { solPrices } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const runtime = "edge";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Fetch current SOL price from CoinGecko
    const res = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd",
      { next: { revalidate: 300 } }
    );

    if (!res.ok) {
      throw new Error(`CoinGecko API error: ${res.status}`);
    }

    const data = await res.json();
    const priceUsd = data?.solana?.usd;

    if (!priceUsd) {
      throw new Error("Could not parse SOL price from CoinGecko");
    }

    // We need to figure out the current epoch from Trillium
    const epochRes = await fetch("https://api.trillium.so/epoch_data/", {
      next: { revalidate: 3600 },
    });
    const epochData = await epochRes.json();
    const currentEpoch = Array.isArray(epochData) ? epochData[0]?.epoch : epochData?.epoch;

    if (!currentEpoch) {
      throw new Error("Could not determine current epoch");
    }

    // Upsert price
    const existing = await db
      .select({ id: solPrices.id })
      .from(solPrices)
      .where(eq(solPrices.epoch, currentEpoch))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(solPrices)
        .set({ priceUsd: String(priceUsd), fetchedAt: new Date() })
        .where(eq(solPrices.id, existing[0].id));
    } else {
      await db.insert(solPrices).values({
        epoch: currentEpoch,
        priceUsd: String(priceUsd),
      });
    }

    return NextResponse.json({
      success: true,
      epoch: currentEpoch,
      priceUsd,
    });
  } catch (error) {
    console.error("[Cron] Error fetching SOL price:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
