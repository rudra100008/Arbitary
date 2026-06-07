import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/src/services/auth.service";
import { FraudService } from "@/src/services/fraud.service";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  const result = await FraudService.getFraudReport();
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json(result.data, { status: 200 });
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  const { userId, action } = await req.json().catch(() => ({}));

  if (!userId || !action) {
    return NextResponse.json(
      { error: "userId and action are required" },
      { status: 400 },
    );
  }

  if (action === "clear_flags") {
    const result = await FraudService.clearFlags(Number(userId));
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }
    return NextResponse.json({ success: true }, { status: 200 });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
