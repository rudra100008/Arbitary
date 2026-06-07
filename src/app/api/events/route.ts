import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/src/services/auth.service";
import { EventService } from "@/src/services/event.service";

export const revalidate = 0;

export async function GET() {
  const result = await EventService.getEvents();
  if (!result.success) {
    return NextResponse.json({ success: false, message: result.error }, { status: 500 });
  }

  return NextResponse.json({ success: true, events: result.data }, { status: 200 });
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.success) {
    const message = auth.status === 403
      ? "Only administrators can create or edit events."
      : "Please log in to continue.";
    return NextResponse.json({ error: message }, { status: auth.status });
  }

  const body = await req.json();
  const result = await EventService.createOrUpdateEvent(body);
  if (!result.success) {
    return NextResponse.json(
      { success: false, message: result.error, details: result.details },
      { status: result.status },
    );
  }

  return NextResponse.json({ success: true, event: result.data }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.success) {
    const message = auth.status === 403
      ? "Only administrators can delete events."
      : "Please log in to continue.";
    return NextResponse.json({ error: message }, { status: auth.status });
  }

  const { id } = await req.json();
  const result = await EventService.deleteEvent(Number(id));
  if (!result.success) {
    return NextResponse.json(
      { success: false, message: result.error },
      { status: result.status },
    );
  }

  return NextResponse.json({ success: true, message: "Event deleted" }, { status: 200 });
}

