import { and, eq, sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { tiltDb } from "@/src/db/tilt-db";
import {
  dailyRewardBucketsTable,
  dailyRewardCountersTable,
  lotteryEntriesTable,
  lotterySessionsTable,
  instantRewardsTable,
  qrTokensTable,
} from "@/src/db/tilt-schema";
import {
  applyBucketRollover,
  generateDailyBuckets,
  getNstDateKey,
} from "@/src/lib/tilt/reward-buckets";
import { getWinProbability } from "@/src/lib/tilt/reward-probability";
import { getOutletDailyRewardTarget } from "@/src/lib/tilt/reward-target";
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

      // Resolve which outlet this session's QR token belongs to.
      const [token] = await tx
        .select({ outletId: qrTokensTable.outletId })
        .from(qrTokensTable)
        .where(eq(qrTokensTable.id, session.token_id));

      if (token?.outletId) {
        const outletId = token.outletId;
        const now = new Date();
        const rewardDate = getNstDateKey(now);
        const dailyRewardTarget = await getOutletDailyRewardTarget(outletId);

        if (dailyRewardTarget > 0) {
          await generateDailyBuckets(outletId, rewardDate, {
            dbClient: tx,
            maxWinnersPerDay: dailyRewardTarget,
          });

          await applyBucketRollover(outletId, rewardDate, now, tx);

          const activeBucketResult = await tx.execute(sql`
            SELECT
              id,
              target_winners,
              winners_given_in_bucket,
              estimated_entries,
              bucket_start,
              bucket_end
            FROM daily_reward_buckets
            WHERE outlet_id = ${outletId}
              AND reward_date = ${rewardDate}
              AND bucket_start <= ${now}
              AND bucket_end > ${now}
            ORDER BY bucket_index
            LIMIT 1
            FOR UPDATE
          `);

          const activeBucket = activeBucketResult.rows[0] as
            | {
                id: string;
                target_winners: number | string;
                winners_given_in_bucket: number | string;
                estimated_entries: number | string;
                bucket_start: Date;
                bucket_end: Date;
              }
            | undefined;

          if (activeBucket) {
            await tx
              .insert(dailyRewardCountersTable)
              .values({
                outletId,
                rewardDate,
                winnersGivenToday: 0,
                updatedAt: now,
              })
              .onConflictDoNothing();

            const counterResult = await tx.execute(sql`
              SELECT winners_given_today
              FROM daily_reward_counters
              WHERE outlet_id = ${outletId}
                AND reward_date = ${rewardDate}
              FOR UPDATE
            `);

            const counterRow = counterResult.rows[0] as
              | { winners_given_today: number | string }
              | undefined;

            const winnersGivenToday = Number(counterRow?.winners_given_today ?? 0);

            let probability = 0;
            if (winnersGivenToday < dailyRewardTarget) {
              probability = getWinProbability(
                {
                  bucketStart: new Date(activeBucket.bucket_start),
                  bucketEnd: new Date(activeBucket.bucket_end),
                  targetWinners: Number(activeBucket.target_winners),
                  winnersGivenInBucket: Number(activeBucket.winners_given_in_bucket),
                  estimatedEntries: Number(activeBucket.estimated_entries),
                },
                now,
              );
            }

            const isWinner = Math.random() < probability;

            if (isWinner) {
              try {
                await tx
                  .update(dailyRewardBucketsTable)
                  .set({
                    winnersGivenInBucket: sql`${dailyRewardBucketsTable.winnersGivenInBucket} + 1`,
                  })
                  .where(eq(dailyRewardBucketsTable.id, activeBucket.id));

                await tx
                  .update(dailyRewardCountersTable)
                  .set({
                    winnersGivenToday: sql`${dailyRewardCountersTable.winnersGivenToday} + 1`,
                    updatedAt: now,
                  })
                  .where(
                    and(
                      eq(dailyRewardCountersTable.outletId, outletId),
                      eq(dailyRewardCountersTable.rewardDate, rewardDate),
                    ),
                  );

                await tx.insert(instantRewardsTable).values({
                  entryId: entry.id,
                  sessionId: session.id,
                  campaignId: session.campaign_id,
                  outletId,
                });

                wonReward = true;
              } catch {
                wonReward = false;
              }
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