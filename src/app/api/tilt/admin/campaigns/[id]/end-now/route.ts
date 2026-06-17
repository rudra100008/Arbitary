import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { tiltDb } from "@/src/db/tilt-db";
import { lotteryCampaignsTable } from "@/src/db/tilt-schema";
import { requireTiltSuperadmin } from "@/src/lib/tilt/require-superadmin";

export async function POST(
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

    const [campaign] = await tiltDb
      .update(lotteryCampaignsTable)
      .set({ endsAt: new Date() })
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
    console.error("[tilt/admin/campaigns:end-now]", error);
    return NextResponse.json(
      { error: "Something went wrong." },
      { status: 500 },
    );
  }
}
