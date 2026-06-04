import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/src/services/auth.service";
import { TicketService } from "@/src/services/ticket.service";

export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  const token = new URL(req.url).searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "Token is required" }, { status: 400 });
  }

  const result = await TicketService.lookupTicket(token);
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: (result as any).status ?? 404 });
  }

  return NextResponse.json({ ticket: result.data });
}
