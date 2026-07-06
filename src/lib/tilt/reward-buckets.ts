import { and, asc, eq, lte, sql } from "drizzle-orm";
import { tiltDb } from "@/src/db/tilt-db";
import {
  dailyRewardBucketsTable,
  dailyRewardCountersTable,
  tiltUsersTable,
} from "@/src/db/tilt-schema";
import {
  AVG_DAILY_ENTRIES_LOOKBACK_DAYS,
  FALLBACK_ENTRIES_PER_BUCKET,
  MIN_HISTORY_DAYS_FOR_AVG,
  NST_OFFSET_MS,
} from "./reward-config";
import { getOutletDailyRewardTarget } from "./reward-target";

type DbClient = {
  select: typeof tiltDb.select;
  insert: typeof tiltDb.insert;
  update: typeof tiltDb.update;
  execute: typeof tiltDb.execute;
};

type GenerateBucketsResult = {
  status: "generated" | "already_exists" | "skipped";
  reason?: "rewards_off" | "missing_hours" | "invalid_hours" | "missing_outlet";
  bucketCount: number;
};

function parsePgTimeToMinutes(value: string | null): number | null {
  if (!value) return null;
  const parts = value.split(":");
  if (parts.length < 2) return null;

  const hours = Number(parts[0]);
  const minutes = Number(parts[1]);

  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) return null;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;

  return hours * 60 + minutes;
}

