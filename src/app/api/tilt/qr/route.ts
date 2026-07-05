import { and, desc, gte, lte } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { tiltDb } from "@/src/db/tilt-db";
import { lotteryCampaignsTable } from "@/src/db/tilt-schema";
import { requireTiltOutlet } from "@/src/lib/tilt/require-outlet";
import {
  GenerateQrTokenError,
  generateQrToken,
} from "@/src/lib/tilt/generate-qr-token";

type ErrorResponse = {
  error: string;
  code: string;
};

function resolveAppBaseUrl(req: NextRequest) {
  const configuredUrl = process.env.NEXTAUTH_URL?.trim();

  if (configuredUrl && /^https?:\/\//i.test(configuredUrl)) {
    return configuredUrl.replace(/\/+$/, "");
  }

  return req.nextUrl.origin;
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireTiltOutlet(req);
    if (!auth.ok) {
      const response: ErrorResponse = {
        error: "Outlet session is required",
        code: "UNAUTHORIZED",
      };
      return NextResponse.json(response, { status: auth.response.status });
    }

    const { outletId } = auth;

    const now = new Date();
    const [activeCampaign] = await tiltDb
      .select({ id: lotteryCampaignsTable.id })
      .from(lotteryCampaignsTable)
      .where(
        and(
          lte(lotteryCampaignsTable.startsAt, now),
          gte(lotteryCampaignsTable.endsAt, now),
        ),
      )
      .orderBy(desc(lotteryCampaignsTable.createdAt))
      .limit(1);

    if (!activeCampaign) {
      const response: ErrorResponse = {
        error: "No active lottery campaign right now",
        code: "NO_ACTIVE_CAMPAIGN",
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Intentionally NOT idempotent: one QR per sale, each call creates a new token by design.
    const { token: qrToken, expiresAt } = await generateQrToken(
      activeCampaign.id,
      outletId,
    );

    const appBaseUrl = resolveAppBaseUrl(req);

    return NextResponse.json(
      {
        token: qrToken,
        qr_url: `${appBaseUrl}/tilt/redeem#t=${encodeURIComponent(qrToken)}`,
        expires_at: expiresAt,
      },
      { status: 200 },
    );
  } catch (error) {
    if (error instanceof GenerateQrTokenError) {
      if (error.code === "NOT_FOUND") {
        const response: ErrorResponse = {
          error: "Campaign not found",
          code: "NOT_FOUND",
        };
        return NextResponse.json(response, { status: 404 });
      }

      if (error.code === "CAMPAIGN_INACTIVE") {
        const response: ErrorResponse = {
          error: "Campaign not active",
          code: "CAMPAIGN_INACTIVE",
        };
        return NextResponse.json(response, { status: 400 });
      }
    }

    console.error("[tilt/qr]", error);
    const response: ErrorResponse = {
      error: "Something went wrong",
      code: "INTERNAL_ERROR",
    };
    return NextResponse.json(response, { status: 500 });
  }
}
