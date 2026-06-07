import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/src/services/auth.service";
import { UserService } from "@/src/services/user.service";
import { toNextResponse } from "@/src/lib/api-response";

export async function POST(req: NextRequest) {
  const auth = await requireUser();
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  const { taskId } = await req.json();
  if (!taskId) {
    return NextResponse.json({ error: "Task ID is required" }, { status: 400 });
  }

  const result = await UserService.claimReferralReward(auth.data.id, Number(taskId));
  if (!result.success) return toNextResponse(result);

  return NextResponse.json({
    message: `Reward claimed for ${result.data.referralCount} referral(s)!`,
    pointsAwarded: result.data.pointsAwarded,
    referralCount: result.data.referralCount,
  }, { status: 200 });
}
