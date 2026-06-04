import { NextRequest, NextResponse } from "next/server";
import { db } from "@/src/db";
import { dealsTable, dealCodesTable } from "@/src/db/schema";
import { eq, desc, sql, and } from "drizzle-orm";
import { requireAdmin } from "@/src/services/auth.service";
import { SecurityService } from "@/src/services/security.service";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

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
      isActive: dealsTable.isActive,
      createdAt: dealsTable.createdAt,
      totalCodes: sql<number>`(SELECT COUNT(*)::int FROM ${dealCodesTable} WHERE ${dealCodesTable.dealId} = ${dealsTable.id})`,
      availableCodes: sql<number>`(SELECT COUNT(*)::int FROM ${dealCodesTable} WHERE ${dealCodesTable.dealId} = ${dealsTable.id} AND ${dealCodesTable.isRedeemed} = false)`,
      redeemedCodes: sql<number>`(SELECT COUNT(*)::int FROM ${dealCodesTable} WHERE ${dealCodesTable.dealId} = ${dealsTable.id} AND ${dealCodesTable.isRedeemed} = true)`,
    })
    .from(dealsTable)
    .orderBy(desc(dealsTable.createdAt));

  return NextResponse.json(deals);
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = await req.json();
  const { title, description, pointsCost, discountType, discountValue, discountMaxAmount, imageUrl, stock, codes } = body;

  if (!title || !description || !pointsCost) {
    return NextResponse.json({ error: "Title, description, and pointsCost are required" }, { status: 400 });
  }

  if (!codes || !Array.isArray(codes) || codes.length === 0) {
    return NextResponse.json({ error: "At least one deal code is required" }, { status: 400 });
  }

  const result = await db.transaction(async (tx) => {
    const [deal] = await tx
      .insert(dealsTable)
      .values({
        title,
        description,
        pointsCost: Number(pointsCost),
        discountType: discountType || "percent",
        discountValue: discountValue ? Number(discountValue) : 0,
        discountMaxAmount: discountMaxAmount ? Number(discountMaxAmount) : null,
        imageUrl: imageUrl || null,
        stock: stock ? Number(stock) : null,
      })
      .returning();

    const encryptedCodes = codes.map((code: string) => ({
      dealId: deal.id,
      code: SecurityService.encrypt(code),
    }));

    await tx.insert(dealCodesTable).values(encryptedCodes);

    return deal;
  });

  return NextResponse.json(result, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = await req.json();
  const { id, title, description, pointsCost, discountType, discountValue, discountMaxAmount, imageUrl, stock, isActive, newCodes } = body;

  if (!id) {
    return NextResponse.json({ error: "Deal ID is required" }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  if (title !== undefined) updates.title = title;
  if (description !== undefined) updates.description = description;
  if (pointsCost !== undefined) updates.pointsCost = Number(pointsCost);
  if (discountType !== undefined) updates.discountType = discountType;
  if (discountValue !== undefined) updates.discountValue = Number(discountValue);
  if (discountMaxAmount !== undefined) updates.discountMaxAmount = discountMaxAmount ? Number(discountMaxAmount) : null;
  if (imageUrl !== undefined) updates.imageUrl = imageUrl;
  if (stock !== undefined) updates.stock = stock ? Number(stock) : null;
  if (isActive !== undefined) updates.isActive = isActive;

  if (Object.keys(updates).length > 0) {
    await db.update(dealsTable).set(updates).where(eq(dealsTable.id, Number(id)));
  }

  if (newCodes && Array.isArray(newCodes) && newCodes.length > 0) {
    const encryptedCodes = newCodes.map((code: string) => ({
      dealId: Number(id),
      code: SecurityService.encrypt(code),
    }));
    await db.insert(dealCodesTable).values(encryptedCodes);

    if (stock !== undefined) {
      await db
        .update(dealsTable)
        .set({ stock: sql`${dealsTable.stock} + ${encryptedCodes.length}` })
        .where(eq(dealsTable.id, Number(id)));
    }
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Deal ID is required" }, { status: 400 });
  }

  await db
    .update(dealsTable)
    .set({ isActive: false })
    .where(eq(dealsTable.id, Number(id)));

  return NextResponse.json({ success: true });
}
