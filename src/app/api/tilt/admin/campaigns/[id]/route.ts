import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { tiltDb } from "@/src/db/tilt-db";
import {
  instantRewardsTable,
  lotteryCampaignsTable,
  lotteryEntriesTable,
  lotterySessionsTable,
  qrTokensTable,
} from "@/src/db/tilt-schema";
import { requireTiltSuperadmin } from "@/src/lib/tilt/require-superadmin";

function parseDate(value: unknown): Date | null {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireTiltSuperadmin(req);
    if (!auth.ok) {
      return auth.response;
    }

    const { id } = await params;
    if (!id?.trim()) {
      return NextResponse.json(
        { error: "Invalid campaign id.", code: "BAD_REQUEST" },
        { status: 400 },
      );
    }

    const [existingCampaign] = await tiltDb
      .select({
        id: lotteryCampaignsTable.id,
        startsAt: lotteryCampaignsTable.startsAt,
      })
      .from(lotteryCampaignsTable)
      .where(eq(lotteryCampaignsTable.id, id));

    if (!existingCampaign) {
      return NextResponse.json(
        { error: "Campaign not found.", code: "NOT_FOUND" },
        { status: 404 },
      );
    }

    const body = (await req.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;
    const updates: { name?: string; endsAt?: Date } = {};

    if (Object.prototype.hasOwnProperty.call(body, "starts_at")) {
      return NextResponse.json(
        {
          error: "Start date cannot be edited from campaign management.",
          code: "STARTS_AT_LOCKED",
        },
        { status: 400 },
      );
    }

    if (Object.prototype.hasOwnProperty.call(body, "name")) {
      const name = typeof body.name === "string" ? body.name.trim() : "";
      if (!name) {
        return NextResponse.json(
          { error: "Campaign name cannot be empty.", code: "INVALID_NAME" },
          { status: 400 },
        );
      }
      updates.name = name;
    }

    if (Object.prototype.hasOwnProperty.call(body, "ends_at")) {
      const endsAt = parseDate(body.ends_at);
      if (!endsAt) {
        return NextResponse.json(
          { error: "Invalid end date/time.", code: "INVALID_DATE" },
          { status: 400 },
        );
      }

      if (existingCampaign.startsAt >= endsAt) {
        return NextResponse.json(
          {
            error: "End date must be after campaign start.",
            code: "INVALID_RANGE",
          },
          { status: 400 },
        );
      }

      updates.endsAt = endsAt;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No editable fields provided.", code: "NO_CHANGES" },
        { status: 400 },
      );
    }

    const [campaign] = await tiltDb
      .update(lotteryCampaignsTable)
      .set(updates)
      .where(eq(lotteryCampaignsTable.id, id))
      .returning({
        id: lotteryCampaignsTable.id,
        outletId: lotteryCampaignsTable.outletId,
        name: lotteryCampaignsTable.name,
        startsAt: lotteryCampaignsTable.startsAt,
        endsAt: lotteryCampaignsTable.endsAt,
        createdAt: lotteryCampaignsTable.createdAt,
      });

    return NextResponse.json({ campaign }, { status: 200 });
  } catch (error) {
    console.error("[tilt/admin/campaigns:update]", error);
    return NextResponse.json(
      { error: "Something went wrong." },
      { status: 500 },
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireTiltSuperadmin(req);
    if (!auth.ok) {
      return auth.response;
    }

    const { id } = await params;
    if (!id?.trim()) {
      return NextResponse.json(
        { error: "Invalid campaign id.", code: "BAD_REQUEST" },
        { status: 400 },
      );
    }

    const [existingCampaign] = await tiltDb
      .select({ id: lotteryCampaignsTable.id })
      .from(lotteryCampaignsTable)
      .where(eq(lotteryCampaignsTable.id, id));

    if (!existingCampaign) {
      return NextResponse.json(
        { error: "Campaign not found.", code: "NOT_FOUND" },
        { status: 404 },
      );
    }

    await tiltDb.transaction(async (tx) => {
      // Remove dependent rows explicitly to satisfy FK chains.
      await tx
        .delete(instantRewardsTable)
        .where(eq(instantRewardsTable.campaignId, id));

      await tx
        .delete(lotteryEntriesTable)
        .where(eq(lotteryEntriesTable.campaignId, id));

      await tx
        .delete(lotterySessionsTable)
        .where(eq(lotterySessionsTable.campaignId, id));

      await tx
        .delete(qrTokensTable)
        .where(eq(qrTokensTable.campaignId, id));

      await tx
        .delete(lotteryCampaignsTable)
        .where(eq(lotteryCampaignsTable.id, id));
    });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error("[tilt/admin/campaigns:delete]", error);
    return NextResponse.json(
      { error: "Something went wrong." },
      { status: 500 },
    );
  }
}
