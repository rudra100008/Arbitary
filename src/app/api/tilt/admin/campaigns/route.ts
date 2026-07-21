import { desc } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { tiltDb } from "@/src/db/tilt-db";
import { lotteryCampaignsTable, lotteryEntriesTable } from "@/src/db/tilt-schema";
import { eq, sql } from "drizzle-orm";
import { requireTiltSuperadmin } from "@/src/lib/tilt/require-superadmin";

function parseDate(value: unknown): Date | null {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function GET(req: NextRequest) {
  try {
    const auth = await requireTiltSuperadmin(req);
    if (!auth.ok) {
      return auth.response;
    }

    const campaigns = await tiltDb
      .select({
        id: lotteryCampaignsTable.id,
        outletId: lotteryCampaignsTable.outletId,
        name: lotteryCampaignsTable.name,
        startsAt: lotteryCampaignsTable.startsAt,
        endsAt: lotteryCampaignsTable.endsAt,
        createdAt: lotteryCampaignsTable.createdAt,
        entryCount: sql<number>`COALESCE(CAST(COUNT(${lotteryEntriesTable.id}) AS integer), 0)`,
      })
      .from(lotteryCampaignsTable)
      .leftJoin(lotteryEntriesTable, eq(lotteryEntriesTable.campaignId, lotteryCampaignsTable.id))
      .groupBy(lotteryCampaignsTable.id)
      .orderBy(desc(lotteryCampaignsTable.createdAt))
      .limit(100);

    return NextResponse.json({ campaigns }, { status: 200 });
  } catch (error) {
    console.error("[tilt/admin/campaigns:get]", error);
    return NextResponse.json(
      { error: "Something went wrong." },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireTiltSuperadmin(req);
    if (!auth.ok) {
      return auth.response;
    }

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

    const name = typeof body.name === "string" ? body.name.trim() : "";
    const startsAt = parseDate(body.starts_at);
    const endsAt = parseDate(body.ends_at);

    if (!name) {
      return NextResponse.json(
        { error: "Campaign name is required.", code: "INVALID_NAME" },
        { status: 400 },
      );
    }

    if (!startsAt || !endsAt) {
      return NextResponse.json(
        {
          error: "Start and end date/time are required.",
          code: "INVALID_DATE",
        },
        { status: 400 },
      );
    }

    if (startsAt >= endsAt) {
      return NextResponse.json(
        { error: "Start must be before end.", code: "INVALID_RANGE" },
        { status: 400 },
      );
    }

    const [campaign] = await tiltDb
      .insert(lotteryCampaignsTable)
      .values({
        name,
        startsAt,
        endsAt,
        outletId: String(auth.payload.id),
      })
      .returning({
        id: lotteryCampaignsTable.id,
        outletId: lotteryCampaignsTable.outletId,
        name: lotteryCampaignsTable.name,
        startsAt: lotteryCampaignsTable.startsAt,
        endsAt: lotteryCampaignsTable.endsAt,
        createdAt: lotteryCampaignsTable.createdAt,
      });

    return NextResponse.json({ campaign }, { status: 201 });
  } catch (error) {
    console.error("[tilt/admin/campaigns:create]", error);
    return NextResponse.json(
      { error: "Something went wrong." },
      { status: 500 },
    );
  }
}
