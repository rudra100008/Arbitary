import { NextResponse } from "next/server";
import { FeatureFlagService } from "@/src/services/feature-flag.service";

export const revalidate = 0;

// Public — read by login/signup/settings/task UI (via usePlatformFlags) to
// decide whether to show/enable Facebook & Instagram entry points. No auth
// required, same as /api/live/status; the actual enforcement lives
// server-side (auth.ts callback + gated routes/services), this endpoint is
// purely for the UI to react instantly without a redeploy.
export async function GET() {
  const result = await FeatureFlagService.getFlags();
  if (!result.success) {
    // Fail open — never let a flags outage block the whole login/task UI.
    return NextResponse.json({ facebook: true, instagram: true }, { status: 200 });
  }
  return NextResponse.json(result.data, { status: 200 });
}
