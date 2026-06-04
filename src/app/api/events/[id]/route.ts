import { NextRequest, NextResponse } from "next/server";
import { EventService } from "@/src/services/event.service";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json(
      { success: false, message: "Invalid ID" },
      { status: 400 },
    );
  }

  const result = await EventService.getEventById(Number(id));
  if (!result.success) {
    return NextResponse.json(
      { success: false, message: result.error },
      { status: (result as any).status ?? 404 },
    );
  }

  return NextResponse.json({ success: true, event: result.data });
}
