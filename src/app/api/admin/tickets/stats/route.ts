import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/src/services/auth.service";
import { db } from "@/src/db";
import { userTicketsTable, eventsTable } from "@/src/db/schema";
import { eq, and, sql } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  const eventId = req.nextUrl.searchParams.get("eventId");
  if (!eventId) {
    return NextResponse.json({ error: "eventId query parameter is required" }, { status: 400 });
  }

  const eventIdNum = Number(eventId);
  if (isNaN(eventIdNum)) {
    return NextResponse.json({ error: "Invalid eventId" }, { status: 400 });
  }

  const event = await db
    .select({ id: eventsTable.id })
    .from(eventsTable)
    .where(eq(eventsTable.id, eventIdNum))
    .then((rows) => rows[0]);

  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  const [stats] = await db
    .select({
      totalTickets: sql<number>`count(*)::int`,
      redeemedCount: sql<number>`count(*) filter (where ${userTicketsTable.status} = 'used')::int`,
    })
    .from(userTicketsTable)
    .where(eq(userTicketsTable.eventId, eventIdNum));

  return NextResponse.json({
    totalTickets: stats?.totalTickets ?? 0,
    redeemedCount: stats?.redeemedCount ?? 0,
  });
}
