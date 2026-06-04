import { NextResponse } from "next/server";
import { requireUser } from "@/src/services/auth.service";
import { ReferralService } from "@/src/services/referral.service";

export async function GET() {
  const auth = await requireUser();
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  const result = await ReferralService.getReferralStats(auth.data.id);
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: result.status ?? 404 });
  }

  return NextResponse.json(result.data);
}
