import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/src/services/auth.service";
import { NotificationService } from "@/src/services/notification.service";
import {
  listNotificationsQuerySchema,
  markNotificationsReadSchema,
  deleteNotificationsSchema,
} from "@/src/lib/validations/notification";
import { toNextResponse } from "@/src/lib/api-response";

export async function GET(req: NextRequest) {
  const auth = await requireUser();
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const parsed = listNotificationsQuerySchema.safeParse({
    limit: searchParams.get("limit") ?? undefined,
    unreadOnly: searchParams.get("unreadOnly") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const result = await NotificationService.list(auth.data.id, {
    limit: parsed.data.limit,
    unreadOnly: parsed.data.unreadOnly,
  });

  return toNextResponse(result);
}

export async function PATCH(req: NextRequest) {
  const auth = await requireUser();
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  const parsed = markNotificationsReadSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const result = await NotificationService.markRead(auth.data.id, {
    notificationIds: parsed.data.notificationIds,
    markAll: parsed.data.markAll,
  });

  return toNextResponse(result);
}

export async function DELETE(req: NextRequest) {
  const auth = await requireUser();
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  const parsed = deleteNotificationsSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const result = await NotificationService.delete(auth.data.id, {
    notificationIds: parsed.data.notificationIds,
    deleteAll: parsed.data.deleteAll,
  });

  return toNextResponse(result);
}
