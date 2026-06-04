import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/src/services/auth.service";
import { TicketService } from "@/src/services/ticket.service";

export async function POST(req: NextRequest) {
  const auth = await requireUser();
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  const { eventId } = await req.json();
  if (!eventId) {
    return NextResponse.json({ error: "Event ID is required" }, { status: 400 });
  }

  const result = await TicketService.redeemTicket(
    auth.data.id,
    Number(eventId),
    auth.data.email ?? undefined,
    auth.data.name ?? undefined,
  );
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: (result as any).status ?? 400 });
  }

  return NextResponse.json(result.data);
}
