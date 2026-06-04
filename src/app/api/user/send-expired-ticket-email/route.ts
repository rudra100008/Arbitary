import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/src/services/auth.service";
import { TicketService } from "@/src/services/ticket.service";

export async function POST(req: NextRequest) {
  const auth = await requireUser();
  if (!auth.success) {
    return NextResponse.json({ success: false, message: auth.error }, { status: 401 });
  }

  const { ticketId } = await req.json();
  if (!ticketId) {
    return NextResponse.json({ success: false, message: "Ticket ID required" }, { status: 400 });
  }

  const result = await TicketService.sendExpiredTicketEmail(
    Number(ticketId),
    auth.data.email ?? undefined,
    auth.data.name ?? undefined,
  );
  if (!result.success) {
    return NextResponse.json({ success: false, message: result.error }, { status: (result as any).status ?? 400 });
  }

  return NextResponse.json({ success: result.data.success, message: result.data.message });
}
