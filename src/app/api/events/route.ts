import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/src/services/auth.service";
import { EventService } from "@/src/services/event.service";
import { eventSchema } from "@/src/lib/validations/event";

export async function GET() {
  const result = await EventService.getEvents();
  if (!result.success) {
    return NextResponse.json(
      { success: false, message: "Internal Server Error" },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true, events: result.data });
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  const result = await EventService.createOrUpdateEvent(await req.json());
  if (!result.success) {
    return NextResponse.json(
      { success: false, message: result.error, details: (result as any).details },
      { status: (result as any).status ?? 500 },
    );
  }

  return NextResponse.json({ success: true, event: result.data });
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  const url = new URL(req.url);
  const id = url.pathname.split("/").pop();
  if (!id || isNaN(Number(id))) {
    return NextResponse.json(
      { success: false, message: "Invalid event ID" },
      { status: 400 },
    );
  }

  const result = await EventService.deleteEvent(Number(id));
  if (!result.success) {
    return NextResponse.json(
      { success: false, message: result.error },
      { status: (result as any).status ?? 404 },
    );
  }

  return NextResponse.json({ success: true, ...result.data });
}
