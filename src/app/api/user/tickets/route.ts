import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/src/services/auth.service";
import { TicketService } from "@/src/services/ticket.service";
import { toNextResponse } from "@/src/lib/api-response";

export async function GET() {
  const auth = await requireUser();
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  const result = await TicketService.getUserTickets(auth.data.id);
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({ tickets: result.data });
}

export async function POST(req: NextRequest) {
  const auth = await requireUser();
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  const { eventId, accessTypeId } = await req.json();
  if (!eventId || !accessTypeId) {
    return NextResponse.json(
      { error: "Event ID and Access Type ID are required" },
      { status: 400 },
    );
  }

  const result = await TicketService.redeemTicket(
    auth.data.id,
    Number(eventId),
    Number(accessTypeId),
    auth.data.email ?? undefined,
    auth.data.name ?? undefined,
  );
  if (!result.success) return toNextResponse(result);

  return NextResponse.json(result.data);
}
