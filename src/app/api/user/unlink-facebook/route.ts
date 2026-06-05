import { NextResponse } from "next/server";
import { db } from "@/src/db";
import { usersTable } from "@/src/db/schema";
import { eq } from "drizzle-orm";
import { requireUser } from "@/src/services/auth.service";

export async function POST() {
  const auth = await requireUser();
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  await db
    .update(usersTable)
    .set({ facebookId: null })
    .where(eq(usersTable.id, auth.data.id));

  return NextResponse.json({ success: true });
}
