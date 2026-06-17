import { NextRequest, NextResponse } from "next/server";
import {
  getSessionFromCookie,
  getSessionFromId,
} from "@/src/lib/tilt/get-session-from-cookie";

type SessionStateResponse = {
  valid: boolean;
  submitted?: boolean;
  reason?: "invalid_session" | "already_submitted";
};

function json(payload: SessionStateResponse) {
  return NextResponse.json(payload, { status: 200 });
}

export async function GET(req: NextRequest) {
  try {
    const sidFallback = req.nextUrl.searchParams.get("sid")?.trim() ?? "";

    const cookieSession = await getSessionFromCookie(req.cookies);
    const fallbackSession = cookieSession ? null : await getSessionFromId(sidFallback);
    const session = cookieSession ?? fallbackSession;

    if (!session) {
      return json({ valid: false, reason: "invalid_session" });
    }

    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    const isExpiredWithoutSubmit =
      session.submitted_at === null && session.created_at < thirtyMinutesAgo;

    if (isExpiredWithoutSubmit) {
      return json({ valid: false, reason: "invalid_session" });
    }

    const response = json({
      valid: true,
      submitted: session.submitted_at !== null,
      reason: session.submitted_at !== null ? "already_submitted" : undefined,
    });

    // If sid fallback was used, re-issue lsid cookie to stabilize follow-up requests.
    if (!cookieSession && sidFallback) {
      response.cookies.set("lsid", session.id, {
        httpOnly: true,
        secure: true,
        sameSite: "strict",
        maxAge: 1800,
        path: "/",
      });
    }

    return response;
  } catch (error) {
    console.error("[tilt/session-state]", error);
    return json({ valid: false, reason: "invalid_session" });
  }
}
