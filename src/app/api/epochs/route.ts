import { NextRequest, NextResponse } from "next/server";
import { trillium } from "@/lib/trillium/client";

/**
 * Proxy to Trillium epoch_data endpoint
 * Used for current epoch info and network-level stats
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const epoch = url.searchParams.get("epoch");

  try {
    if (epoch) {
      const data = await trillium.getEpochDataByNumber(parseInt(epoch));
      return NextResponse.json(data);
    }

    // Return last 10 epochs
    const data = await trillium.getEpochData();
    return NextResponse.json(data);
  } catch (error) {
    console.error("[API] Error fetching epoch data:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
