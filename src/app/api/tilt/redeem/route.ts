import { and, eq, isNull } from "drizzle-orm";
import { nanoid } from "nanoid";
import { NextRequest, NextResponse } from "next/server";
import { tiltDb } from "@/src/db/tilt-db";
import { lotterySessionsTable, qrTokensTable } from "@/src/db/tilt-schema";

export const runtime = "nodejs";

const FORM_PATH = "/tilt";
const INVALID_PATH = "/tilt/invalid";

class LostRedeemRaceError extends Error {
  constructor() {
    super("Token was already consumed by another request");
    this.name = "LostRedeemRaceError";
  }
}

function invalidPath(reason: string) {
  return `${INVALID_PATH}?reason=${reason}`;
}

function buildSessionResponse(sessionId: string) {
  const response = NextResponse.json(
    { ok: true, next: FORM_PATH, session_id: sessionId },
    { status: 200 },
  );
  response.cookies.set("lsid", sessionId, {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    maxAge: 1800,
    path: "/",
  });
  return response;
}

type ConsumeTokenResult =
  | { ok: true; sessionId: string }
  | {
      ok: false;
      status: number;
      code: "BAD_REQUEST" | "NOT_FOUND" | "EXPIRED" | "ALREADY_USED";
      error: string;
      reason: string;
    };

async function consumeToken(token: string): Promise<ConsumeTokenResult> {
  if (!token) {
    return {
      ok: false,
      status: 400,
      error: "Missing token",
      code: "BAD_REQUEST",
      reason: "missing_token",
    };
  }

  const [tokenRow] = await tiltDb
    .select({
      id: qrTokensTable.id,
      campaignId: qrTokensTable.campaignId,
      expiresAt: qrTokensTable.expiresAt,
      usedAt: qrTokensTable.usedAt,
      sessionId: qrTokensTable.sessionId,
    })
    .from(qrTokensTable)
    .where(eq(qrTokensTable.token, token));

  if (!tokenRow) {
    return {
      ok: false,
      status: 404,
      error: "Token not found",
      code: "NOT_FOUND",
      reason: "not_found",
    };
  }

  const now = new Date();
  if (tokenRow.expiresAt < now) {
    return {
      ok: false,
      status: 400,
      error: "Token expired",
      code: "EXPIRED",
      reason: "expired",
    };
  }

  if (tokenRow.usedAt) {
    return {
      ok: false,
      status: 409,
      error: "Token already used",
      code: "ALREADY_USED",
      reason: "already_used",
    };
  }

  const newSessionId = nanoid();
  const burnedAt = new Date();

  await tiltDb.transaction(async (tx) => {
    const burnedRows = await tx
      .update(qrTokensTable)
      .set({
        usedAt: burnedAt,
        sessionId: newSessionId,
      })
      .where(and(eq(qrTokensTable.token, token), isNull(qrTokensTable.usedAt)))
      .returning({ id: qrTokensTable.id });

    if (burnedRows.length === 0) {
      throw new LostRedeemRaceError();
    }

    await tx.insert(lotterySessionsTable).values({
      id: newSessionId,
      tokenId: tokenRow.id,
      campaignId: tokenRow.campaignId,
    });
  });

  return { ok: true, sessionId: newSessionId };
}

import { checkRateLimit, getIp } from "@/src/lib/tilt/rate-limit";

export async function POST(req: NextRequest) {
  try {
    const ip = getIp(req);
    // Limit to 20 redeem attempts per minute per IP to prevent token brute force
    if (!checkRateLimit(`redeem_${ip}`, 20, 60000)) {
        return NextResponse.json(
        {
            error: "Too many requests",
            code: "RATE_LIMITED",
            next: invalidPath("rate_limited"),
        },
        { status: 429 },
        );
    }

    const body = await req.json().catch(() => ({}));
    const token = typeof body?.token === "string" ? body.token.trim() : "";
    const result = await consumeToken(token);

    if (!result.ok) {
      return NextResponse.json(
        {
          error: result.error,
          code: result.code,
          next: invalidPath(result.reason),
        },
        { status: result.status },
      );
    }

    return buildSessionResponse(result.sessionId);
  } catch (error) {
    if (error instanceof LostRedeemRaceError) {
      return NextResponse.json(
        {
          error: "Token already used",
          code: "ALREADY_USED",
          next: invalidPath("already_used"),
        },
        { status: 409 },
      );
    }

    console.error("[tilt/redeem]", error);
    return NextResponse.json(
      {
        error: "Something went wrong",
        code: "INTERNAL_ERROR",
        next: invalidPath("server_error"),
      },
      { status: 500 },
    );
  }
}
