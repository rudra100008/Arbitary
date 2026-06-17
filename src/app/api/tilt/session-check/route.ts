import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { tiltDb } from "@/src/db/tilt-db";
import { lotterySessionsTable } from "@/src/db/tilt-schema";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const sid = req.nextUrl.searchParams.get("sid")?.trim();

    if (!sid) {
      return NextResponse.json({ valid: false }, { status: 200 });
    }

    const [session] = await tiltDb
      .select({
        id: lotterySessionsTable.id,
        submittedAt: lotterySessionsTable.submittedAt,
        createdAt: lotterySessionsTable.createdAt,
      })
      .from(lotterySessionsTable)
      .where(eq(lotterySessionsTable.id, sid));

    if (!session) {
      return NextResponse.json({ valid: false }, { status: 200 });
    }

    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

    const isExpiredWithoutSubmit =
      session.submittedAt === null && session.createdAt < thirtyMinutesAgo;

    if (isExpiredWithoutSubmit) {
      return NextResponse.json({ valid: false }, { status: 200 });
    }

    return NextResponse.json(
      { valid: true, submitted: session.submittedAt !== null },
      { status: 200 },
    );
  } catch (error) {
    console.error("[tilt/session-check]", error);
    return NextResponse.json({ valid: false }, { status: 200 });
  }
}
