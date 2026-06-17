import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { tiltDb } from "@/src/db/tilt-db";
import {
  lotteryEntriesTable,
  lotterySessionsTable,
} from "@/src/db/tilt-schema";
import {
  EMAIL_FORMAT_REGEX,
  isDisposableEmail,
} from "@/src/lib/tilt/disposable-email";
import {
  getSessionFromCookie,
  getSessionFromId,
} from "@/src/lib/tilt/get-session-from-cookie";
import { hashPhone, normalisePhone } from "@/src/lib/tilt/phone";

type ErrorResponse = {
  error: string;
  code: string;
};

function jsonError(status: number, error: string, code: string) {
  const payload: ErrorResponse = { error, code };
  return NextResponse.json(payload, { status });
}

function isUniqueViolation(error: unknown): boolean {
  const maybeError = error as { code?: string; cause?: { code?: string } };
  return maybeError?.code === "23505" || maybeError?.cause?.code === "23505";
}

function readTrimmedString(body: Record<string, unknown>, key: string): string {
  const value = body[key];
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;

    const sidFallback =
      typeof body.sid === "string" ? body.sid.trim() : "";

    const cookieSession = await getSessionFromCookie(req.cookies);
    const fallbackSession = cookieSession
      ? null
      : await getSessionFromId(sidFallback);

    const session = cookieSession ?? fallbackSession;
    if (!session) {
      return jsonError(403, "Invalid or missing session", "SESSION_REQUIRED");
    }

    if (session.submitted_at) {
      const [existingEntry] = await tiltDb
        .select({ id: lotteryEntriesTable.id })
        .from(lotteryEntriesTable)
        .where(eq(lotteryEntriesTable.sessionId, session.id));

      return NextResponse.json(
        { message: "already_submitted", entry_id: existingEntry?.id ?? null },
        { status: 200 },
      );
    }

    const fullName = readTrimmedString(body, "full_name");
    const email = readTrimmedString(body, "email").toLowerCase();
    const phoneRaw = readTrimmedString(body, "phone");
    const address = readTrimmedString(body, "address");

    if (!fullName) {
      return jsonError(400, "Full name is required", "INVALID_FULL_NAME");
    }

    if (!EMAIL_FORMAT_REGEX.test(email)) {
      return jsonError(400, "Invalid email address", "INVALID_EMAIL");
    }

    if (isDisposableEmail(email)) {
      return jsonError(
        400,
        "Disposable email addresses are not allowed",
        "DISPOSABLE_EMAIL",
      );
    }

    const phoneDigits = phoneRaw.replace(/\D/g, "");
    if (phoneDigits.length < 7 || phoneDigits.length > 15) {
      return jsonError(400, "Invalid phone number", "INVALID_PHONE");
    }

    if (!address) {
      return jsonError(400, "Address is required", "INVALID_ADDRESS");
    }

    const [existingEmailEntry] = await tiltDb
      .select({ id: lotteryEntriesTable.id })
      .from(lotteryEntriesTable)
      .where(
        and(
          eq(lotteryEntriesTable.campaignId, session.campaign_id),
          eq(lotteryEntriesTable.email, email),
        ),
      );

    if (existingEmailEntry) {
      return jsonError(
        409,
        "Email already entered for this campaign",
        "EMAIL_ALREADY_ENTERED",
      );
    }

    const normalisedPhone = normalisePhone(phoneRaw, "977");
    const phoneHash = hashPhone(normalisedPhone);

    const [existingPhoneEntry] = await tiltDb
      .select({ id: lotteryEntriesTable.id })
      .from(lotteryEntriesTable)
      .where(
        and(
          eq(lotteryEntriesTable.campaignId, session.campaign_id),
          eq(lotteryEntriesTable.phoneHash, phoneHash),
        ),
      );

    if (existingPhoneEntry) {
      return jsonError(
        409,
        "Phone already entered for this campaign",
        "PHONE_ALREADY_ENTERED",
      );
    }

    const insertedEntry = await tiltDb.transaction(async (tx) => {
      const [entry] = await tx
        .insert(lotteryEntriesTable)
        .values({
          campaignId: session.campaign_id,
          sessionId: session.id,
          fullName,
          email,
          phonePlain: normalisedPhone,
          phoneHash,
          address,
          flagged: false,
          flagReason: null,
        })
        .returning({ id: lotteryEntriesTable.id });

      await tx
        .update(lotterySessionsTable)
        .set({ submittedAt: new Date() })
        .where(eq(lotterySessionsTable.id, session.id));

      return entry;
    });

    return NextResponse.json(
      { message: "entered", entry_id: insertedEntry.id },
      { status: 200 },
    );
  } catch (error) {
    if (isUniqueViolation(error)) {
      const session = await getSessionFromCookie(req.cookies);
      if (session) {
        const [existingEntry] = await tiltDb
          .select({ id: lotteryEntriesTable.id })
          .from(lotteryEntriesTable)
          .where(eq(lotteryEntriesTable.sessionId, session.id));

        if (existingEntry) {
          return NextResponse.json(
            { message: "already_submitted", entry_id: existingEntry.id },
            { status: 200 },
          );
        }
      }
    }

    console.error("[tilt/register]", error);
    return jsonError(500, "Something went wrong", "INTERNAL_ERROR");
  }
}
