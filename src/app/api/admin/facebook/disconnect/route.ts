import { NextResponse } from "next/server";
import { requireAdmin } from "@/src/services/auth.service";
import { db } from "@/src/db";
import { usersTable } from "@/src/db/schema";
import { eq } from "drizzle-orm";

export async function POST() {
  const auth = await requireAdmin();
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  await db
    .update(usersTable)
    .set({
      fbUserAccessToken: null,
      fbUserTokenExpiresAt: null,
      fbPageId: null,
      fbPageName: null,
      fbPageAccessToken: null,
      fbIgUserId: null,
      fbIgUsername: null,
      fbConnectedAt: null,
      fbDataAccessExpiresAt: null,
    })
    .where(eq(usersTable.id, auth.data.id));

  return NextResponse.json({ success: true });
}
