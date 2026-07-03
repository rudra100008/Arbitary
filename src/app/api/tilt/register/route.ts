import { and, count, eq, gte, lt } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { tiltDb } from "@/src/db/tilt-db";
import {
  lotteryEntriesTable,
  lotterySessionsTable,
  instantRewardsTable,
  qrTokensTable,
} from "@/src/db/tilt-schema";
import { getRewardWindow, isWithinRewardWindow } from "@/src/lib/tilt/reward-window";
import { shouldGrantReward } from "@/src/lib/tilt/reward-roll";
import {
  EMAIL_FORMAT_REGEX,
  isDisposableEmail,
} from "@/src/lib/tilt/disposable-email";
import { validateEmailDomain } from "@/src/lib/tilt/email";
import {
  getSessionFromCookie,
  getSessionFromId,
} from "@/src/lib/tilt/get-session-from-cookie";
import { hashPhone, normalisePhone } from "@/src/lib/tilt/phone";
import { checkRateLimit, getIp } from "@/src/lib/tilt/rate-limit";

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
    const ip = getIp(req);
    // Limit to 10 registrations per minute per IP to prevent spam bots
    if (!checkRateLimit(`register_${ip}`, 10, 60000)) {
        return jsonError(429, "Too many requests. Please try again later.", "RATE_LIMITED");
    }

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

    if (!session.submitted_at) {
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
      if (session.created_at < thirtyMinutesAgo) {
        return jsonError(403, "Your session has expired. Please scan the QR again.", "SESSION_EXPIRED");
      }
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
    let email = readTrimmedString(body, "email").toLowerCase();
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

    // Domain validation: typo correction + MX lookup (skipped for known-good domains)
    const atIndex = email.lastIndexOf("@");
    const domain = atIndex > 0 ? email.slice(atIndex + 1) : "";
    if (domain) {
      const result = await validateEmailDomain(domain);
      if (!result.valid) {
        if (result.correctedTo) {
          // Silently fix the email and continue
          email = `${email.slice(0, atIndex + 1)}${result.correctedTo}`;
        } else {
          return jsonError(400, "Invalid email address", "INVALID_EMAIL");
        }
      }
    }

    const phoneDigits = phoneRaw.replace(/\D/g, "");
    if (phoneDigits.length < 7 || phoneDigits.length > 15) {
      return jsonError(400, "Invalid phone number", "INVALID_PHONE");
    }

    if (!address) {
      return jsonError(400, "Address is required", "INVALID_ADDRESS");
    }

    const ageConfirmed = body.age_confirmed === true;
    const dataConsent = body.data_consent === true;

    if (!ageConfirmed) {
      return jsonError(403, "You must confirm you are 21 or older", "UNDERAGE");
    }

    if (!dataConsent) {
      return jsonError(403, "You must agree to data processing", "CONSENT_REQUIRED");
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

    const { insertedEntry, wonReward } = await tiltDb.transaction(async (tx) => {
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
          ageConfirmed,
          dataConsent,
        })
        .returning({ id: lotteryEntriesTable.id });

      await tx
        .update(lotterySessionsTable)
        .set({ submittedAt: new Date() })
        .where(eq(lotterySessionsTable.id, session.id));

      let wonReward = false;

      if (isWithinRewardWindow()) {
        // Resolve which outlet this session's QR token belongs to
        const [token] = await tx
          .select({ outletId: qrTokensTable.outletId })
          .from(qrTokensTable)
          .where(eq(qrTokensTable.id, session.token_id));

        if (token?.outletId) {
          const outletId = token.outletId;
          const { start, end } = getRewardWindow();

          // Winners today, this outlet only
          const [{ winnersInWindow }] = await tx
            .select({ winnersInWindow: count() })
            .from(instantRewardsTable)
            .where(
              and(
                eq(instantRewardsTable.outletId, outletId),
                gte(instantRewardsTable.claimedAt, start),
                lt(instantRewardsTable.claimedAt, end),
              ),
            );

          const w = Number(winnersInWindow ?? 0);

          // Count total entries submitted today for this outlet (drives threshold + dynamic cap)
          const [{ scansToday }] = await tx
            .select({ scansToday: count() })
            .from(lotteryEntriesTable)
            .innerJoin(lotterySessionsTable, eq(lotteryEntriesTable.sessionId, lotterySessionsTable.id))
            .innerJoin(qrTokensTable, eq(lotterySessionsTable.tokenId, qrTokensTable.id))
            .where(
              and(
                eq(qrTokensTable.outletId, outletId),
                gte(lotteryEntriesTable.createdAt, start),
                lt(lotteryEntriesTable.createdAt, end),
              ),
            );

          const s = Number(scansToday ?? 1);

          if (shouldGrantReward(w, s, new Date(), start, end)) {
            try {
              await tx.insert(instantRewardsTable).values({
                entryId: entry.id,
                sessionId: session.id,
                campaignId: session.campaign_id,
                outletId,
              });
              wonReward = true;
            } catch {
              // Race: another request claimed the last slot between our count and insert.
              wonReward = false;
            }
          }
        }
      }

      return { insertedEntry: entry, wonReward };
    });

    return NextResponse.json(
      { message: "entered", entry_id: insertedEntry.id, won_reward: wonReward },
      { status: 200 },
    );
  } catch (error) {
    if (isUniqueViolation(error)) {
      return jsonError(409, "This email or phone has already been entered for this campaign", "DUPLICATE_ENTRY");
    }

    console.error("[tilt/register]", error);
    return jsonError(500, "Something went wrong", "INTERNAL_ERROR");
  }
}