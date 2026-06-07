import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/src/services/auth.service";
import { EventService } from "@/src/services/event.service";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const param = await params;
  const id = Number(param.id);
  if (isNaN(id)) {
    return NextResponse.json({ success: false, message: "Invalid event ID" }, { status: 400 });
  }

  const result = await EventService.getEventById(id);
  if (!result.success) {
    return NextResponse.json(
      { success: false, message: result.error },
      { status: result.status },
    );
  }

  return NextResponse.json({ success: true, event: result.data });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  const param = await params;
  const id = Number(param.id);
  if (isNaN(id)) {
    return NextResponse.json({ success: false, message: "Invalid event ID" }, { status: 400 });
  }

  const body = await req.json();
  const result = await EventService.createOrUpdateEvent({ ...body, id });
  if (!result.success) {
    return NextResponse.json(
      { success: false, message: result.error, details: result.details },
      { status: result.status },
    );
  }

  return NextResponse.json({ success: true, event: result.data });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  const param = await params;
  const id = Number(param.id);
  if (isNaN(id)) {
    return NextResponse.json({ success: false, message: "Invalid event ID" }, { status: 400 });
  }

  const result = await EventService.deleteEvent(id);
  if (!result.success) {
    return NextResponse.json(
      { success: false, message: result.error },
      { status: result.status },
    );
  }

  return NextResponse.json({ success: true, message: "Event deleted" });
}

