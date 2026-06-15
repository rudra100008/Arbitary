import { db } from "@/src/db";
import {
  usersTable,
  userTasksTable,
  tasksTable,
} from "@/src/db/schema";
import { eq, and, sql, gte, desc, inArray, isNotNull } from "drizzle-orm";
import { hammingDistance, PHASH_DUPLICATE_THRESHOLD } from "@/src/lib/image-analysis";
import { ServiceResult, ok } from "./result";

export type FraudBreakdown = {
  sharedFingerprint: number;
  multipleAccounts: number;
  fastCompletion: number;
  highVolume: number;
  duplicateImage: number;
  suspiciousExif: number;
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
const DUPLICATE_IMAGE_PTS = 40;
const SUSPICIOUS_EXIF_PTS = 15;

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
      .where(sql`LOWER(${usersTable.role}) = 'user'`)
      .orderBy(desc(usersTable.completedTasksCount));

    const userIds = allUsers.map((u) => u.id);
    if (userIds.length === 0) {
      return ok({ flaggedUsers: [], totalUsersScanned: 0, flaggedCount: 0 });
    }

    // ── 1 & 2: Shared fingerprint / multiple accounts ──
    // Find all fingerprints that belong to more than one user
    const sharedFpRows = await db
      .select({
        fingerprint: userTasksTable.submissionFingerprint,
      })
      .from(userTasksTable)
      .where(
        and(
          inArray(userTasksTable.userId, userIds),
          sql`${userTasksTable.submissionFingerprint} IS NOT NULL`,
        ),
      )
      .groupBy(userTasksTable.submissionFingerprint)
      .having(sql`count(DISTINCT ${userTasksTable.userId}) > 1`);

    const sharedFingerprints = sharedFpRows
      .map((r) => r.fingerprint)
      .filter(Boolean) as string[];

    // For each shared fingerprint, get all distinct users
    const fpUserRows = sharedFingerprints.length > 0
      ? await db
        .select({
          fingerprint: userTasksTable.submissionFingerprint,
          userId: userTasksTable.userId,
        })
        .from(userTasksTable)
        .where(
          and(
            inArray(userTasksTable.submissionFingerprint, sharedFingerprints),
            inArray(userTasksTable.userId, userIds),
          ),
        )
        .groupBy(userTasksTable.submissionFingerprint, userTasksTable.userId)
      : [];

    // Group: fingerprint -> Set<userId>
    const fpToUsers = new Map<string, Set<number>>();
    for (const row of fpUserRows) {
      const fp = row.fingerprint;
      if (!fp) continue;
      let users = fpToUsers.get(fp);
      if (!users) {
        users = new Set();
        fpToUsers.set(fp, users);
      }
      if (row.userId) users.add(row.userId);
    }

    // Build per-user fingerprint scores
    const fingerprintScores = new Map<number, { sharedFingerprint: number; multipleAccounts: number }>();
    for (const [fp, users] of fpToUsers) {
      const userCount = users.size;
      for (const uid of users) {
        const entry = fingerprintScores.get(uid) || { sharedFingerprint: 0, multipleAccounts: 0 };
        entry.sharedFingerprint += SHARED_FINGERPRINT_PTS;
        if (userCount >= 3) {
          entry.multipleAccounts += MULTIPLE_ACCOUNTS_PTS;
        }
        fingerprintScores.set(uid, entry);
      }
    }

    // ── 3: Fast completion per user ──
    const fastCompletionRows = await db
      .select({
        userId: userTasksTable.userId,
        count: sql<number>`count(*)::int`,
      })
      .from(userTasksTable)
      .innerJoin(tasksTable, eq(userTasksTable.taskId, tasksTable.id))
      .where(
        and(
          inArray(userTasksTable.userId, userIds),
          sql`${userTasksTable.completionDurationSeconds} IS NOT NULL`,
          sql`${tasksTable.watchDuration} IS NOT NULL`,
          sql`${tasksTable.watchDuration} > 0`,
          sql`${userTasksTable.completionDurationSeconds} < ${tasksTable.watchDuration} * ${FAST_COMPLETION_RATIO}::numeric`,
        ),
      )
      .groupBy(userTasksTable.userId);

    const fastCompletionMap = new Map<number, number>(
      fastCompletionRows.filter((r) => r.userId !== null).map((r) => [r.userId as number, r.count]),
    );

    // ── 4: High submission volume per user ──
    const oneHourAgo = new Date(
      Date.now() - HIGH_VOLUME_WINDOW_HOURS * 60 * 60 * 1000,
    );
    const volumeRows = await db
      .select({
        userId: userTasksTable.userId,
        count: sql<number>`count(*)::int`,
      })
      .from(userTasksTable)
      .where(
        and(
          inArray(userTasksTable.userId, userIds),
          sql`${userTasksTable.status} IN ('Completed', 'Verified')`,
          gte(userTasksTable.completedAt, oneHourAgo),
        ),
      )
      .groupBy(userTasksTable.userId);

    const volumeMap = new Map<number, number>(
      volumeRows.filter((r) => r.userId !== null).map((r) => [r.userId as number, r.count]),
    );

    // ── 5: Duplicate image (pHash) ──
    const phashRows = await db
      .select({
        userId: userTasksTable.userId,
        proofPhash: userTasksTable.proofPhash,
        id: userTasksTable.id,
      })
      .from(userTasksTable)
      .where(
        and(
          inArray(userTasksTable.userId, userIds),
          isNotNull(userTasksTable.proofPhash),
        ),
      );

    // Group hashes by user, then check all pairs across different users
    const userToHashes = new Map<number, string[]>();
    for (const row of phashRows) {
      if (!row.userId || !row.proofPhash) continue;
      const arr = userToHashes.get(row.userId) ?? [];
      arr.push(row.proofPhash);
      userToHashes.set(row.userId, arr);
    }

    const duplicateImageUsers = new Set<number>();
    const allHashList = phashRows.filter((r) => r.userId && r.proofPhash) as {
      userId: number; proofPhash: string; id: number;
    }[];
    for (let i = 0; i < allHashList.length; i++) {
      for (let j = i + 1; j < allHashList.length; j++) {
        const a = allHashList[i];
        const b = allHashList[j];
        if (a.userId !== b.userId && hammingDistance(a.proofPhash, b.proofPhash) <= PHASH_DUPLICATE_THRESHOLD) {
          duplicateImageUsers.add(a.userId);
          duplicateImageUsers.add(b.userId);
        }
      }
    }

    // ── 6: Suspicious EXIF (editing tool or AI-generated) ──
    const exifRows = await db
      .select({
        userId: userTasksTable.userId,
        proofExifFlags: userTasksTable.proofExifFlags,
      })
      .from(userTasksTable)
      .where(
        and(
          inArray(userTasksTable.userId, userIds),
          isNotNull(userTasksTable.proofExifFlags),
        ),
      );

    const suspiciousExifUsers = new Set<number>();
    for (const row of exifRows) {
      if (!row.userId || !row.proofExifFlags) continue;
      try {
        const flags = JSON.parse(row.proofExifFlags);
        if (flags.editingToolDetected || flags.noExif) {
          suspiciousExifUsers.add(row.userId);
        }
      } catch { /* skip malformed */ }
    }

    // ── Build results ──
    const flaggedUsers: FraudUser[] = [];
    const updates: { id: number; riskScore: number; isFlagged: boolean }[] = [];

    for (const user of allUsers) {
      const fpScore = fingerprintScores.get(user.id);
      const sharedFingerprint = fpScore?.sharedFingerprint ?? 0;
      const multipleAccounts = fpScore?.multipleAccounts ?? 0;
      const fastCompletion = (fastCompletionMap.get(user.id) ?? 0) > 0 ? FAST_COMPLETION_PTS : 0;
      const highVolume = (volumeMap.get(user.id) ?? 0) >= HIGH_VOLUME_LIMIT ? HIGH_VOLUME_PTS : 0;
      const duplicateImage = duplicateImageUsers.has(user.id) ? DUPLICATE_IMAGE_PTS : 0;
      const suspiciousExif = suspiciousExifUsers.has(user.id) ? SUSPICIOUS_EXIF_PTS : 0;

      const riskScore =
        sharedFingerprint + multipleAccounts + fastCompletion + highVolume + duplicateImage + suspiciousExif;

      updates.push({ id: user.id, riskScore, isFlagged: riskScore > FLAG_THRESHOLD });

      if (riskScore > FLAG_THRESHOLD) {
        flaggedUsers.push({
          userId: user.id,
          userName: user.name,
          userEmail: user.email,
          riskScore,
          breakdown: {
            sharedFingerprint,
            multipleAccounts,
            fastCompletion,
            highVolume,
            duplicateImage,
            suspiciousExif,
          },
          completedTasks: user.completedTasksCount,
        });
      }
    }

    // Batch updates to avoid O(N) round-trips and table locking
    const BATCH_SIZE = 100;
    for (let i = 0; i < updates.length; i += BATCH_SIZE) {
      const batch = updates.slice(i, i + BATCH_SIZE);
      await db.transaction(async (tx) => {
        for (const u of batch) {
          await tx
            .update(usersTable)
            .set({
              fraudRiskScore: u.riskScore,
              isFlagged: u.isFlagged,
            })
            .where(eq(usersTable.id, u.id));
        }
      });
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