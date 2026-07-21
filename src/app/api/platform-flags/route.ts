import { NextResponse } from "next/server";
import { FeatureFlagService } from "@/src/services/feature-flag.service";
import { db } from "@/src/db";
import { usersTable } from "@/src/db/schema";
import { isNotNull } from "drizzle-orm";

export const revalidate = 0;

// Public — read by login/signup/settings/task UI (via usePlatformFlags) to
// decide whether to show/enable Facebook & Instagram entry points. No auth
// required, same as /api/live/status; the actual enforcement lives
// server-side (auth.ts callback + gated routes/services), this endpoint is
// purely for the UI to react instantly without a redeploy.
export async function GET() {
  const result = await FeatureFlagService.getFlags();
  if (!result.success) {
    // Fail open for toggles — never let a flags outage block the whole login/task UI.
    // Fail closed for connection status — hiding a task is worse than showing one that won't verify.
    return NextResponse.json({ facebook: true, instagram: true, facebookConnected: false }, { status: 200 });
  }

  // Determine real Facebook connection status:
  // 1) Any admin row with a non-null fbPageId means an admin connected a Page via OAuth.
  // 2) Legacy env var fallback (FACEBOOK_PAGE_ID + FACEBOOK_PAGE_ACCESS_TOKEN).
  let facebookConnected = false;
  try {
    const [row] = await db
      .select({ fbPageId: usersTable.fbPageId })
      .from(usersTable)
      .where(isNotNull(usersTable.fbPageId))
      .limit(1);

    if (row?.fbPageId) {
      facebookConnected = true;
    } else if (process.env.FACEBOOK_PAGE_ID && process.env.FACEBOOK_PAGE_ACCESS_TOKEN) {
      facebookConnected = true;
    }
  } catch {
    // DB error — default to false (fail closed)
  }

  return NextResponse.json({ ...result.data, facebookConnected }, { status: 200 });
}
