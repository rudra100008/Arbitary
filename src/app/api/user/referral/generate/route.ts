import { NextResponse } from "next/server";
import { requireUser } from "@/src/services/auth.service";
import { UserService } from "@/src/services/user.service";
import { toNextResponse } from "@/src/lib/api-response";

export async function POST() {
  const auth = await requireUser();
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  const result = await UserService.generateReferralCode(auth.data.id);
  if (!result.success) return toNextResponse(result);

  return NextResponse.json(result.data, { status: 201 });
}
