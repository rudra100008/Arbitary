//src\app\api\user\tasks\instagram-complete\route.ts
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

  const instagramEnabled = await FeatureFlagService.isPlatformEnabled("instagram");
  if (!instagramEnabled) {
    return NextResponse.json(
      { error: "Instagram tasks are temporarily unavailable.", code: "FEATURE_DISABLED" },
      { status: 403 },
    );
  }

  const rl = await rateLimit(`instagram-complete:${auth.data.id}`, 5, 60_000);
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

  const result = await TaskService.completeInstagramTask(auth.data.id, Number(taskId), fingerprint);
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: result.status ?? 500 });
  }

  return NextResponse.json(result.data, { status: 200 });
}

export async function GET(req: NextRequest) {
  const auth = await requireUser();
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  const instagramEnabled = await FeatureFlagService.isPlatformEnabled("instagram");
  if (!instagramEnabled) {
    return NextResponse.json(
      { error: "Instagram tasks are temporarily unavailable.", code: "FEATURE_DISABLED" },
      { status: 403 },
    );
  }

  const { searchParams } = new URL(req.url);
  const taskId = searchParams.get("taskId");

  if (!taskId) {
    return NextResponse.json({ error: "taskId query param is required" }, { status: 400 });
  }

  const code = await TaskService.getVerificationCode(auth.data.id, Number(taskId), '#ig');
  return NextResponse.json({ verificationCode: code });
}
