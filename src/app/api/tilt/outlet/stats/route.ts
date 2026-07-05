import { and, count, eq, isNotNull, sql, gte, lt } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { tiltDb } from "@/src/db/tilt-db";
import { qrTokensTable, lotterySessionsTable, instantRewardsTable } from "@/src/db/tilt-schema";
import { getOutletDailyRewardTarget } from "@/src/lib/tilt/reward-target";
import { getRewardWindow } from "@/src/lib/tilt/reward-window";
import { requireTiltOutlet } from "@/src/lib/tilt/require-outlet";

export const revalidate = 60;

export async function GET(req: NextRequest) {
  try {
    const auth = await requireTiltOutlet(req);
    if (!auth.ok) return auth.response;
    const { outletId } = auth;

    const [scanResult] = await tiltDb
      .select({ count: count() })
      .from(qrTokensTable)
      .where(
        and(
          eq(qrTokensTable.outletId, outletId),
          isNotNull(qrTokensTable.usedAt),
        ),
      );

    const [submissionResult] = await tiltDb
      .select({ count: count() })
      .from(qrTokensTable)
      .innerJoin(
        lotterySessionsTable,
        eq(lotterySessionsTable.tokenId, qrTokensTable.id),
      )
      .where(
        and(
          eq(qrTokensTable.outletId, outletId),
          isNotNull(lotterySessionsTable.submittedAt),
        ),
      );

    const { start, end } = getRewardWindow();
    const [rewardResult] = await tiltDb
      .select({ total: count() })
      .from(instantRewardsTable)
      .where(
        and(
          eq(instantRewardsTable.outletId, outletId),
          gte(instantRewardsTable.claimedAt, start),
          lt(instantRewardsTable.claimedAt, end),
        ),
      );

    const rewardTarget = await getOutletDailyRewardTarget(outletId);

    return NextResponse.json(
      {
        scans: Number(scanResult?.count ?? 0),
        submissions: Number(submissionResult?.count ?? 0),
        rewardsToday: Number(rewardResult?.total ?? 0),
        rewardTarget,
      },
      { status: 200 },
    );
  } catch {
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 },
    );
  }
}
