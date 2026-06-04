import { NextResponse } from "next/server";
import { db } from "@/src/db";
import { dealsTable, dealCodesTable, usersTable } from "@/src/db/schema";
import { eq, sql, and } from "drizzle-orm";
import { requireUser } from "@/src/services/auth.service";

export async function GET() {
  const auth = await requireUser();
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  const [user] = await db
    .select({ points: usersTable.points })
    .from(usersTable)
    .where(eq(usersTable.id, auth.data.id));

  const deals = await db
    .select({
      id: dealsTable.id,
      title: dealsTable.title,
      description: dealsTable.description,
      pointsCost: dealsTable.pointsCost,
      discountType: dealsTable.discountType,
      discountValue: dealsTable.discountValue,
      discountMaxAmount: dealsTable.discountMaxAmount,
      imageUrl: dealsTable.imageUrl,
      stock: dealsTable.stock,
      available: sql<number>`
        (SELECT COUNT(*)::int FROM ${dealCodesTable}
         WHERE ${dealCodesTable.dealId} = ${dealsTable.id}
         AND ${dealCodesTable.isRedeemed} = false)
      `,
    })
    .from(dealsTable)
    .where(eq(dealsTable.isActive, true))
    .orderBy(dealsTable.pointsCost);

  return NextResponse.json({
    deals,
    userPoints: user?.points ?? 0,
  });
}
