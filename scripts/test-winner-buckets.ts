import { and, asc, eq } from "drizzle-orm";
import { config } from "dotenv";
import {
  dailyRewardBucketsTable,
  dailyRewardCountersTable,
  tiltOutletRewardTargetsTable,
  tiltUsersTable,
} from "../src/db/tilt-schema";

config({ path: ".env.local" });
config({ path: ".env" });

class IntentionalRollback extends Error {
  constructor() {
    super("Intentional rollback for test isolation");
    this.name = "IntentionalRollback";
  }
}

type CheckResult = {
  name: string;
  passed: boolean;
  details: string;
};

function assertCheck(condition: boolean, name: string, details: string): CheckResult {
  return { name, passed: condition, details };
}

async function run(): Promise<void> {
  const { tiltDb } = await import("../src/db/tilt-db");
  const { generateDailyBuckets, applyBucketRollover } = await import("../src/lib/tilt/reward-buckets");
  const { getWinProbability } = await import("../src/lib/tilt/reward-probability");

  const testOutletId = "990001";
  const testRewardDate = "2026-07-06";
  const maxWinnersPerDay = 4;
  const checks: CheckResult[] = [];

  try {
    await tiltDb.transaction(async (tx) => {
      await tx.insert(tiltUsersTable).values({
        id: Number(testOutletId),
        name: "Bucket Logic Test Outlet",
        email: "bucket.logic.test.990001@example.com",
        passwordHash: "test-hash",
        role: "outlet",
        address: "Test Address",
        operatingHoursStart: "10:00:00",
        operatingHoursEnd: "22:00:00",
      }).onConflictDoUpdate({
        target: tiltUsersTable.id,
        set: {
          name: "Bucket Logic Test Outlet",
          role: "outlet",
          operatingHoursStart: "10:00:00",
          operatingHoursEnd: "22:00:00",
          avgDailyEntries: null,
        },
      });

      await tx.insert(tiltOutletRewardTargetsTable).values({
        outletId: testOutletId,
        dailyRewardTarget: maxWinnersPerDay,
      }).onConflictDoUpdate({
        target: tiltOutletRewardTargetsTable.outletId,
        set: {
          dailyRewardTarget: maxWinnersPerDay,
          updatedAt: new Date(),
        },
      });

      const firstGenerate = await generateDailyBuckets(testOutletId, testRewardDate, {
        dbClient: tx,
        maxWinnersPerDay,
      });

      const bucketsAfterFirstGenerate = await tx
        .select({
          id: dailyRewardBucketsTable.id,
          bucketIndex: dailyRewardBucketsTable.bucketIndex,
          targetWinners: dailyRewardBucketsTable.targetWinners,
          winnersGivenInBucket: dailyRewardBucketsTable.winnersGivenInBucket,
          estimatedEntries: dailyRewardBucketsTable.estimatedEntries,
          bucketStart: dailyRewardBucketsTable.bucketStart,
          bucketEnd: dailyRewardBucketsTable.bucketEnd,
          rolloverApplied: dailyRewardBucketsTable.rolloverApplied,
        })
        .from(dailyRewardBucketsTable)
        .where(
          and(
            eq(dailyRewardBucketsTable.outletId, testOutletId),
            eq(dailyRewardBucketsTable.rewardDate, testRewardDate),
          ),
        )
        .orderBy(asc(dailyRewardBucketsTable.bucketIndex));

      checks.push(
        assertCheck(
          firstGenerate.status === "generated" && bucketsAfterFirstGenerate.length === maxWinnersPerDay,
          "Bucket generation creates expected window count",
          `status=${firstGenerate.status}, bucketCount=${bucketsAfterFirstGenerate.length}, expected=${maxWinnersPerDay}`,
        ),
      );

      const fallbackEstimatedEntriesAll12 = bucketsAfterFirstGenerate.every(
        (b) => Number(b.estimatedEntries) === 12,
      );

      checks.push(
        assertCheck(
          fallbackEstimatedEntriesAll12,
          "Fallback estimated entries applied when avgDailyEntries is null",
          `estimatedEntries=[${bucketsAfterFirstGenerate.map((b) => Number(b.estimatedEntries)).join(", ")}], expected all 12`,
        ),
      );

      const secondGenerate = await generateDailyBuckets(testOutletId, testRewardDate, {
        dbClient: tx,
        maxWinnersPerDay,
      });

      const bucketsAfterSecondGenerate = await tx
        .select({ count: dailyRewardBucketsTable.id })
        .from(dailyRewardBucketsTable)
        .where(
          and(
            eq(dailyRewardBucketsTable.outletId, testOutletId),
            eq(dailyRewardBucketsTable.rewardDate, testRewardDate),
          ),
        );

      checks.push(
        assertCheck(
          secondGenerate.status === "already_exists" && bucketsAfterSecondGenerate.length === maxWinnersPerDay,
          "Generation is idempotent for same outlet/date",
          `status=${secondGenerate.status}, bucketCount=${bucketsAfterSecondGenerate.length}, expected=${maxWinnersPerDay}`,
        ),
      );

      const firstBucket = bucketsAfterFirstGenerate[0];
      const secondBucket = bucketsAfterFirstGenerate[1];
      const now = new Date(secondBucket.bucketStart.getTime() + 5 * 60 * 1000);

      await tx
        .update(dailyRewardBucketsTable)
        .set({ bucketEnd: new Date(now.getTime() - 60 * 1000), winnersGivenInBucket: 0 })
        .where(eq(dailyRewardBucketsTable.id, firstBucket.id));

      await tx
        .update(dailyRewardBucketsTable)
        .set({ bucketStart: new Date(now.getTime() - 60 * 1000), bucketEnd: new Date(now.getTime() + 60 * 60 * 1000) })
        .where(eq(dailyRewardBucketsTable.id, secondBucket.id));

      const rolledCount = await applyBucketRollover(testOutletId, testRewardDate, now, tx);

      const [updatedSecondBucket] = await tx
        .select({ targetWinners: dailyRewardBucketsTable.targetWinners })
        .from(dailyRewardBucketsTable)
        .where(eq(dailyRewardBucketsTable.id, secondBucket.id))
        .limit(1);

      const [updatedFirstBucket] = await tx
        .select({ rolloverApplied: dailyRewardBucketsTable.rolloverApplied })
        .from(dailyRewardBucketsTable)
        .where(eq(dailyRewardBucketsTable.id, firstBucket.id))
        .limit(1);

      checks.push(
        assertCheck(
          rolledCount >= 1 && Number(updatedSecondBucket?.targetWinners ?? 0) === 2 && updatedFirstBucket?.rolloverApplied === true,
          "Rollover moves under-delivered winner budget to next bucket",
          `rolledCount=${rolledCount}, secondTarget=${updatedSecondBucket?.targetWinners}, firstRolloverApplied=${updatedFirstBucket?.rolloverApplied}`,
        ),
      );

      await tx
        .insert(dailyRewardCountersTable)
        .values({
          outletId: testOutletId,
          rewardDate: testRewardDate,
          winnersGivenToday: maxWinnersPerDay,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: [dailyRewardCountersTable.outletId, dailyRewardCountersTable.rewardDate],
          set: { winnersGivenToday: maxWinnersPerDay, updatedAt: now },
        });

      const [activeBucket] = await tx
        .select({
          targetWinners: dailyRewardBucketsTable.targetWinners,
          winnersGivenInBucket: dailyRewardBucketsTable.winnersGivenInBucket,
          estimatedEntries: dailyRewardBucketsTable.estimatedEntries,
          bucketStart: dailyRewardBucketsTable.bucketStart,
          bucketEnd: dailyRewardBucketsTable.bucketEnd,
        })
        .from(dailyRewardBucketsTable)
        .where(eq(dailyRewardBucketsTable.id, secondBucket.id))
        .limit(1);

      const [dailyCounter] = await tx
        .select({ winnersGivenToday: dailyRewardCountersTable.winnersGivenToday })
        .from(dailyRewardCountersTable)
        .where(
          and(
            eq(dailyRewardCountersTable.outletId, testOutletId),
            eq(dailyRewardCountersTable.rewardDate, testRewardDate),
          ),
        )
        .limit(1);

      const rawProbability = getWinProbability(
        {
          bucketStart: new Date(activeBucket!.bucketStart),
          bucketEnd: new Date(activeBucket!.bucketEnd),
          targetWinners: Number(activeBucket!.targetWinners),
          winnersGivenInBucket: Number(activeBucket!.winnersGivenInBucket),
          estimatedEntries: Number(activeBucket!.estimatedEntries),
        },
        now,
      );

      const effectiveProbability =
        Number(dailyCounter!.winnersGivenToday) >= maxWinnersPerDay ? 0 : rawProbability;

      checks.push(
        assertCheck(
          rawProbability > 0 && effectiveProbability === 0,
          "Hard daily ceiling overrides bucket probability",
          `rawProbability=${rawProbability.toFixed(4)}, winnersGivenToday=${dailyCounter!.winnersGivenToday}, cap=${maxWinnersPerDay}, effectiveProbability=${effectiveProbability.toFixed(4)}`,
        ),
      );

      throw new IntentionalRollback();
    });
  } catch (error) {
    if (!(error instanceof IntentionalRollback)) {
      throw error;
    }
  }

  const passed = checks.filter((c) => c.passed).length;
  const failed = checks.length - passed;

  console.log("Winner bucket logic verification (transactional, rolled back)");
  console.log(`Test data: outletId=${testOutletId}, rewardDate=${testRewardDate}, maxWinnersPerDay=${maxWinnersPerDay}, fallbackEntriesPerBucket=12`);
  console.log(`Total checks=${checks.length}, passed=${passed}, failed=${failed}`);

  for (const check of checks) {
    const status = check.passed ? "PASS" : "FAIL";
    console.log(`[${status}] ${check.name}`);
    console.log(`       ${check.details}`);
  }

  if (failed > 0) {
    process.exitCode = 1;
  }
}

run().catch((error) => {
  console.error("Bucket verification script failed:", error);
  process.exit(1);
});
