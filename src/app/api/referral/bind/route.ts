import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/src/services/auth.service";
import { ReferralService } from "@/src/services/referral.service";

const bindSchema = z.object({
  code: z.string().min(1, "Referral code is required"),
});

export async function POST(req: NextRequest) {
  const auth = await requireUser();
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = bindSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const result = await ReferralService.bindReferralCode(auth.data.id, parsed.data.code);
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: result.status ?? 400 });
  }

  return NextResponse.json({
    success: true,
    bonusAwarded: result.data.bonusAwarded,
    message: result.data.bonusAwarded
      ? "Referral code linked! Bonus points awarded."
      : "Referral code linked! You'll earn bonus points after your first quest.",
  });
}
