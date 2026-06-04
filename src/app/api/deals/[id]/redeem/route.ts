import { NextRequest, NextResponse } from "next/server";
import { db } from "@/src/db";
import { dealsTable, dealCodesTable, redemptionsTable, usersTable } from "@/src/db/schema";
import { eq, sql, and } from "drizzle-orm";
import { requireUser } from "@/src/services/auth.service";
import { SecurityService } from "@/src/services/security.service";
import { rateLimit } from "@/src/lib/rate-limit";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireUser();
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  const { id } = await params;
  const dealId = Number(id);
  if (isNaN(dealId)) {
    return NextResponse.json({ error: "Invalid deal ID" }, { status: 400 });
  }

  const rl = await rateLimit(`redeem:${auth.data.id}`, 5, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: `Too many attempts. Try again in ${rl.retryAfterSeconds}s.` },
      { status: 429 },
    );
  }

  const [deal] = await db
    .select()
    .from(dealsTable)
    .where(and(eq(dealsTable.id, dealId), eq(dealsTable.isActive, true)));

  if (!deal) {
    return NextResponse.json({ error: "Deal not found" }, { status: 404 });
  }

  const result = await db.transaction(async (tx) => {
    const [user] = await tx
      .select({ points: usersTable.points, lifetimePoints: usersTable.lifetimePoints })
      .from(usersTable)
      .where(eq(usersTable.id, auth.data.id));

    if (!user) throw new Error("User not found");

    const locked = await tx.execute(
      sql`SELECT id FROM ${usersTable} WHERE id = ${auth.data.id} FOR UPDATE`,
    );

    if (!locked.rowCount || locked.rowCount === 0) throw new Error("User not found");

    if ((user.points ?? 0) < deal.pointsCost) {
      throw new Error("Insufficient points");
    }

    const availableCodes = await tx.execute(
      sql`
        SELECT id, code FROM ${dealCodesTable}
        WHERE ${dealCodesTable.dealId} = ${dealId}
        AND ${dealCodesTable.isRedeemed} = false
        LIMIT 1
        FOR UPDATE SKIP LOCKED
      `,
    );

    const availableCode = availableCodes.rows?.[0] as { id: number; code: string } | undefined;

    if (!availableCode) {
      throw new Error("No codes available");
    }

    await tx
      .update(dealCodesTable)
      .set({ isRedeemed: true, redeemedAt: new Date() })
      .where(eq(dealCodesTable.id, availableCode.id));

    const pointsSpent = deal.pointsCost;

    await tx
      .update(usersTable)
      .set({
        points: sql`${usersTable.points} - ${pointsSpent}`,
      })
      .where(eq(usersTable.id, auth.data.id));

    const decryptedCode = SecurityService.decrypt(availableCode.code);

    const [redemption] = await tx
      .insert(redemptionsTable)
      .values({
        userId: auth.data.id,
        dealId,
        pointsSpent,
        status: "fulfilled",
        revealedCode: decryptedCode ? SecurityService.encrypt(decryptedCode) : null,
      })
      .returning();

    return { code: decryptedCode, redemptionId: redemption.id };
  });

  if (result instanceof Error) {
    return NextResponse.json({ error: result.message }, { status: 400 });
  }

  return NextResponse.json({
    success: true,
    code: result.code,
    message: "Deal redeemed successfully!",
  });
}
