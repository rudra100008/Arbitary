import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/src/services/auth.service";
import { TaskService } from "@/src/services/task.service";
import { toNextResponse } from "@/src/lib/api-response";
import { rateLimit } from "@/src/lib/rate-limit";

export async function POST(req: NextRequest) {
  const auth = await requireUser();
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  // Fast path: if already claimed today, answer immediately without
  // touching the rate limiter. This keeps repeat/expected calls (e.g. from
  // page reloads) from burning rate-limit budget that's meant to protect
  // the actual write path.
  const alreadyClaimed = await TaskService.hasDailyLoginClaimedToday(
    auth.data.id,
  );
  if (alreadyClaimed) {
    return NextResponse.json(
      {
        success: false,
        error: "You already claimed your daily login reward today",
        message: "You already claimed your daily login reward today",
        code: "ALREADY_CLAIMED",
      },
      { status: 429 },
    );
  }

  const rl = await rateLimit(`daily-login:${auth.data.id}`, 3, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      {
        code: "RATE_LIMITED",
        error: `Too many attempts. Try again in ${rl.retryAfterSeconds}s.`,
      },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } },
    );
  }

  // Re-checked inside a locked transaction here to close the race between
  // the fast-path read above and this write (e.g. two concurrent requests
  // that both passed the fast-path check before either had claimed).
  const result = await TaskService.claimDailyLogin(auth.data.id);
  if (!result.success) return toNextResponse(result);

  return NextResponse.json(result.data, { status: 200 });
}