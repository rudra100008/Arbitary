import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/src/services/auth.service";
import { TaskService } from "@/src/services/task.service";
import { rateLimit } from "@/src/lib/rate-limit";
import { FeatureFlagService } from "@/src/services/feature-flag.service";

export async function POST(req: NextRequest) {
  const auth = await requireUser();
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  const facebookEnabled = await FeatureFlagService.isPlatformEnabled("facebook");
  if (!facebookEnabled) {
    return NextResponse.json(
      { error: "Facebook tasks are temporarily unavailable.", code: "FEATURE_DISABLED" },
      { status: 403 },
    );
  }

  const rl = await rateLimit(`facebook-complete:${auth.data.id}`, 5, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: `Too many attempts. Try again in ${rl.retryAfterSeconds}s.` },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } },
    );
  }

  const body = await req.json().catch(() => ({}));
  const { taskId, fingerprint } = body as { taskId?: number; fingerprint?: string };

  if (!taskId) {
    return NextResponse.json({ error: "Task ID is required" }, { status: 400 });
  }

  try {
    const result = await TaskService.completeFacebookTask(
      auth.data.id,
      Number(taskId),
      auth.data.facebookId,
      fingerprint,
    );

    if (!result.success) {
      const response: Record<string, unknown> = { error: result.error };
      if (result.status === 429) {
        response.verificationCode = await TaskService.getVerificationCode(
          auth.data.id,
          Number(taskId),
          "#fb",
        );
      }
      return NextResponse.json(response, { status: result.status });
    }

    return NextResponse.json(result.data, { status: 200 });
  } catch (err) {
    // Unexpected error (network failure, DB timeout, etc.) — log it internally
    // but never expose raw stack traces or API error strings to the client.
    console.error("[facebook-complete] Unhandled error:", err);
    return NextResponse.json(
      {
        error:
          "Something went wrong while verifying your Facebook comment. Please try again in a moment.",
      },
      { status: 503 },
    );
  }
}

export async function GET(req: NextRequest) {
  const auth = await requireUser();
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  const facebookEnabled = await FeatureFlagService.isPlatformEnabled("facebook");
  if (!facebookEnabled) {
    return NextResponse.json(
      { error: "Facebook tasks are temporarily unavailable.", code: "FEATURE_DISABLED" },
      { status: 403 },
    );
  }

  const { searchParams } = new URL(req.url);
  const taskId = searchParams.get("taskId");

  if (!taskId) {
    return NextResponse.json({ error: "taskId query param is required" }, { status: 400 });
  }

  try {
    const code = await TaskService.getVerificationCode(auth.data.id, Number(taskId), "#fb");
    return NextResponse.json({ verificationCode: code });
  } catch (err) {
    console.error("[facebook-complete GET] Unhandled error:", err);
    return NextResponse.json(
      { error: "Could not generate verification code. Please try again." },
      { status: 503 },
    );
  }
}