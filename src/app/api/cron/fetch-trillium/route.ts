import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { validatorEpochs } from "@/lib/db/schema";
import { trillium } from "@/lib/trillium/client";
import { CHAINFLOW_PUBKEY } from "@/lib/constants";
import { eq, and } from "drizzle-orm";

// Vercel Cron config - run every 6 hours
export const runtime = "edge";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    console.log("[Cron] Fetching Trillium data for Chainflow...");

    // Fetch last 10 epochs for Chainflow
    const rewards = await trillium.getValidatorRewards(CHAINFLOW_PUBKEY);

    if (!rewards || !rewards.length) {
      return NextResponse.json({ error: "No data returned from Trillium" }, { status: 500 });
    }

    let inserted = 0;
    let updated = 0;

    for (const raw of rewards) {
      const normalized = trillium.normalizeValidatorData(raw);

      // Check if we already have this epoch
      const existing = await db
        .select({ id: validatorEpochs.id })
        .from(validatorEpochs)
        .where(
          and(
            eq(validatorEpochs.pubkey, normalized.pubkey),
            eq(validatorEpochs.epoch, normalized.epoch)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        // Update existing record
        await db
          .update(validatorEpochs)
          .set({
            ...normalized,
            updatedAt: new Date(),
          })
          .where(eq(validatorEpochs.id, existing[0].id));
        updated++;
      } else {
        // Insert new record
        await db.insert(validatorEpochs).values(normalized);
        inserted++;
      }
    }

    console.log(`[Cron] Chainflow data: ${inserted} inserted, ${updated} updated`);

    return NextResponse.json({
      success: true,
      pubkey: CHAINFLOW_PUBKEY,
      epochs: rewards.map((r) => r.epoch),
      inserted,
      updated,
    });
  } catch (error) {
    console.error("[Cron] Error fetching Trillium data:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
