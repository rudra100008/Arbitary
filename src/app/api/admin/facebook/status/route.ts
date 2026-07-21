import { NextResponse } from "next/server";
import { requireAdmin } from "@/src/services/auth.service";
import { db } from "@/src/db";
import { usersTable } from "@/src/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const [user] = await db
    .select({
      fbPageId: usersTable.fbPageId,
      fbPageName: usersTable.fbPageName,
      fbConnectedAt: usersTable.fbConnectedAt,
      fbDataAccessExpiresAt: usersTable.fbDataAccessExpiresAt,
    })
    .from(usersTable)
    .where(eq(usersTable.id, auth.data.id))
    .limit(1);

  if (!user || !user.fbPageId) {
    return NextResponse.json({
      connected: false,
      pageName: null,
      connectedAt: null,
      daysUntilDataAccessExpires: null,
    });
  }

  let daysUntilDataAccessExpires: number | null = null;
  if (user.fbDataAccessExpiresAt) {
    const msLeft =
      user.fbDataAccessExpiresAt.getTime() - Date.now();
    daysUntilDataAccessExpires = Math.max(0, Math.ceil(msLeft / 86_400_000));
  }

  return NextResponse.json({
    connected: true,
    pageName: user.fbPageName,
    connectedAt: user.fbConnectedAt?.toISOString() ?? null,
    daysUntilDataAccessExpires,
  });
}
