import { authOptions } from "@/src/auth";
import { findCodeInComments } from "@/src/lib/facebook";
import { FeatureFlagService } from "@/src/services/feature-flag.service";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.facebookAccessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const facebookEnabled = await FeatureFlagService.isPlatformEnabled("facebook");
  if (!facebookEnabled) {
    return NextResponse.json(
      { error: "Facebook tasks are temporarily unavailable.", code: "FEATURE_DISABLED" },
      { status: 403 },
    );
  }

  const body = await req.json().catch(() => ({}));
  const { postId, code } = body as { postId?: string; code?: string };

  if (!postId || !code) {
    return NextResponse.json({ error: "postId and code are required." }, { status: 400 });
  }

  try {
    const result = await findCodeInComments(postId, code);
    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[/api/verify-like]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
