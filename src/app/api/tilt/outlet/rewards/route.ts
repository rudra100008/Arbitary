import { and, count, eq, sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { tiltDb } from "@/src/db/tilt-db";
import { instantRewardsTable } from "@/src/db/tilt-schema";
import { getOutletDailyRewardTarget } from "@/src/lib/tilt/reward-target";
import { requireTiltOutlet } from "@/src/lib/tilt/require-outlet";

export const revalidate = 60;

export async function GET(req: NextRequest) {
  try {
    const auth = await requireTiltOutlet(req);
    if (!auth.ok) return auth.response;
    const { outletId } = auth;

    const dailyRows = await tiltDb
      .select({
        day: sql<string>`DATE_TRUNC('day', ${instantRewardsTable.claimedAt})::date`.as("day"),
        total: count(),
      })
      .from(instantRewardsTable)
      .where(eq(instantRewardsTable.outletId, outletId))
      .groupBy(sql`DATE_TRUNC('day', ${instantRewardsTable.claimedAt})`)
      .orderBy(sql`DATE_TRUNC('day', ${instantRewardsTable.claimedAt}) DESC`);

    const [{ grandTotal }] = await tiltDb
      .select({ grandTotal: count() })
      .from(instantRewardsTable)
      .where(eq(instantRewardsTable.outletId, outletId));

    const rewardTarget = await getOutletDailyRewardTarget(outletId);

    return NextResponse.json({
      target: rewardTarget,
      totalAllTime: Number(grandTotal ?? 0),
      daily: dailyRows.map((r) => ({ date: r.day, count: Number(r.total) })),
    });
  } catch {
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
