import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { tiltDb } from "@/src/db/tilt-db";
import { qrTokensTable } from "@/src/db/tilt-schema";
import { requireTiltOutlet } from "@/src/lib/tilt/require-outlet";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireTiltOutlet(req);
    if (!auth.ok) return auth.response;

    const qrToken = req.nextUrl.searchParams.get("token")?.trim();
    if (!qrToken) {
      return NextResponse.json({ error: "Missing token" }, { status: 400 });
    }

    const [row] = await tiltDb
      .select({
        usedAt: qrTokensTable.usedAt,
        expiresAt: qrTokensTable.expiresAt,
      })
      .from(qrTokensTable)
      .where(eq(qrTokensTable.token, qrToken));

    if (!row) {
      return NextResponse.json({ status: "expired" }, { status: 200 });
    }

    if (row.usedAt) {
      return NextResponse.json({ status: "used" }, { status: 200 });
    }

    if (row.expiresAt < new Date()) {
      return NextResponse.json({ status: "expired" }, { status: 200 });
    }

    return NextResponse.json({ status: "active" }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
