import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { incomeReports } from "@/lib/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { CHAINFLOW_PUBKEY } from "@/lib/constants";

// GET - Retrieve income reports
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const pubkey = url.searchParams.get("pubkey") || CHAINFLOW_PUBKEY;
  const limit = parseInt(url.searchParams.get("limit") || "50");
  const source = url.searchParams.get("source");

  try {
    const conditions = [eq(incomeReports.pubkey, pubkey)];
    if (source) conditions.push(eq(incomeReports.source, source));

    const reports = await db
      .select()
      .from(incomeReports)
      .where(and(...conditions))
      .orderBy(desc(incomeReports.epoch))
      .limit(limit);

    return NextResponse.json({ data: reports, count: reports.length });
  } catch (error) {
    console.error("[API] Error fetching income reports:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// POST - Upload parsed CSV data
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { source, records, pubkey = CHAINFLOW_PUBKEY } = body;

    if (!source || !records || !Array.isArray(records)) {
      return NextResponse.json(
        { error: "Missing required fields: source, records" },
        { status: 400 }
      );
    }

    if (!["jpool", "staking_kiwi", "manual"].includes(source)) {
      return NextResponse.json(
        { error: "Invalid source. Must be: jpool, staking_kiwi, or manual" },
        { status: 400 }
      );
    }

    let inserted = 0;
    let updated = 0;
    const errors: string[] = [];

    for (const record of records) {
      if (!record.epoch) {
        errors.push(`Missing epoch for record: ${JSON.stringify(record)}`);
        continue;
      }

      const values = {
        pubkey,
        epoch: record.epoch,
        source,
        inflationRewards: record.inflationRewards != null ? String(record.inflationRewards) : null,
        commissionEarned: record.commissionEarned != null ? String(record.commissionEarned) : null,
        mevCommission: record.mevCommission != null ? String(record.mevCommission) : null,
        blockRewards: record.blockRewards != null ? String(record.blockRewards) : null,
        priorityFeeIncome: record.priorityFeeIncome != null ? String(record.priorityFeeIncome) : null,
        totalIncome: record.totalIncome != null ? String(record.totalIncome) : null,
        voteCost: record.voteCost != null ? String(record.voteCost) : null,
        serverCost: record.serverCost != null ? String(record.serverCost) : null,
        netIncome: record.netIncome != null ? String(record.netIncome) : null,
        rawData: record,
      };

      try {
        // Check if exists
        const existing = await db
          .select({ id: incomeReports.id })
          .from(incomeReports)
          .where(
            and(
              eq(incomeReports.pubkey, pubkey),
              eq(incomeReports.epoch, record.epoch),
              eq(incomeReports.source, source)
            )
          )
          .limit(1);

        if (existing.length > 0) {
          await db
            .update(incomeReports)
            .set(values)
            .where(eq(incomeReports.id, existing[0].id));
          updated++;
        } else {
          await db.insert(incomeReports).values(values);
          inserted++;
        }
      } catch (err) {
        errors.push(`Error for epoch ${record.epoch}: ${err}`);
      }
    }

    return NextResponse.json({
      success: true,
      source,
      inserted,
      updated,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("[API] Error uploading income data:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
