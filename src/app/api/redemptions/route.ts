import { NextResponse } from "next/server";
import { db } from "@/src/db";
import { redemptionsTable, dealsTable } from "@/src/db/schema";
import { eq, desc } from "drizzle-orm";
import { requireUser } from "@/src/services/auth.service";
import { SecurityService } from "@/src/services/security.service";

export async function GET() {
  const auth = await requireUser();
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  const redemptions = await db
    .select({
      id: redemptionsTable.id,
      pointsSpent: redemptionsTable.pointsSpent,
      status: redemptionsTable.status,
      revealedCode: redemptionsTable.revealedCode,
      createdAt: redemptionsTable.createdAt,
      dealTitle: dealsTable.title,
    })
    .from(redemptionsTable)
    .leftJoin(dealsTable, eq(redemptionsTable.dealId, dealsTable.id))
    .where(eq(redemptionsTable.userId, auth.data.id))
    .orderBy(desc(redemptionsTable.createdAt));

  const mapped = redemptions.map((r) => ({
    ...r,
    revealedCode: SecurityService.decrypt(r.revealedCode),
  }));

  return NextResponse.json(mapped);
}
