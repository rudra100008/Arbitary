import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireTiltSuperadmin } from "@/src/lib/tilt/require-superadmin";
import {
  getDailyRewardTarget,
  setDailyRewardTarget,
  MIN_DAILY_REWARD_TARGET,
  MAX_DAILY_REWARD_TARGET,
} from "@/src/lib/tilt/reward-target";

const patchSchema = z.object({
  target: z
    .number()
    .int()
    .min(MIN_DAILY_REWARD_TARGET)
    .max(MAX_DAILY_REWARD_TARGET),
});

export async function GET(req: NextRequest) {
  const auth = await requireTiltSuperadmin(req);
  if (!auth.ok) {
    return auth.response;
  }

  const target = await getDailyRewardTarget();
  return NextResponse.json({ target }, { status: 200 });
}

export async function PATCH(req: NextRequest) {
  const auth = await requireTiltSuperadmin(req);
  if (!auth.ok) {
    return auth.response;
  }

  const body = await req.json().catch(() => ({}));
  const parsed = patchSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const target = await setDailyRewardTarget(parsed.data.target);
    return NextResponse.json({ target }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Failed to update reward target" }, { status: 500 });
  }
}
