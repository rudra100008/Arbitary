import { NextResponse } from "next/server";
import { db } from "@/src/db";
import { usersTable } from "@/src/db/schema";
import { eq } from "drizzle-orm";
import { requireUser } from "@/src/services/auth.service";
import { FeatureFlagService } from "@/src/services/feature-flag.service";

export async function POST() {
  const auth = await requireUser();
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const facebookEnabled = await FeatureFlagService.isPlatformEnabled("facebook");
  if (!facebookEnabled) {
    return NextResponse.json(
      { error: "Facebook is temporarily unavailable.", code: "FEATURE_DISABLED" },
      { status: 403 },
    );
  }

  await db
    .update(usersTable)
    .set({ facebookId: null })
    .where(eq(usersTable.id, auth.data.id));

  return NextResponse.json({ success: true });
}
