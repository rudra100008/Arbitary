import { and, count, eq, sql } from "drizzle-orm";
import { jwtVerify } from "jose";
import { NextRequest, NextResponse } from "next/server";
import { tiltDb } from "@/src/db/tilt-db";
import { instantRewardsTable } from "@/src/db/tilt-schema";
import { DAILY_REWARD_TARGET } from "@/src/lib/tilt/reward-config";

const TILT_JWT_SECRET = new TextEncoder().encode(
  process.env.TILT_JWT_SECRET ?? "tilt-fallback-secret-change-in-production",
);

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get("tilt_token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    let payload: { id: number; role: string };
    try {
      const { payload: p } = await jwtVerify(token, TILT_JWT_SECRET);
      payload = p as typeof payload;
    } catch {
      return NextResponse.json({ error: "Session expired" }, { status: 401 });
    }

    if (payload.role !== "outlet") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const outletId = String(payload.id);

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

    return NextResponse.json({
      target: DAILY_REWARD_TARGET,
      totalAllTime: Number(grandTotal ?? 0),
      daily: dailyRows.map((r) => ({ date: r.day, count: Number(r.total) })),
    });
  } catch {
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
