import { and, desc, gte, lte } from "drizzle-orm";
import { jwtVerify } from "jose";
import { NextRequest, NextResponse } from "next/server";
import { tiltDb } from "@/src/db/tilt-db";
import { lotteryCampaignsTable } from "@/src/db/tilt-schema";
import {
  GenerateQrTokenError,
  generateQrToken,
} from "@/src/lib/tilt/generate-qr-token";

type ErrorResponse = {
  error: string;
  code: string;
};

const TILT_JWT_SECRET = new TextEncoder().encode(
  process.env.TILT_JWT_SECRET ?? "tilt-fallback-secret-change-in-production",
);

function resolveAppBaseUrl(req: NextRequest) {
  const configuredUrl = process.env.NEXTAUTH_URL?.trim();

  if (configuredUrl && /^https?:\/\//i.test(configuredUrl)) {
    return configuredUrl.replace(/\/+$/, "");
  }

  return req.nextUrl.origin;
}

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get("tilt_token")?.value;
    if (!token) {
      const response: ErrorResponse = {
        error: "Outlet session is required",
        code: "UNAUTHORIZED",
      };
      return NextResponse.json(response, { status: 401 });
    }

    let payload: { id: number; email: string; name: string; role: string };

    try {
      const { payload: decoded } = await jwtVerify(token, TILT_JWT_SECRET);
      payload = decoded as typeof payload;
    } catch {
      const response: ErrorResponse = {
        error: "Session expired. Please log in again.",
        code: "UNAUTHORIZED",
      };
      return NextResponse.json(response, { status: 401 });
    }

    const outletId = String(payload.id ?? "").trim();
    if (!outletId) {
      const response: ErrorResponse = {
        error: "Invalid outlet identity in session",
        code: "OUTLET_NOT_FOUND",
      };
      return NextResponse.json(response, { status: 400 });
    }

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
