import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { validatorEpochs, benchmarkEpochs, solPrices } from "@/lib/db/schema";
import { eq, desc, and, gte, lte } from "drizzle-orm";
import { CHAINFLOW_PUBKEY, BENCHMARKS } from "@/lib/constants";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ pubkey: string }> }
) {
  const { pubkey } = await params;
  const resolvedPubkey = pubkey === "chainflow" ? CHAINFLOW_PUBKEY : pubkey;

  const url = new URL(request.url);
  const limitParam = url.searchParams.get("limit");
  const withBenchmarks = url.searchParams.get("benchmarks") !== "false";
  const fromEpoch = url.searchParams.get("from_epoch");
  const toEpoch = url.searchParams.get("to_epoch");

  // Only apply a limit if explicitly provided; epoch range queries return all matching rows
  const limit = limitParam ? parseInt(limitParam) : (fromEpoch || toEpoch ? 200 : 20);

  try {
    // Build query conditions
    const conditions = [eq(validatorEpochs.pubkey, resolvedPubkey)];
    if (fromEpoch) conditions.push(gte(validatorEpochs.epoch, parseInt(fromEpoch)));
    if (toEpoch) conditions.push(lte(validatorEpochs.epoch, parseInt(toEpoch)));

    // Fetch validator data
    const validatorData = await db
      .select()
      .from(validatorEpochs)
      .where(and(...conditions))
      .orderBy(desc(validatorEpochs.epoch))
      .limit(limit);

    // Optionally fetch benchmark data for the same epochs
    let benchmarks: Record<string, typeof benchmarkEpochs.$inferSelect[]> = {};
    let prices: typeof solPrices.$inferSelect[] = [];

    if (withBenchmarks && validatorData.length > 0) {
      const epochs = validatorData.map((d) => d.epoch);
      const minEpoch = Math.min(...epochs);
      const maxEpoch = Math.max(...epochs);

      // Fetch benchmarks
      const shinobiTop = await db
        .select()
        .from(benchmarkEpochs)
        .where(
          and(
            eq(benchmarkEpochs.benchmarkId, BENCHMARKS.SHINOBI_TOP),
            gte(benchmarkEpochs.epoch, minEpoch),
            lte(benchmarkEpochs.epoch, maxEpoch)
          )
        )
        .orderBy(desc(benchmarkEpochs.epoch));

      const networkAvg = await db
        .select()
        .from(benchmarkEpochs)
        .where(
          and(
            eq(benchmarkEpochs.benchmarkId, BENCHMARKS.NETWORK_AVG),
            gte(benchmarkEpochs.epoch, minEpoch),
            lte(benchmarkEpochs.epoch, maxEpoch)
          )
        )
        .orderBy(desc(benchmarkEpochs.epoch));

      benchmarks = {
        [BENCHMARKS.SHINOBI_TOP]: shinobiTop,
        [BENCHMARKS.NETWORK_AVG]: networkAvg,
      };

      // Fetch SOL prices
      prices = await db
        .select()
        .from(solPrices)
        .where(
          and(gte(solPrices.epoch, minEpoch), lte(solPrices.epoch, maxEpoch))
        )
        .orderBy(desc(solPrices.epoch));
    }

    return NextResponse.json({
      pubkey: resolvedPubkey,
      data: validatorData,
      benchmarks,
      prices,
      count: validatorData.length,
    });
  } catch (error) {
    console.error("[API] Error fetching validator data:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}