function formatDateKeyFromNstDate(dateNst: Date): string {
  const y = dateNst.getUTCFullYear();
  const m = String(dateNst.getUTCMonth() + 1).padStart(2, "0");
  const d = String(dateNst.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseDateKey(dateKey: string): { year: number; month: number; day: number } {
  const [y, m, d] = dateKey.split("-").map(Number);
  if (!Number.isInteger(y) || !Number.isInteger(m) || !Number.isInteger(d)) {
    throw new Error(`Invalid reward date: ${dateKey}`);
  }
  return { year: y, month: m, day: d };
}

function buildUtcFromNstDateAndMinutes(dateKey: string, minutesOfDay: number): Date {
  const { year, month, day } = parseDateKey(dateKey);
  const hours = Math.floor(minutesOfDay / 60);
  const minutes = minutesOfDay % 60;
  const utcMs = Date.UTC(year, month - 1, day, hours, minutes, 0, 0) - NST_OFFSET_MS;
  return new Date(utcMs);
}

export function getNstDateKey(referenceDate = new Date()): string {
  const nowNst = new Date(referenceDate.getTime() + NST_OFFSET_MS);
  return formatDateKeyFromNstDate(nowNst);
}

async function lockDailyGeneration(
  dbClient: DbClient,
  outletId: string,
  rewardDate: string,
): Promise<void> {
  const lockKey = `tilt:reward-buckets:${outletId}:${rewardDate}`;
  await dbClient.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`);
}

async function recalculateOutletAvgDailyEntries(
  outletId: string,
  dbClient: DbClient,
  options?: {
    lookbackDays?: number;
    minHistoryDays?: number;
  },
): Promise<string | null> {
  const lookbackDays = options?.lookbackDays ?? AVG_DAILY_ENTRIES_LOOKBACK_DAYS;
  const minHistoryDays = options?.minHistoryDays ?? MIN_HISTORY_DAYS_FOR_AVG;

  const result = await dbClient.execute(sql`
    SELECT
      (timezone('Asia/Kathmandu', le.created_at))::date AS day_key,
      COUNT(*)::int AS entries_count
    FROM lottery_entries le
    INNER JOIN lottery_sessions ls ON ls.id = le.session_id
    INNER JOIN qr_tokens qr ON qr.id = ls.token_id
    WHERE qr.outlet_id = ${outletId}
      AND le.created_at >= now() - (${lookbackDays} || ' days')::interval
    GROUP BY (timezone('Asia/Kathmandu', le.created_at))::date
  `);

  let dayCount = 0;
  let totalEntries = 0;

  for (const row of result.rows as Array<{ entries_count: number }>) {
    dayCount += 1;
    totalEntries += Number(row.entries_count ?? 0);
  }

  const nextAvg =
    dayCount >= minHistoryDays
      ? (totalEntries / dayCount).toFixed(2)
      : null;

  await dbClient
    .update(tiltUsersTable)
    .set({ avgDailyEntries: nextAvg })
    .where(eq(tiltUsersTable.id, Number(outletId)));

  return nextAvg;
}

export async function generateDailyBuckets(
  outletId: string,
  rewardDate: string,
  options?: {
    dbClient?: DbClient;
    maxWinnersPerDay?: number;
  },
): Promise<GenerateBucketsResult> {
  const dbClient = options?.dbClient ?? tiltDb;
  const normalizedOutletId = outletId.trim();

  // Serialize first-of-day initialization for an outlet/day.
  await lockDailyGeneration(dbClient, normalizedOutletId, rewardDate);

  const [existingBucket] = await dbClient
    .select({ id: dailyRewardBucketsTable.id })
    .from(dailyRewardBucketsTable)
    .where(
      and(
        eq(dailyRewardBucketsTable.outletId, normalizedOutletId),
        eq(dailyRewardBucketsTable.rewardDate, rewardDate),
      ),
    )
    .limit(1);

  if (existingBucket) {
    return { status: "already_exists", bucketCount: 0 };
  }

  // Lazy refresh: recalculate per-outlet average when the day is initialized.
  await recalculateOutletAvgDailyEntries(normalizedOutletId, dbClient);

  const [outletRow] = await dbClient
    .select({
      id: tiltUsersTable.id,
      operatingHoursStart: tiltUsersTable.operatingHoursStart,
      operatingHoursEnd: tiltUsersTable.operatingHoursEnd,
      avgDailyEntries: tiltUsersTable.avgDailyEntries,
    })
    .from(tiltUsersTable)
    .where(eq(tiltUsersTable.id, Number(normalizedOutletId)))
    .limit(1);

  if (!outletRow) {
    return { status: "skipped", reason: "missing_outlet", bucketCount: 0 };
  }

  const maxWinnersPerDay = Math.trunc(
    options?.maxWinnersPerDay ?? (await getOutletDailyRewardTarget(normalizedOutletId)),
  );

  if (maxWinnersPerDay <= 0) {
    return { status: "skipped", reason: "rewards_off", bucketCount: 0 };
  }

  const startMinutes = parsePgTimeToMinutes(outletRow.operatingHoursStart);
  const endMinutes = parsePgTimeToMinutes(outletRow.operatingHoursEnd);

  if (startMinutes == null || endMinutes == null) {
    return { status: "skipped", reason: "missing_hours", bucketCount: 0 };
  }

  if (endMinutes <= startMinutes) {
    return { status: "skipped", reason: "invalid_hours", bucketCount: 0 };
  }

  const bucketCount = maxWinnersPerDay;
  const startUtc = buildUtcFromNstDateAndMinutes(rewardDate, startMinutes);
  const endUtc = buildUtcFromNstDateAndMinutes(rewardDate, endMinutes);

  const totalMs = endUtc.getTime() - startUtc.getTime();
  if (totalMs <= 0) {
    return { status: "skipped", reason: "invalid_hours", bucketCount: 0 };
  }

  const avgDailyEntries =
    outletRow.avgDailyEntries == null ? null : Number(outletRow.avgDailyEntries);
  const estimatedEntriesPerBucket =
    avgDailyEntries == null || !Number.isFinite(avgDailyEntries)
      ? FALLBACK_ENTRIES_PER_BUCKET
      : Math.max(avgDailyEntries / bucketCount, 1);

  const bucketRows = Array.from({ length: bucketCount }, (_v, index) => {
    const bucketStart = new Date(startUtc.getTime() + Math.floor((totalMs * index) / bucketCount));
    const bucketEnd =
      index === bucketCount - 1
        ? endUtc
        : new Date(startUtc.getTime() + Math.floor((totalMs * (index + 1)) / bucketCount));

    return {
      outletId: normalizedOutletId,
      rewardDate,
      bucketIndex: index,
      bucketStart,
      bucketEnd,
      targetWinners: 1,
      winnersGivenInBucket: 0,
      estimatedEntries: estimatedEntriesPerBucket.toFixed(2),
      rolloverApplied: false,
    };
  });

  await dbClient.insert(dailyRewardBucketsTable).values(bucketRows).onConflictDoNothing();
  await dbClient
    .insert(dailyRewardCountersTable)
    .values({
      outletId: normalizedOutletId,
      rewardDate,
      winnersGivenToday: 0,
      updatedAt: new Date(),
    })
    .onConflictDoNothing();

  return { status: "generated", bucketCount };
}

export async function applyBucketRollover(
  outletId: string,
  rewardDate: string,
  now: Date,
  dbClient: DbClient = tiltDb,
): Promise<number> {
  const normalizedOutletId = outletId.trim();

  const pendingBuckets = await dbClient
    .select({
      id: dailyRewardBucketsTable.id,
      bucketIndex: dailyRewardBucketsTable.bucketIndex,
      targetWinners: dailyRewardBucketsTable.targetWinners,
      winnersGivenInBucket: dailyRewardBucketsTable.winnersGivenInBucket,
    })
    .from(dailyRewardBucketsTable)
    .where(
      and(
        eq(dailyRewardBucketsTable.outletId, normalizedOutletId),
        eq(dailyRewardBucketsTable.rewardDate, rewardDate),
        eq(dailyRewardBucketsTable.rolloverApplied, false),
        lte(dailyRewardBucketsTable.bucketEnd, now),
      ),
    )
    .orderBy(asc(dailyRewardBucketsTable.bucketIndex));

  let rolledBuckets = 0;

  for (const bucket of pendingBuckets) {
    const shortfall = Math.max(bucket.targetWinners - bucket.winnersGivenInBucket, 0);

    if (shortfall > 0) {
      await dbClient
        .update(dailyRewardBucketsTable)
        .set({ targetWinners: sql`${dailyRewardBucketsTable.targetWinners} + ${shortfall}` })
        .where(
          and(
            eq(dailyRewardBucketsTable.outletId, normalizedOutletId),
            eq(dailyRewardBucketsTable.rewardDate, rewardDate),
            eq(dailyRewardBucketsTable.bucketIndex, bucket.bucketIndex + 1),
          ),
        );
    }

    await dbClient
      .update(dailyRewardBucketsTable)
      .set({ rolloverApplied: true })
      .where(eq(dailyRewardBucketsTable.id, bucket.id));

    rolledBuckets += 1;
  }

  return rolledBuckets;
}
