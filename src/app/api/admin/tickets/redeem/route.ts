import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/src/services/auth.service";
import { TicketService } from "@/src/services/ticket.service";
import { z } from "zod";

const redeemSchema = z.object({
  token: z.string().min(1, "Token is required"),
});

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  const parsed = redeemSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const result = await TicketService.verifyAndRedeemTicket(parsed.data.token, auth.data.id);
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: (result as any).status ?? 400 });
  }

  return NextResponse.json(result.data);
}
