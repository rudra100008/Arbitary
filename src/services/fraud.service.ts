import { db } from "@/src/db";
import {
  usersTable,
  userTasksTable,
  tasksTable,
} from "@/src/db/schema";
import { eq, and, sql, gte, desc } from "drizzle-orm";
import { ServiceResult, ok } from "./result";

export type FraudBreakdown = {
  sharedFingerprint: number;
  multipleAccounts: number;
  fastCompletion: number;
  highVolume: number;
};

export type FraudUser = {
  userId: number;
  userName: string | null;
  userEmail: string;
  riskScore: number;
  breakdown: FraudBreakdown;
  completedTasks: number;
};

export type FraudReport = {
  flaggedUsers: FraudUser[];
  totalUsersScanned: number;
  flaggedCount: number;
};

const SHARED_FINGERPRINT_PTS = 30;
const MULTIPLE_ACCOUNTS_PTS = 30;
const FAST_COMPLETION_PTS = 20;
const HIGH_VOLUME_PTS = 20;
const FLAG_THRESHOLD = 70;
const FAST_COMPLETION_RATIO = 0.3;
const HIGH_VOLUME_LIMIT = 20;
const HIGH_VOLUME_WINDOW_HOURS = 1;

export const FraudService = {
  async getFraudReport(): Promise<ServiceResult<FraudReport>> {
    const allUsers = await db
      .select({
        id: usersTable.id,
        name: usersTable.name,
        email: usersTable.email,
        completedTasksCount: usersTable.completedTasksCount,
      })
      .from(usersTable)
      .where(sql`${usersTable.role} = 'USER'`)
      .orderBy(desc(usersTable.completedTasksCount));

    const flaggedUsers: FraudUser[] = [];

    for (const user of allUsers) {
      const userId = user.id;
      let sharedFingerprint = 0;
      let multipleAccounts = 0;
      let fastCompletion = 0;
      let highVolume = 0;

      // 1 & 2: Shared fingerprint / multiple accounts
      const userFingerprints = await db
        .select({ fingerprint: userTasksTable.submissionFingerprint })
        .from(userTasksTable)
        .where(
          and(
            eq(userTasksTable.userId, userId),
            sql`${userTasksTable.submissionFingerprint} IS NOT NULL`,
          ),
        )
        .groupBy(userTasksTable.submissionFingerprint);

      for (const row of userFingerprints) {
        const fp = row.fingerprint;
        if (!fp) continue;

        const otherUsers = await db
          .select({ uid: userTasksTable.userId })
          .from(userTasksTable)
          .where(
            and(
              eq(userTasksTable.submissionFingerprint, fp),
              sql`${userTasksTable.userId} != ${userId}`,
            ),
          )
          .groupBy(userTasksTable.userId);

        if (otherUsers.length > 0) {
          sharedFingerprint += SHARED_FINGERPRINT_PTS;
        }

        if (otherUsers.length + 1 >= 3) {
          multipleAccounts += MULTIPLE_ACCOUNTS_PTS;
        }
      }

      // 3: Fast completion (duration < 30% of required watch time)
      const [fastResult] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(userTasksTable)
        .innerJoin(tasksTable, eq(userTasksTable.taskId, tasksTable.id))
        .where(
          and(
            eq(userTasksTable.userId, userId),
            sql`${userTasksTable.completionDurationSeconds} IS NOT NULL`,
            sql`${tasksTable.watchDuration} IS NOT NULL`,
            sql`${tasksTable.watchDuration} > 0`,
            sql`${userTasksTable.completionDurationSeconds} < ${tasksTable.watchDuration} * ${FAST_COMPLETION_RATIO}`,
          ),
        );

      if ((fastResult?.count ?? 0) > 0) {
        fastCompletion += FAST_COMPLETION_PTS;
      }

      // 4: High submission volume (>=20 in the last hour)
      const oneHourAgo = new Date(
        Date.now() - HIGH_VOLUME_WINDOW_HOURS * 60 * 60 * 1000,
      );
      const [volumeResult] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(userTasksTable)
        .where(
          and(
            eq(userTasksTable.userId, userId),
            sql`${userTasksTable.status} IN ('Completed', 'Verified')`,
            gte(userTasksTable.completedAt, oneHourAgo),
          ),
        );

      if ((volumeResult?.count ?? 0) >= HIGH_VOLUME_LIMIT) {
        highVolume += HIGH_VOLUME_PTS;
      }

      const riskScore =
        sharedFingerprint + multipleAccounts + fastCompletion + highVolume;

      await db
        .update(usersTable)
        .set({
          fraudRiskScore: riskScore,
          isFlagged: riskScore > FLAG_THRESHOLD,
        })
        .where(eq(usersTable.id, userId));

      if (riskScore > FLAG_THRESHOLD) {
        flaggedUsers.push({
          userId,
          userName: user.name,
          userEmail: user.email,
          riskScore,
          breakdown: {
            sharedFingerprint,
            multipleAccounts,
            fastCompletion,
            highVolume,
          },
          completedTasks: user.completedTasksCount,
        });
      }
    }

    return ok({
      flaggedUsers,
      totalUsersScanned: allUsers.length,
      flaggedCount: flaggedUsers.length,
    });
  },

  async clearFlags(userId: number): Promise<ServiceResult<{ success: true }>> {
    await db
      .update(usersTable)
      .set({ fraudRiskScore: 0, isFlagged: false })
      .where(eq(usersTable.id, userId));
    return ok({ success: true });
  },
};
