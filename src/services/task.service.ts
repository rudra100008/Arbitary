import crypto from "crypto";
import { db } from "@/src/db";
import {
  tasksTable,
  userTasksTable,
  usersTable,
  shareTasksTable,
  shareClicksTable,
  watchSessionsTable,
  dailyLoginTable,
  dailyTaskCompletionsTable,
  uploadAnalysisTable,
} from "@/src/db/schema";
import { eq, and, desc, sql, or, gte, lt, inArray, not, type SQL, isNotNull, ne, ilike } from "drizzle-orm";
import { hammingDistance, PHASH_DUPLICATE_THRESHOLD } from "@/src/lib/image-analysis";
import { deleteCloudinaryImage } from "@/src/lib/cloudinary";
import { calculateStreak, getNextMilestone, toDateStr, getCycleStart } from "@/src/lib/streak-helper";
import { getStreakMultiplier } from "@/src/lib/gamification";
import {
  getVerificationCode,
  findCodeInComments,
  checkUserCommentedOnPost,
} from "@/src/lib/facebook";
import { buildLowQualityCommentMessage } from "@/src/lib/comment-quality";
import { InstagramService } from "@/src/lib/instagram";
import { YouTubeService } from "./youtube.service";
import { ReferralService } from "./referral.service";
import { isYtLike, isYtSubscribe, isYtComment } from "@/src/lib/task-detector";
import { pointsLogTable } from "@/src/db/schema";
import { ServiceResult, ok, fail } from "./result";
import type { Task, UserTask } from "@/src/types/db";
import { TASK_STATUS } from "@/src/lib/constants/task-status";
import { NotificationService } from "./notification.service";
import { submissionRejectedEmailHtml } from "@/src/lib/emails/submission-rejected";
import { FeatureFlagService, TogglePlatform } from "./feature-flag.service";

/** Platforms that are gated by a feature flag ("facebook" | "instagram"). */
function asToggleablePlatform(platform: string | null | undefined): TogglePlatform | null {
  if (platform === "facebook" || platform === "instagram") return platform;
  return null;
}

export type UserTaskItem = {
  id: number;
  title: string;
  description: string | null;
  taskType: string | null;
  points: number;
  postUrl: string | null;
  platform: string | null;
  socialPostId: string | null;
  created: string;
  watchDuration: number | null;
  difficulty: string;
  isFlash: boolean;
  isShare: boolean;
  expiresAt: string | null;
  isExpired: boolean;
  userStatus: string | null;
  userAssignedAt: Date | null;
  completedAt: Date | null;
  shareLink: string | null;
  shareClickCount: number;
  shareClickThreshold: number;
  sharePointsAwarded: boolean;
  commentInstruction?: string | null;
  /** true = Daily Refresh, false/null = Permanent */
  isRecurring: boolean;
};

export type UserTasksPage = {
  tasks: UserTaskItem[];
  nextCursor: string | null;
};

export type DashboardResponse = {
  inProgress: UserTaskItem[];
  available: UserTaskItem[];
  rejected: UserTaskItem[];
  completed: UserTaskItem[];
  systemTasks: UserTaskItem[];
  availableTaskTypes: string[];
  availableNextCursor: string | null;
};

export type DailyLoginResult = {
  message: string;
  pointsAwarded: number;
  basePoints: number;
  bonusPoints: number;
  streak: number;
  longestStreak: number;
  nextMilestone: { days: number; bonus: number } | null;
};

export type FacebookCompleteResult = {
  message: string;
  pointsAwarded: number;
  verificationCode?: string;
};

export type InstagramCompleteResult = {
  message: string;
  pointsAwarded: number;
  verificationCode?: string;
  requiresScreenshot?: boolean;
};

export type YoutubeCompleteResult = {
  message?: string;
  requiresScreenshot?: boolean;
  privacyBlocked?: boolean;
};

export type CompletedTodayResult = {
  count: number;
};

export type AdminTaskItem = {
  id: number;
  title: string;
  description: string | null;
  taskType: string | null;
  rewardPoint: number;
  postUrl: string | null;
  socialPostUrl: string | null;
  videoUrl: string | null;
  platform: string | null;
  socialPostId: string | null;
  watchDuration: number | null;
  difficulty: string;
  isFlash: boolean;
  isShare: boolean;
  shareThreshold: number | null;
  expiresAt: string | null;
  created: string;
  completedUsers: number;
  isRecurring: boolean;
};

export type AdminTasksPage = {
  tasks: AdminTaskItem[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
};

export type SubmissionItem = {
  id: number;
  taskId: number;
  userId: number;
  userName: string | null;
  userEmail: string;
  taskTitle: string;
  taskType: string | null;
  taskPlatform: string | null;
  watchDuration: number | null;
  points: number;
  status: string;
  proofUrl: string | null;
  proofImageUrl: string | null;
  assignedAt: Date | null;
  completedAt: Date | null;
};

/**
 * Extracts the Cloudinary public_id from a secure_url produced by /api/upload.
 * publicId is generated there as `${userId}_${timestamp}` and ends up as the
 * filename (sans extension) of the URL path, e.g.
 * https://res.cloudinary.com/<cloud>/image/upload/v123/arbitrary/task-proofs/42_1718980000000.jpg
 * Returns null for URLs that don't match the expected shape (e.g. not from
 * our upload flow) — callers must treat that as "no server record available".
 */
function extractCloudinaryPublicId(url: string): string | null {
  try {
    const pathname = new URL(url).pathname;
    const filename = pathname.split("/").pop();
    if (!filename) return null;
    const withoutExt = filename.replace(/\.[a-zA-Z0-9]+$/, "");
    return /^\d+_\d+$/.test(withoutExt) ? withoutExt : null;
  } catch {
    return null;
  }
}

export const TaskService = {
  async getUserTasks(
    userId: number,
    limit: number = 10,
    cursor?: { createdAt: string; id: number } | null,
    filter?: 'available' | 'completed',
    taskType?: string,
  ): Promise<ServiceResult<UserTasksPage>> {
    const [user] = await db
      .select({
        dailyLoginDate: usersTable.dailyLoginDate,
        currentStreak: usersTable.currentStreak,
        longestStreak: usersTable.longestStreak,
      })
      .from(usersTable)
      .where(eq(usersTable.id, userId));

    if (!user) return fail("User not found", 404);

    const todayStart = getCycleStart();
    const today = new Date().toISOString().split("T")[0];
    const dailyLoginStr = toDateStr(user?.dailyLoginDate);

    // Never show tasks for a disabled platform in the "available" list —
    // users shouldn't be able to pick up something they can't complete.
    // (Completed history is left alone: a task the user already finished
    // should still show up there even if the platform is later disabled.)
    const disabledPlatforms: TogglePlatform[] = [];
    if (filter === 'available' || filter === undefined) {
      const flagsResult = await FeatureFlagService.getFlags();
      if (flagsResult.success) {
        for (const platform of ["facebook", "instagram"] as TogglePlatform[]) {
          if (!flagsResult.data[platform]) disabledPlatforms.push(platform);
        }
      }
    }

    // Build WHERE conditions
    const conditions: (SQL | undefined)[] = [];

    if (disabledPlatforms.length > 0) {
      conditions.push(not(inArray(tasksTable.platform, disabledPlatforms)));
    }

    if (filter === 'available' || filter === 'completed') {
      // Find tasks the user has Completed/Verified — with time-period awareness
      // Uses shared helper — keep in sync with getCompletedTasks() inline filter
      const completedIds = await getValidCompletedTaskIds(userId, todayStart);

      if (filter === 'available') {
        if (completedIds.length > 0) {
          conditions.push(not(inArray(tasksTable.id, completedIds)));
        }
      } else if (filter === 'completed') {
        if (completedIds.length > 0) {
          conditions.push(inArray(tasksTable.id, completedIds));
        } else {
          return ok({ tasks: [], nextCursor: null });
        }
      }
    }

    if (cursor) {
      conditions.push(
        or(
          lt(tasksTable.createdAt, new Date(cursor.createdAt)),
          and(
            eq(tasksTable.createdAt, new Date(cursor.createdAt)),
            lt(tasksTable.id, cursor.id),
          ),
        ),
      );
    }

    if (taskType && taskType !== "all") {
      conditions.push(eq(tasksTable.taskType, taskType));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // ── Completed mode: fetch all, no pagination ──
    if (filter === 'completed') {
      const allTasks = await db
        .select()
        .from(tasksTable)
        .where(whereClause)
        .orderBy(desc(tasksTable.createdAt), desc(tasksTable.id));

      const taskIds = allTasks.map((t) => t.id);
      const userTasksRows = taskIds.length > 0
        ? await db
          .selectDistinctOn([userTasksTable.taskId], {
            id: userTasksTable.id,
            taskId: userTasksTable.taskId,
            status: userTasksTable.status,
            proofUrl: userTasksTable.proofUrl,
            assignedAt: userTasksTable.assignedAt,
            completedAt: userTasksTable.completedAt,
          })
          .from(userTasksTable)
          .where(
            and(
              eq(userTasksTable.userId, userId),
              inArray(userTasksTable.taskId, taskIds),
            ),
          )
          .orderBy(userTasksTable.taskId, desc(userTasksTable.assignedAt))
        : [];
      const userTasksMap = new Map(userTasksRows.map((ut) => [ut.taskId, ut]));

      const shareTasks = taskIds.length > 0
        ? await db
          .select()
          .from(shareTasksTable)
          .where(
            and(
              eq(shareTasksTable.userId, userId),
              inArray(shareTasksTable.taskId, taskIds),
            ),
          )
        : [];
      const shareTaskMap = new Map(shareTasks.map((st) => [st.taskId, st]));

      const mappedTasks = mapTasksToItems({
        tasks: allTasks,
        userTasksMap,
        shareTaskMap,
        dailyLoginStr,
        todayStart,
        today,
      });

      return ok({ tasks: mappedTasks, nextCursor: null });
    }

    // ── Available (or unfiltered) mode: paginated ──
    const paginatedTasks = await db
      .select()
      .from(tasksTable)
      .where(whereClause)
      .orderBy(desc(tasksTable.createdAt), desc(tasksTable.id))
      .limit(limit + 1);

    const hasNextPage = paginatedTasks.length > limit;
    const tasksPage = hasNextPage ? paginatedTasks.slice(0, limit) : paginatedTasks;

    const nextCursor: string | null = hasNextPage
      ? JSON.stringify({
        createdAt: tasksPage[tasksPage.length - 1].createdAt?.toISOString(),
        id: tasksPage[tasksPage.length - 1].id,
      })
      : null;

    const taskIds = tasksPage.map((t) => t.id);
    const userTasksRows = taskIds.length > 0
      ? await db
        .selectDistinctOn([userTasksTable.taskId], {
          id: userTasksTable.id,
          taskId: userTasksTable.taskId,
          status: userTasksTable.status,
          proofUrl: userTasksTable.proofUrl,
          assignedAt: userTasksTable.assignedAt,
          completedAt: userTasksTable.completedAt,
        })
        .from(userTasksTable)
        .where(
          and(
            eq(userTasksTable.userId, userId),
            inArray(userTasksTable.taskId, taskIds),
          ),
        )
        .orderBy(userTasksTable.taskId, desc(userTasksTable.assignedAt))
      : [];
    const userTasksMap = new Map(userTasksRows.map((ut) => [ut.taskId, ut]));

    const shareTasks = taskIds.length > 0
      ? await db
        .select()
        .from(shareTasksTable)
        .where(
          and(
            eq(shareTasksTable.userId, userId),
            inArray(shareTasksTable.taskId, taskIds),
          ),
        )
      : [];
    const shareTaskMap = new Map(shareTasks.map((st) => [st.taskId, st]));

    const mappedTasks = mapTasksToItems({
      tasks: tasksPage,
      userTasksMap,
      shareTaskMap,
      dailyLoginStr,
      todayStart,
      today,
    });

    return ok({ tasks: mappedTasks, nextCursor });
  },

  async getDashboardTasks(
    userId: number,
    taskType?: string,
    cursor?: string,
    limit: number = 10,
  ): Promise<ServiceResult<DashboardResponse>> {
    const [user] = await db
      .select({
        dailyLoginDate: usersTable.dailyLoginDate,
        currentStreak: usersTable.currentStreak,
        longestStreak: usersTable.longestStreak,
      })
      .from(usersTable)
      .where(eq(usersTable.id, userId));

    if (!user) return fail("User not found", 404);

    const todayStart = getCycleStart();
    const today = new Date().toISOString().split("T")[0];
    const dailyLoginStr = toDateStr(user?.dailyLoginDate);

    // ── Completed task IDs (period-aware, using shared helper) ──
    // Uses getValidCompletedTaskIds() for exclusion — keep in sync with getCompletedTasks() inline filter
    const completedIds = await getValidCompletedTaskIds(userId, todayStart);

    // ── Active user tasks (in-progress / pending-verification / rejected) ──
    const activeUserTasksRows = await db
      .select()
      .from(userTasksTable)
      .innerJoin(tasksTable, eq(userTasksTable.taskId, tasksTable.id))
      .where(
        and(
          eq(userTasksTable.userId, userId),
          inArray(userTasksTable.status, ['In Progress', 'Pending Verification', 'Rejected']),
          taskType && taskType !== "all"
            ? taskType === "share"
              ? eq(tasksTable.isShare, true)
              : eq(tasksTable.taskType, taskType)
            : undefined,
        ),
      );

    // Filter out expired recurring tasks from active tasks so they appear in 'available' instead
    const validActiveUserTasksRows = activeUserTasksRows.filter((row) => {
      return !(
        row.tasks.isRecurring &&
        row.user_tasks.assignedAt &&
        row.user_tasks.assignedAt < todayStart
      );
    });

    const activeTaskIds = validActiveUserTasksRows
      .map((r) => r.tasks.id)
      .filter((id): id is number => id !== null);

    // ── Available tasks (paginated) ──
    const availableConditions: (SQL | undefined)[] = [];

    const dashboardFlagsResult = await FeatureFlagService.getFlags();
    if (dashboardFlagsResult.success) {
      const dashboardDisabledPlatforms: TogglePlatform[] = (["facebook", "instagram"] as TogglePlatform[])
        .filter((platform) => !dashboardFlagsResult.data[platform]);
      if (dashboardDisabledPlatforms.length > 0) {
        availableConditions.push(not(inArray(tasksTable.platform, dashboardDisabledPlatforms)));
      }
    }

    if (taskType && taskType !== "all") {
      availableConditions.push(
        taskType === "share"
          ? eq(tasksTable.isShare, true)
          : eq(tasksTable.taskType, taskType),
      );
    }

    if (completedIds.length > 0) {
      availableConditions.push(not(inArray(tasksTable.id, completedIds)));
    }

    if (activeTaskIds.length > 0) {
      availableConditions.push(not(inArray(tasksTable.id, activeTaskIds)));
    }

    if (cursor) {
      const parsed = JSON.parse(cursor) as { createdAt: string; id: number };
      availableConditions.push(
        or(
          lt(tasksTable.createdAt, new Date(parsed.createdAt)),
          and(
            eq(tasksTable.createdAt, new Date(parsed.createdAt)),
            lt(tasksTable.id, parsed.id),
          ),
        ),
      );
    }

    const availableWhere = availableConditions.length > 0
      ? and(...availableConditions)
      : undefined;

    const availableRaw = await db
      .select()
      .from(tasksTable)
      .where(availableWhere)
      .orderBy(desc(tasksTable.createdAt), desc(tasksTable.id))
      .limit(limit + 1);

    const hasNextPage = availableRaw.length > limit;
    const availablePage = hasNextPage ? availableRaw.slice(0, limit) : availableRaw;

    const availableNextCursor: string | null = hasNextPage
      ? JSON.stringify({
        createdAt: availablePage[availablePage.length - 1].createdAt?.toISOString(),
        id: availablePage[availablePage.length - 1].id,
      })
      : null;

    // ── Fetch user_tasks & share_tasks for active + available tasks ──
    const allTaskIds = [...new Set([...activeTaskIds, ...availablePage.map((t) => t.id)])];

    const userTasksRows = allTaskIds.length > 0
      ? await db
        .selectDistinctOn([userTasksTable.taskId], {
          id: userTasksTable.id,
          taskId: userTasksTable.taskId,
          status: userTasksTable.status,
          proofUrl: userTasksTable.proofUrl,
          assignedAt: userTasksTable.assignedAt,
          completedAt: userTasksTable.completedAt,
        })
        .from(userTasksTable)
        .where(
          and(
            eq(userTasksTable.userId, userId),
            inArray(userTasksTable.taskId, allTaskIds),
          ),
        )
        .orderBy(userTasksTable.taskId, desc(userTasksTable.assignedAt))
      : [];
    const userTasksMap = new Map(userTasksRows.map((ut) => [ut.taskId, ut]));

    const shareTaskRows = allTaskIds.length > 0
      ? await db
        .select()
        .from(shareTasksTable)
        .where(
          and(
            eq(shareTasksTable.userId, userId),
            inArray(shareTasksTable.taskId, allTaskIds),
          ),
        )
      : [];
    const shareTaskMap = new Map(shareTaskRows.map((st) => [st.taskId, st]));

    // ── Map active tasks through mapTasksToItems ──
    const activeMapped = mapTasksToItems({
      tasks: validActiveUserTasksRows.map((r) => r.tasks),
      userTasksMap,
      shareTaskMap,
      dailyLoginStr,
      todayStart,
      today,
    });

    // ── Map available page tasks ──
    const availableMapped = mapTasksToItems({
      tasks: availablePage,
      userTasksMap,
      shareTaskMap,
      dailyLoginStr,
      todayStart,
      today,
    });

    // ── Categorize active tasks ──
    const inProgress: UserTaskItem[] = [];
    const rejected: UserTaskItem[] = [];
    const completed: UserTaskItem[] = [];
    const systemTasks: UserTaskItem[] = [];

    for (const task of activeMapped) {
      if (task.platform === "system") {
        systemTasks.push(task);
        continue;
      }
      const s = task.userStatus?.toLowerCase();
      if (s === TASK_STATUS.IN_PROGRESS || s === TASK_STATUS.PENDING_VERIFICATION) {
        inProgress.push(task);
      } else if (s === TASK_STATUS.REJECTED) {
        rejected.push(task);
      } else if (s === TASK_STATUS.COMPLETED || s === TASK_STATUS.VERIFIED) {
        completed.push(task);
      }
    }

    // Available page tasks (already filtered — not completed and not active)
    const available: UserTaskItem[] = [];
    for (const task of availableMapped) {
      if (task.platform === "system") {
        systemTasks.push(task);
      } else {
        available.push(task);
      }
    }

    // ── Task types for tab generation ──
    const typeRows = await db
      .selectDistinct({ taskType: tasksTable.taskType })
      .from(tasksTable)
      .where(sql`${tasksTable.taskType} IS NOT NULL`);

    const availableTaskTypes = typeRows
      .map((r) => r.taskType)
      .filter(Boolean) as string[];

    const [shareTaskExists] = await db
      .select({ id: tasksTable.id })
      .from(tasksTable)
      .where(eq(tasksTable.isShare, true))
      .limit(1);

    if (shareTaskExists && !availableTaskTypes.includes("share")) {
      availableTaskTypes.push("share");
    }
    return ok({
      inProgress,
      available,
      rejected,
      completed,
      systemTasks,
      availableTaskTypes,
      availableNextCursor,
    });
  },

  async getCompletedTasks(
    userId: number,
    limit: number = 50,
    cursor?: { completedAt: string; id: number } | null,
  ): Promise<ServiceResult<UserTasksPage>> {
    const todayStart = getCycleStart();

    // Inline filter: mirrors getValidCompletedTaskIds() logic for inclusion (vs exclusion in dashboard)
    // Uses the same or() clause directly to avoid a second round-trip for completed data.
    // Keep this condition in sync with getValidCompletedTaskIds().
    const conditions: (SQL | undefined)[] = [
      eq(userTasksTable.userId, userId),
      inArray(userTasksTable.status, ['Completed', 'Verified']),
      or(
        // Permanent tasks: always show in completed
        not(eq(tasksTable.isRecurring, true)),
        // Daily Refresh tasks: only show today's completion
        and(
          eq(tasksTable.isRecurring, true),
          isNotNull(userTasksTable.assignedAt),
          gte(userTasksTable.assignedAt, todayStart),
        ),
      ),
    ];

    if (cursor) {
      conditions.push(
        or(
          lt(userTasksTable.completedAt, new Date(cursor.completedAt)),
          and(
            eq(userTasksTable.completedAt, new Date(cursor.completedAt)),
            lt(userTasksTable.taskId, cursor.id),
          ),
        ),
      );
    }

    const rows = await db
      .select({
        userTask: userTasksTable,
        task: tasksTable,
      })
      .from(userTasksTable)
      .innerJoin(tasksTable, eq(userTasksTable.taskId, tasksTable.id))
      .where(and(...conditions))
      .orderBy(desc(userTasksTable.completedAt), desc(userTasksTable.taskId))
      .limit(limit + 1);

    const hasNextPage = rows.length > limit;
    const pageRows = hasNextPage ? rows.slice(0, limit) : rows;

    const taskIds = pageRows.map((r) => r.task.id);
    const shareTasks = taskIds.length > 0
      ? await db
        .select()
        .from(shareTasksTable)
        .where(
          and(
            eq(shareTasksTable.userId, userId),
            inArray(shareTasksTable.taskId, taskIds),
          ),
        )
      : [];
    const shareTaskMap = new Map(shareTasks.map((st) => [st.taskId, st]));

    const seenTaskIds = new Set<number>();
    const items: UserTaskItem[] = [];
    for (const r of pageRows) {
      if (seenTaskIds.has(r.task.id)) continue;
      seenTaskIds.add(r.task.id);
      const task = r.task;
      const shareInfo = shareTaskMap.get(task.id);
      items.push({
        id: task.id,
        title: task.title,
        description: task.description,
        taskType: task.taskType,
        points: task.points,
        postUrl: task.postUrl,
        platform: task.platform,
        socialPostId: task.socialPostId ?? null,
        created: task.createdAt ? new Date(task.createdAt).toLocaleDateString() : "N/A",
        watchDuration: task.watchDuration ?? null,
        difficulty: task.difficulty,
        isFlash: task.isFlash,
        isShare: task.isShare,
        isRecurring: task.isRecurring,
        expiresAt: task.expiresAt ? task.expiresAt.toISOString() : null,
        isExpired: false,
        userStatus: r.userTask.status,
        userAssignedAt: r.userTask.assignedAt,
        completedAt: r.userTask.completedAt,
        shareLink: shareInfo?.shareUrl || null,
        shareClickCount: shareInfo?.uniqueClicks || 0,
        shareClickThreshold: shareInfo?.clickThreshold || task.shareThreshold || 3,
        sharePointsAwarded: shareInfo?.pointsAwarded || false,
      });
    }

    const nextCursor: string | null = hasNextPage && pageRows.length > 0
      ? JSON.stringify({
        completedAt: pageRows[pageRows.length - 1].userTask.completedAt?.toISOString(),
        id: pageRows[pageRows.length - 1].task.id,
      })
      : null;

    return ok({ tasks: items, nextCursor });
  },

  async pickUpTask(
    userId: number,
    taskId: number,
  ): Promise<ServiceResult<{ message: string }>> {
    const [currentUser] = await db
      .select({ role: usersTable.role })
      .from(usersTable)
      .where(eq(usersTable.id, userId));
    if (currentUser?.role === "ADMIN") {
      return fail("Admins cannot pick up tasks", 403);
    }

    const [targetTask] = await db
      .select()
      .from(tasksTable)
      .where(eq(tasksTable.id, taskId));
    if (!targetTask) return fail("Task not found", 404);

    if (targetTask.platform === "daily-login") {
      const dlResult = await this.claimDailyLogin(userId);
      if (!dlResult.success) return dlResult;
      return ok({ message: dlResult.data.message });
    }

    const gatedPlatform = asToggleablePlatform(targetTask.platform);
    if (gatedPlatform) {
      const platformEnabled = await FeatureFlagService.isPlatformEnabled(gatedPlatform);
      if (!platformEnabled) {
        return fail(
          `${gatedPlatform === "facebook" ? "Facebook" : "Instagram"} tasks are temporarily unavailable.`,
          403,
          "FEATURE_DISABLED",
        );
      }
    }

    const now = new Date();
    const todayStart = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    );

    const result = await db.transaction(async (tx) => {
      await tx.execute(sql`SELECT id FROM ${usersTable} WHERE id = ${userId} FOR UPDATE`);

      // Delete any previous rejected entry for this task
      const [existingRejected] = await tx
        .select()
        .from(userTasksTable)
        .where(
          and(
            eq(userTasksTable.userId, userId),
            eq(userTasksTable.taskId, taskId),
            eq(userTasksTable.status, "Rejected"),
          ),
        );

      if (existingRejected) {
        if (existingRejected.proofImageUrl) {
          await deleteCloudinaryImage(existingRejected.proofImageUrl);
        }
        if (
          existingRejected.proofUrl &&
          existingRejected.proofUrl !== existingRejected.proofImageUrl &&
          existingRejected.proofUrl.includes("cloudinary.com")
        ) {
          await deleteCloudinaryImage(existingRejected.proofUrl);
        }
        await tx
          .delete(userTasksTable)
          .where(eq(userTasksTable.id, existingRejected.id));
      }

      // Prevent re-picking the same task (In Progress, Completed, Verified, Pending Verification)
      const [existingNonRejected] = await tx
        .select()
        .from(userTasksTable)
        .where(
          and(
            eq(userTasksTable.userId, userId),
            eq(userTasksTable.taskId, taskId),
            ne(userTasksTable.status, "Rejected"),
          ),
        );

      if (existingNonRejected) {
        // Handle Daily Refresh Task Reset: allow picking up again if previous attempt was before today
        if (targetTask.isRecurring) {
          const assignedAt = existingNonRejected.assignedAt;
          if (assignedAt && assignedAt < todayStart) {
            // It's a daily refresh task from a previous day — delete the old record and allow re-pickup
            await tx
              .delete(userTasksTable)
              .where(eq(userTasksTable.id, existingNonRejected.id));
          } else {
            return fail("You have already picked up this task today", 400);
          }
        } else {
          return fail("You have already picked up this task", 400);
        }
      }

      const existingActiveTasks = await tx
        .select({ userTask: userTasksTable, task: tasksTable })
        .from(userTasksTable)
        .innerJoin(tasksTable, eq(userTasksTable.taskId, tasksTable.id))
        .where(
          and(
            eq(userTasksTable.userId, userId),
            inArray(userTasksTable.status, ['In Progress', 'Pending Verification']),
            eq(tasksTable.taskType, targetTask.taskType!),
          ),
        );

      // Filter out any active tasks that are expired recurring tasks
      const actuallyActive = existingActiveTasks.filter((row) => {
        return !(
          row.task.isRecurring &&
          row.userTask.assignedAt &&
          row.userTask.assignedAt < todayStart
        );
      });

      if (actuallyActive.length > 0) {
        return fail(
          `You can only pick up one ${targetTask.taskType} task at a time.`,
          400,
        );
      }

      await tx
        .insert(userTasksTable)
        .values({
          userId,
          taskId,
          status: "In Progress",
          assignedAt: now,
        })
        .returning();

      return ok(null);
    });

    if (!result.success) return result;

    if (targetTask.isShare) {
      const shareCode = crypto.randomUUID().replace(/-/g, "").slice(0, 10);
      const base =
        process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXTAUTH_URL || "";
      const shareUrl = `${base}/r/${shareCode}`;
      const targetUrl = targetTask.postUrl || "";

      await db.insert(shareTasksTable).values({
        taskId: targetTask.id,
        userId,
        shareCode,
        targetUrl,
        shareUrl,
        clickThreshold: targetTask.shareThreshold || 3,
      });
    }

    return ok({ message: "Task picked up successfully" });
  },

  async cancelTask(userId: number, taskId: number): Promise<ServiceResult<{ message: string }>> {
    const shareTask = await db
      .select({ shareCode: shareTasksTable.shareCode })
      .from(shareTasksTable)
      .where(
        and(eq(shareTasksTable.userId, userId), eq(shareTasksTable.taskId, taskId)),
      )
      .then((rows) => rows[0]);

    if (shareTask) {
      await db
        .delete(shareClicksTable)
        .where(eq(shareClicksTable.shareCode, shareTask.shareCode));
      await db
        .delete(shareTasksTable)
        .where(
          and(eq(shareTasksTable.userId, userId), eq(shareTasksTable.taskId, taskId)),
        );
    }

    await db
      .delete(userTasksTable)
      .where(and(eq(userTasksTable.userId, userId), eq(userTasksTable.taskId, taskId)));

    return ok({ message: "Task cancelled successfully" });
  },

  async updateTaskStatus(
    userId: number,
    taskId: number,
    status: string,
    proofUrl?: string,
    proofImageUrl?: string,
  ): Promise<ServiceResult<{ message: string }>> {
    if (status !== "Pending Verification") {
      return fail("You can only submit proof for verification", 400);
    }

    const [userTask] = await db
      .select({ id: userTasksTable.id, status: userTasksTable.status })
      .from(userTasksTable)
      .where(
        and(eq(userTasksTable.userId, userId), eq(userTasksTable.taskId, taskId)),
      );
    if (!userTask) return fail("Task not found", 404);

    const updateData: Record<string, unknown> = {};

    // Allow idempotent status re-apply when attaching proof
    if (userTask.status !== status) {
      updateData.status = status;
    }

    if (proofUrl) updateData.proofUrl = proofUrl;
    if (proofImageUrl) {
      updateData.proofImageUrl = proofImageUrl;
    } else if (proofUrl) {
      updateData.proofImageUrl = proofUrl;
    }

    // Only stamp submittedAt when this call actually represents a submission
    // (a status transition or new proof) — not on a no-op idempotency check.
    if (updateData.status !== undefined || proofUrl || proofImageUrl) {
      updateData.submittedAt = new Date();
    }

    // ── Server-side phash/EXIF lookup ─────────────────────────────────────
    // Never trust client-submitted phash/EXIF — look up the values the
    // server itself computed at upload time (/api/upload), keyed by the
    // Cloudinary publicId embedded in the URL. If no record is found
    // (tampering, or a URL that didn't come from our upload flow), proof
    // analysis is treated as unavailable rather than attacker-controlled.
    const proofSourceUrl = proofImageUrl || proofUrl;
    if (proofSourceUrl) {
      const publicId = extractCloudinaryPublicId(proofSourceUrl);
      const analysis = publicId
        ? await db
          .select()
          .from(uploadAnalysisTable)
          .where(
            and(
              eq(uploadAnalysisTable.publicId, publicId),
              eq(uploadAnalysisTable.userId, userId), // ownership check
            ),
          )
          .then((rows) => rows[0])
        : undefined;

      if (analysis) {
        updateData.proofPhash = analysis.phash ?? null;
        updateData.proofExifFlags = analysis.exifFlags ?? null;

        let isDuplicateProof = false;
        if (analysis.phash) {
          const existingHashes = await db
            .select({ id: userTasksTable.id, proofPhash: userTasksTable.proofPhash })
            .from(userTasksTable)
            .where(
              and(
                isNotNull(userTasksTable.proofPhash),
                ne(userTasksTable.id, userTask.id), // don't flag against this same submission
              ),
            );
          for (const row of existingHashes) {
            if (row.proofPhash && hammingDistance(analysis.phash, row.proofPhash) <= PHASH_DUPLICATE_THRESHOLD) {
              isDuplicateProof = true;
              break;
            }
          }
        }
        updateData.isDuplicateProof = isDuplicateProof;
      } else {
        // No trustworthy server record — best-effort: don't claim a clean result.
        updateData.proofPhash = null;
        updateData.proofExifFlags = null;
        updateData.isDuplicateProof = false;
      }
    }

    if (Object.keys(updateData).length === 0) {
      return fail("Task is already in this status", 400);
    }

    const [updated] = await db
      .update(userTasksTable)
      .set(updateData)
      .where(eq(userTasksTable.id, userTask.id))
      .returning();

    if (!updated) return fail("Task not found", 404);
    return ok({ message: "Task status updated" });
  },

  /**
   * Cheap, lock-free check for whether the user has already claimed today's
   * daily login reward. Intended to run BEFORE the rate limiter, so that
   * repeat/expected "already claimed" checks (e.g. from page reloads) never
   * consume rate-limit budget that's meant to protect the write path.
   *
   * This is a plain read with no `FOR UPDATE` lock — it's a fast-path
   * optimization only. The authoritative, race-safe check still happens
   * inside claimDailyLogin's locked transaction below.
   */
  async hasDailyLoginClaimedToday(userId: number): Promise<boolean> {
    const today = new Date().toISOString().split("T")[0];
    const [existing] = await db
      .select({ claimedAt: dailyLoginTable.claimedAt })
      .from(dailyLoginTable)
      .where(eq(dailyLoginTable.userId, userId));
    return existing ? toDateStr(existing.claimedAt) === today : false;
  },

  async claimDailyLogin(
    userId: number,
  ): Promise<ServiceResult<DailyLoginResult>> {
    const DAILY_LOGIN_POINTS = 5; // 5 points per daily login
    const today = new Date().toISOString().split("T")[0];

    return await db.transaction(async (tx) => {
      const [user] = await tx
        .select()
        .from(usersTable)
        .where(eq(usersTable.id, userId))
        .for("update");
      if (!user) return fail("User not found", 404);

      // Check existing daily login row
      const [existing] = await tx
        .select()
        .from(dailyLoginTable)
        .where(eq(dailyLoginTable.userId, userId));

      const lastClaimedStr = existing ? toDateStr(existing.claimedAt) : null;
      if (lastClaimedStr === today) {
        return fail("You already claimed your daily login reward today", 429, "ALREADY_CLAIMED");
      }

      const { newStreak, bonus } = calculateStreak(
        existing?.claimedAt ?? null,
        user.currentStreak || 0,
      );
      const newLongest = Math.max(user.longestStreak || 0, newStreak);
      const basePoints = DAILY_LOGIN_POINTS;
      const bonusPoints = bonus;
      const totalPoints = basePoints + bonusPoints;

      // Upsert the daily login row (one row per user)
      await tx
        .insert(dailyLoginTable)
        .values({ userId, claimedAt: new Date(), streak: newStreak })
        .onConflictDoUpdate({
          target: dailyLoginTable.userId,
          set: { claimedAt: new Date(), streak: newStreak },
        });

      await tx
        .update(usersTable)
        .set({
          lastLoginAt: new Date(),
          currentStreak: newStreak,
          longestStreak: newLongest,
          points: sql`${usersTable.points} + ${totalPoints}`,
          monthlyPoints: sql`${usersTable.monthlyPoints} + ${totalPoints}`,
          completedTasksCount: sql`${usersTable.completedTasksCount} + 1`,
        })
        .where(eq(usersTable.id, userId));

      await tx.insert(pointsLogTable).values({
        userId,
        points: totalPoints,
        reason: `Daily login streak day ${newStreak}${bonusPoints > 0 ? ` (+${bonusPoints} milestone bonus)` : ""}`,
      });

      const nextMilestone = getNextMilestone(newStreak);

      return ok({
        message:
          bonus > 0
            ? `Daily login reward claimed! Streak milestone bonus: +${bonus} pts!`
            : "Daily login reward claimed!",
        pointsAwarded: totalPoints,
        basePoints,
        bonusPoints: bonus,
        streak: newStreak,
        longestStreak: newLongest,
        nextMilestone: nextMilestone
          ? { days: nextMilestone.days, bonus: nextMilestone.bonus }
          : null,
      });
    });
  },
  async completeFacebookTask(
    userId: number,
    taskId: number,
    facebookId?: string,
    fingerprint?: string,
  ): Promise<ServiceResult<FacebookCompleteResult>> {
    const [user] = await db
      .select({ currentStreak: usersTable.currentStreak })
      .from(usersTable)
      .where(eq(usersTable.id, userId));
    const multiplier = getStreakMultiplier(user?.currentStreak || 0);

    const [userTaskWithTask] = await db
      .select({ userTask: userTasksTable, task: tasksTable })
      .from(userTasksTable)
      .innerJoin(tasksTable, eq(userTasksTable.taskId, tasksTable.id))
      .where(
        and(
          eq(userTasksTable.userId, userId),
          eq(userTasksTable.taskId, taskId),
          sql`${userTasksTable.status} NOT IN ('Completed', 'Verified', 'Cancelled')`,
        ),
      )
      .orderBy(desc(userTasksTable.assignedAt));

    if (!userTaskWithTask) return fail("Task not found or not picked up by you", 404);

    const { userTask, task } = userTaskWithTask;
    if (task.platform !== "facebook") return fail("This endpoint is only for Facebook tasks", 400);

    const postId = task.socialPostId;
    if (!postId) return fail("This task has no Facebook post linked", 400);

    const code = getVerificationCode(Number(userId), Number(taskId), '#fb');
    const codeResult = await findCodeInComments(postId, code);

    if (codeResult.error) {
      // Facebook's v2.4+ Graph API no longer supports the singular-status
      // endpoint (#12 "statuses API is deprecated"). This is a configuration
      // issue on the server side — not something the user did wrong.
      // Return a friendly message and a 503 (service unavailable) so the
      // client doesn't show a raw internal error.
      const isDeprecated =
        codeResult.error.includes("deprecated") ||
        codeResult.error.includes("#12") ||
        codeResult.error.includes("singular statuses");

      if (isDeprecated) {
        return fail(
          "Our Facebook verification service is temporarily unavailable. Please try again later or contact support.",
          503,
        );
      }

      // Other Facebook API errors (bad token, post not found, rate limit, etc.)
      const isAuthError =
        codeResult.error.toLowerCase().includes("token") ||
        codeResult.error.toLowerCase().includes("permission") ||
        codeResult.error.toLowerCase().includes("oauth");

      if (isAuthError) {
        return fail(
          "Facebook verification is temporarily unavailable. Please try again in a few minutes.",
          503,
        );
      }

      // Generic fallback — log internally but show a clean message to the user
      console.error("[Facebook verification] API error:", codeResult.error);
      return fail(
        "Could not reach Facebook to verify your comment. Please check your internet connection and try again.",
        503,
      );
    }

    if (codeResult.liked) {
      if (!codeResult.hasQualityComment) {
        return fail(buildLowQualityCommentMessage(code), 422);
      }
      return await awardFacebookPoints(userId, task, userTask, multiplier, fingerprint);
    }

    if (facebookId) {
      const asidResult = await checkUserCommentedOnPost(postId, "", facebookId, code);
      if (asidResult.liked) {
        if (!asidResult.hasQualityComment) {
          return fail(buildLowQualityCommentMessage(code), 422);
        }
        return await awardFacebookPoints(userId, task, userTask, multiplier, fingerprint);
      }
    }

    return fail(`Couldn't find your comment with code "${code}" on the post.`, 429);
  },

  async completeInstagramTask(
    userId: number,
    taskId: number,
    fingerprint?: string,
  ): Promise<ServiceResult<InstagramCompleteResult>> {
    const [user] = await db
      .select({ currentStreak: usersTable.currentStreak, instagramUsername: usersTable.instagramUsername })
      .from(usersTable)
      .where(eq(usersTable.id, userId));

    if (!user?.instagramUsername) {
      return fail("Please link your Instagram username in your profile first", 401);
    }

    const multiplier = getStreakMultiplier(user.currentStreak || 0);

    const [userTaskWithTask] = await db
      .select({ userTask: userTasksTable, task: tasksTable })
      .from(userTasksTable)
      .innerJoin(tasksTable, eq(userTasksTable.taskId, tasksTable.id))
      .where(
        and(
          eq(userTasksTable.userId, userId),
          eq(userTasksTable.taskId, taskId),
          sql`${userTasksTable.status} NOT IN ('Completed', 'Verified', 'Cancelled')`,
        ),
      )
      .orderBy(desc(userTasksTable.assignedAt));

    if (!userTaskWithTask) return fail("Task not found or not picked up by you", 404);

    const { userTask, task } = userTaskWithTask;
    if (task.platform !== "instagram") return fail("This endpoint is only for Instagram tasks", 400);

    const postId = task.socialPostId;
    if (!postId) return fail("This task has no Instagram post linked", 400);

    const code = getVerificationCode(Number(userId), Number(taskId), '#ig');

    try {
      const verification = await InstagramService.findCodeInComments(postId, code, user.instagramUsername);

      if (verification.found) {
        if (!verification.hasQualityComment) {
          return fail(buildLowQualityCommentMessage(code), 422);
        }
        return await awardInstagramPoints(userId, task, userTask, multiplier, fingerprint);
      }
    } catch (error: unknown) {
      return fail(`Instagram API error: ${error instanceof Error ? error.message : error}`, 500);
    }

    // Fallback: auto-verification failed — set to Pending Verification for admin review
    await db
      .update(userTasksTable)
      .set({ status: "Pending Verification" })
      .where(eq(userTasksTable.id, userTask.id));

    return ok({
      message: "Could not verify your comment automatically. Please upload a screenshot as proof.",
      pointsAwarded: 0,
      requiresScreenshot: true,
    });
  },

  async completeYoutubeTask(
    userId: number,
    taskId: number,
    sessionId?: number,
    fingerprint?: string,
  ): Promise<ServiceResult<YoutubeCompleteResult>> {
    const [user] = await db
      .select({ currentStreak: usersTable.currentStreak })
      .from(usersTable)
      .where(eq(usersTable.id, userId));
    const multiplier = getStreakMultiplier(user?.currentStreak || 0);

    const [userTaskWithTask] = await db
      .select({
        userTask: userTasksTable,
        task: tasksTable,
      })
      .from(userTasksTable)
      .innerJoin(tasksTable, eq(userTasksTable.taskId, tasksTable.id))
      .where(
        and(
          eq(userTasksTable.userId, userId),
          eq(userTasksTable.taskId, taskId),
          sql`LOWER(${userTasksTable.status}) NOT IN ('completed', 'verified', 'cancelled')`,
        ),
      )
      .orderBy(desc(userTasksTable.assignedAt))
      .limit(1);

    if (!userTaskWithTask) {
      return fail("Task not found or not picked up by you", 404);
    }

    const { userTask, task } = userTaskWithTask;

    if (task.platform !== "youtube" && task.taskType !== "video_watch" && task.taskType !== "VIDEO_WATCH") {
      return fail("This endpoint is only for YouTube tasks", 400);
    }

    const taskType = task.taskType;
    const pointsAwarded = task.points || 0;

    if (isYtSubscribe(task) || isYtLike(task) || isYtComment(task)) {
      const tokenResult = await YouTubeService.getAuthorizedClient(userId);
      if (!tokenResult.success) {
        return fail(tokenResult.error || "Link your YouTube account in settings first", 401);
      }
      const accessToken = tokenResult.data;

      if (isYtSubscribe(task)) {
        const channelId = task.socialPostId || extractChannelId(task.postUrl);
        if (!channelId) {
          return fail("No YouTube channel linked to this task", 400);
        }
        const resolvedId = channelId.startsWith("@")
          ? await YouTubeService.resolveChannelHandle(channelId, accessToken)
          : channelId;
        if (!resolvedId) {
          return fail("Could not resolve YouTube channel", 400);
        }
        const subResult = await YouTubeService.verifySubscription(resolvedId, accessToken);
        if (!subResult.verified) {
          if (subResult.privacyBlocked) {
            return ok({ privacyBlocked: true });
          }
          if (subResult.needsScreenshot) {
            await db
              .update(userTasksTable)
              .set({ status: "Pending Verification" })
              .where(eq(userTasksTable.id, userTask.id));
            return ok({ message: "Subscription could not be verified automatically. Upload a screenshot as proof.", requiresScreenshot: true });
          }
          return fail("Please subscribe to the YouTube channel to complete this task", 429);
        }
      } else if (isYtLike(task)) {
        const videoId = task.socialPostId || extractVideoId(task.postUrl);
        const isLiked = videoId ? await YouTubeService.verifyLike(videoId, accessToken) : false;
        if (!isLiked) {
          return fail("Please like the video to complete this task", 429);
        }
      } else if (isYtComment(task)) {
        const videoId = task.socialPostId || extractVideoId(task.postUrl);
        if (!videoId) {
          return fail("Could not extract video ID from the task URL", 400);
        }
        const hasCommented = await YouTubeService.verifyComment(videoId, userId, taskId, accessToken);
        if (!hasCommented) {
          return fail("Please comment on the video to complete this task", 429);
        }
      }
    }

    // Watch duration check: only VIDEO_WATCH tasks require a watch session
    const isVideoWatch = taskType?.toUpperCase() === "VIDEO_WATCH";

    if (isVideoWatch) {
      if (!sessionId) {
        return fail("Watch session is required. Start the video first.", 400);
      }

      const requiredSeconds = task.watchDuration ?? 30;

      const [session] = await db
        .select()
        .from(watchSessionsTable)
        .where(
          and(
            eq(watchSessionsTable.id, sessionId),
            eq(watchSessionsTable.userId, userId),
            eq(watchSessionsTable.taskId, taskId),
          ),
        );
      if (!session) {
        return fail("Watch session not found. Start the video first.", 404);
      }

      const videoDuration = session.videoDuration || requiredSeconds;
      const accumulatedTime = session.accumulatedWatchTime || 0;

      // Check 1: accumulated time >= 75% of required duration
      const minWatchTime = Math.round(videoDuration * 0.75);
      if (accumulatedTime < minWatchTime) {
        return fail(
          `Watched ${accumulatedTime}s of ${videoDuration}s required. Please watch a bit longer.`,
          429,
        );
      }

      // Check 2: at least 1 heartbeat signal received (sanity check — accumulated
      // time is the real gate; requiring 2 falsely blocks users who resume near the end)
      const heartbeatLog = (session.heartbeatLog as number[]) || [];
      if (heartbeatLog.length < 1) {
        return fail(
          `No playback data recorded. Please start the video and watch for a moment.`,
          429,
        );
      }

      // Check 3: no single gap > 90s (more lenient, accounts for pauses/server lag)
      for (let i = 1; i < heartbeatLog.length; i++) {
        const gap = Math.abs(heartbeatLog[i] - heartbeatLog[i - 1]) / 1000;
        if (gap > 90) {
          return fail(
            `Long pause detected (${Math.round(gap)}s). Please keep watching steadily.`,
            429,
          );
        }
      }
    }

    const completionDurationSeconds =
      userTask.assignedAt
        ? Math.round((Date.now() - new Date(userTask.assignedAt).getTime()) / 1000)
        : null;

    const taskPoints = Math.round((task.points || 0) * multiplier);

    return await db.transaction(async (tx) => {
      const [userTaskLocked] = await tx
        .select()
        .from(userTasksTable)
        .where(eq(userTasksTable.id, userTask.id))
        .for("update");

      if (!userTaskLocked || ['completed', 'verified', 'cancelled'].includes(userTaskLocked.status?.toLowerCase())) {
        return fail("Task has already been completed or cancelled", 400);
      }

      const now = new Date();
      const completionDate = now.toISOString().split("T")[0];

      await tx
        .update(userTasksTable)
        .set({
          status: "Completed",
          completedAt: now,
          submissionFingerprint: fingerprint ?? null,
          completionDurationSeconds: completionDurationSeconds ?? null,
        })
        .where(eq(userTasksTable.id, userTask.id));

      const [currentUser] = await tx
        .select({ points: usersTable.points, monthlyPoints: usersTable.monthlyPoints })
        .from(usersTable)
        .where(eq(usersTable.id, userId))
        .for("update");

      if (currentUser) {
        await tx
          .update(usersTable)
          .set({
            points: sql`${usersTable.points} + ${taskPoints}`,
            monthlyPoints: sql`${usersTable.monthlyPoints} + ${taskPoints}`,
            completedTasksCount: sql`${usersTable.completedTasksCount} + 1`,
          })
          .where(eq(usersTable.id, userId));

        const reason = isYtSubscribe(task)
          ? `YouTube subscribe: ${task.title}`
          : taskType === "VIDEO_WATCH" || taskType === "video_watch"
            ? `YouTube watch: ${task.title}`
            : `YouTube task: ${task.title}`;

        await tx.insert(pointsLogTable).values({
          userId,
          taskId: task.id,
          points: taskPoints,
          reason,
        });

        // Write permanent history record for recurring tasks
        if (task.isRecurring) {
          await tx.insert(dailyTaskCompletionsTable)
            .values({
              userId,
              taskId: task.id,
              completionDate,
              pointsAwarded: taskPoints,
              completedAt: now,
            })
            .onConflictDoNothing();
        }
      }

      await ReferralService.awardReferralBonusIfEligible(userId, tx);

      const msg = isYtSubscribe(task)
        ? "YouTube subscription verified and points awarded!"
        : "YouTube task completed and points awarded!";
      return ok({ message: msg });
    });
  },

  async getCompletedTodayCount(
    userId: number,
  ): Promise<ServiceResult<CompletedTodayResult>> {
    const now = new Date();
    const todayStart = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    );

    const [result] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(userTasksTable)
      .where(
        and(
          eq(userTasksTable.userId, userId),
          gte(userTasksTable.completedAt, todayStart),
          sql`LOWER(${userTasksTable.status}) IN ('completed', 'verified')`,
        ),
      );

    return ok({ count: Number(result?.count ?? 0) });
  },

  async handleShareClick(
    shareCode: string,
    fingerprint?: string,
    ip?: string,
    userAgent?: string,
  ): Promise<
    ServiceResult<{ allowed: boolean; reason?: string; redirectUrl: string }>
  > {
    if (!shareCode) return ok({ allowed: false, redirectUrl: "/" });
    if (!fingerprint) {
      return ok({ allowed: false, reason: "no_fingerprint", redirectUrl: "/" });
    }

    const [shareTask] = await db
      .select()
      .from(shareTasksTable)
      .where(eq(shareTasksTable.shareCode, shareCode));

    if (!shareTask) return ok({ allowed: false, redirectUrl: "/" });

    const targetUrl = (shareTask.targetUrl || "").trim() || "/";

    if (
      shareTask.ownerFingerprint &&
      fingerprint &&
      shareTask.ownerFingerprint === fingerprint
    ) {
      return ok({ allowed: false, reason: "owner", redirectUrl: targetUrl });
    }

    const result = await db.transaction(async (tx) => {
      const [shareTaskRow] = await tx
        .select()
        .from(shareTasksTable)
        .where(eq(shareTasksTable.shareCode, shareCode))
        .for("update");

      if (!shareTaskRow) return ok({ allowed: false, redirectUrl: targetUrl });

      if (shareTaskRow.pointsAwarded) {
        return ok({
          allowed: false,
          reason: "completed",
          redirectUrl: targetUrl,
        });
      }

      if (fingerprint) {
        const existingClick = await tx
          .select()
          .from(shareClicksTable)
          .where(
            and(
              eq(shareClicksTable.shareCode, shareCode),
              eq(shareClicksTable.fingerprint, fingerprint),
              userAgent
                ? eq(shareClicksTable.userAgent, userAgent)
                : sql`1=1`,
            ),
          );

        if (existingClick.length > 0) {
          return ok({
            allowed: false,
            reason: "duplicate",
            redirectUrl: targetUrl,
          });
        }
      }

      await tx.insert(shareClicksTable).values({
        shareCode,
        visitorIp: ip || null,
        fingerprint: fingerprint || null,
        userAgent: userAgent || null,
      });

      const [updated] = await tx
        .update(shareTasksTable)
        .set({
          clickCount: sql`${shareTasksTable.clickCount} + 1`,
          uniqueClicks: fingerprint
            ? sql`${shareTasksTable.uniqueClicks} + 1`
            : sql`${shareTasksTable.uniqueClicks}`,
        })
        .where(eq(shareTasksTable.shareCode, shareCode))
        .returning();

      if (
        updated &&
        !updated.pointsAwarded &&
        updated.uniqueClicks >= updated.clickThreshold &&
        updated.userId != null &&
        updated.taskId != null
      ) {
        const [userTask] = await tx
          .select()
          .from(userTasksTable)
          .where(
            and(
              eq(userTasksTable.userId, updated.userId),
              eq(userTasksTable.taskId, updated.taskId),
              eq(userTasksTable.status, "In Progress"),
            ),
          );

        const [task] = await tx
          .select({ points: tasksTable.points })
          .from(tasksTable)
          .where(eq(tasksTable.id, updated.taskId));

        if (userTask) {
          await tx
            .update(userTasksTable)
            .set({ status: "Completed", completedAt: new Date() })
            .where(eq(userTasksTable.id, userTask.id));
          await tx
            .update(usersTable)
            .set({
              points: sql`${usersTable.points} + ${task?.points || 0}`,
              completedTasksCount: sql`${usersTable.completedTasksCount} + 1`,
            })
            .where(eq(usersTable.id, updated.userId!));
          await tx
            .update(shareTasksTable)
            .set({ pointsAwarded: true, completedAt: new Date() })
            .where(eq(shareTasksTable.shareCode, shareCode));
        }
      }

      return ok({ allowed: true, redirectUrl: targetUrl });
    });

    return result;
  },

  async setOwnerFingerprint(
    userId: number,
    shareCode: string,
    fingerprint: string,
  ): Promise<ServiceResult<{ success: true }>> {
    const [shareTask] = await db
      .select()
      .from(shareTasksTable)
      .where(
        and(
          eq(shareTasksTable.shareCode, shareCode),
          eq(shareTasksTable.userId, userId),
        ),
      );

    if (!shareTask) return fail("Share task not found or unauthorized", 404);

    await db
      .update(shareTasksTable)
      .set({ ownerFingerprint: fingerprint })
      .where(eq(shareTasksTable.id, shareTask.id));

    return ok({ success: true });
  },

  async getShareProgress(
    shareCode: string,
  ): Promise<
    ServiceResult<{
      current: number;
      threshold: number;
      isOwner: boolean;
      redirectUrl: string;
    }>
  > {
    const [shareTask] = await db
      .select()
      .from(shareTasksTable)
      .where(eq(shareTasksTable.shareCode, shareCode));

    if (!shareTask) return fail("Share task not found", 404);

    return ok({
      current: shareTask.uniqueClicks,
      threshold: shareTask.clickThreshold,
      isOwner: false,
      redirectUrl: shareTask.targetUrl || shareTask.shareUrl,
    });
  },

  async getVerificationCode(
    userId: number,
    taskId: number,
    prefix: string = '#fb',
  ): Promise<string> {
    return getVerificationCode(userId, taskId, prefix);
  },

  // ─── Admin task CRUD ──────────────────────────────────────────────────────

  async getAllTasks(
    page: number = 1,
    limit: number = 10,
  ): Promise<ServiceResult<AdminTasksPage>> {
    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(tasksTable);
    const totalCount = countResult?.count ?? 0;
    const totalPages = Math.max(1, Math.ceil(totalCount / limit));

    const tasks = await db
      .select()
      .from(tasksTable)
      .orderBy(desc(tasksTable.createdAt))
      .limit(limit)
      .offset((page - 1) * limit);

    const taskIds = tasks.map((t) => t.id);
    const completedCounts =
      taskIds.length > 0
        ? await db
          .select({
            taskId: userTasksTable.taskId,
            count: sql<number>`count(${userTasksTable.id})::int`,
          })
          .from(userTasksTable)
          .where(
            and(
              inArray(userTasksTable.taskId, taskIds),
              sql`${userTasksTable.status} IN ('Completed', 'Verified')`,
            ),
          )
          .groupBy(userTasksTable.taskId)
        : [];
    const countsMap = new Map(completedCounts.map((c) => [c.taskId, c.count]));

    const mappedTasks = tasks.map((t) => ({
      id: t.id,
      title: t.title,
      description: t.description,
      taskType: t.taskType,
      rewardPoint: t.points,
      postUrl: t.postUrl,
      socialPostUrl: t.postUrl,
      videoUrl: t.postUrl,
      platform: t.platform,
      socialPostId: t.socialPostId,
      watchDuration: t.watchDuration ?? null,
      difficulty: t.difficulty,
      isFlash: t.isFlash,
      isShare: t.isShare,
      shareThreshold: t.shareThreshold ?? 3,
      expiresAt: t.expiresAt ? t.expiresAt.toISOString() : null,
      created: t.createdAt ? new Date(t.createdAt).toLocaleDateString() : "N/A",
      completedUsers: countsMap.get(t.id) || 0,
      isRecurring: t.isRecurring ?? false,
    }));

    return ok({ tasks: mappedTasks, totalCount, totalPages, currentPage: page });
  },

  async getAdminTasks(params: {
    page: number;
    limit: number;
    search?: string;
    taskType?: string | null;
  }) {
    const { page, limit, search, taskType } = params;
    const offset = (page - 1) * limit;

    const conditions = [];

    if (search?.trim()) {
      conditions.push(
        or(
          ilike(tasksTable.title, `%${search.trim()}%`),
          ilike(tasksTable.description, `%${search.trim()}%`),
        ),
      );
    }

    if (taskType) {
      conditions.push(eq(tasksTable.taskType, taskType));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const rows = await db
      .select()
      .from(tasksTable)
      .where(whereClause)
      .orderBy(desc(tasksTable.createdAt))
      .limit(limit)
      .offset(offset);

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(tasksTable)
      .where(whereClause);

    const totalCount = Number(count);
    const totalPages = Math.max(1, Math.ceil(totalCount / limit));

    const taskIds = rows.map((t) => t.id);
    const completedCounts =
      taskIds.length > 0
        ? await db
          .select({
            taskId: userTasksTable.taskId,
            count: sql<number>`count(${userTasksTable.id})::int`,
          })
          .from(userTasksTable)
          .where(
            and(
              inArray(userTasksTable.taskId, taskIds),
              sql`${userTasksTable.status} IN ('Completed', 'Verified')`,
            ),
          )
          .groupBy(userTasksTable.taskId)
        : [];

    const countsMap = new Map(completedCounts.map((c) => [c.taskId, c.count]));

    const tasks = rows.map((t) => ({
      id: t.id,
      title: t.title,
      description: t.description,
      taskType: t.taskType,
      rewardPoint: t.points,
      postUrl: t.postUrl,
      socialPostUrl: t.postUrl,
      videoUrl: t.postUrl,
      platform: t.platform,
      socialPostId: t.socialPostId,
      watchDuration: t.watchDuration ?? null,
      difficulty: t.difficulty,
      isFlash: t.isFlash,
      isShare: t.isShare,
      shareThreshold: t.shareThreshold ?? 3,
      expiresAt: t.expiresAt ? t.expiresAt.toISOString() : null,
      created: t.createdAt
        ? new Date(t.createdAt).toLocaleDateString()
        : "N/A",
      completedUsers: countsMap.get(t.id) || 0,
      isRecurring: t.isRecurring ?? false,
    }));

    return { tasks, totalCount, totalPages, currentPage: page };
  },

  async createTask(input: {
    title: string;
    description: string;
    taskType: string;
    rewardPoint: number;
    socialPostUrl?: string | null;
    videoUrl?: string | null;
    platform?: string | null;
    socialPostId?: string | null;
    socialPlatform?: string | null;
    targetUrl?: string | null;
    isActive?: boolean;
    watchDuration?: number | null;
    difficulty?: string;
    isFlash?: boolean;
    isShare?: boolean;
    shareThreshold?: number;
    expiresAt?: string | null;
    isRecurring?: boolean;
  }): Promise<ServiceResult<Task>> {
    const gatedCreatePlatform = asToggleablePlatform(input.platform);
    if (gatedCreatePlatform) {
      const platformEnabled = await FeatureFlagService.isPlatformEnabled(gatedCreatePlatform);
      if (!platformEnabled) {
        return fail(
          `${gatedCreatePlatform === "facebook" ? "Facebook" : "Instagram"} is currently disabled — enable it in Settings before creating tasks for it.`,
          400,
          "FEATURE_DISABLED",
        );
      }
    }

    const resolvedTaskType =
      input.platform === "youtube" && input.watchDuration
        ? "VIDEO_WATCH"
        : input.taskType;

    const [newTask] = await db
      .insert(tasksTable)
      .values({
        title: input.title,
        description: input.description,
        taskType: resolvedTaskType,
        points: Number(input.rewardPoint),
        postUrl: input.socialPostUrl || input.videoUrl || null,
        platform: input.platform || null,
        socialPostId: input.socialPostId || null,
        socialPlatform: input.socialPlatform || null,
        targetUrl: input.targetUrl || input.videoUrl || null,
        isActive: input.isActive ?? true,
        watchDuration: input.platform === "youtube" && input.watchDuration ? Number(input.watchDuration) : null,
        difficulty: input.difficulty || "easy",
        isFlash: input.isFlash || false,
        isShare: input.isShare || false,
        shareThreshold: input.shareThreshold ?? 3,
        expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
        isRecurring: input.isRecurring ?? false,
      })
      .returning();
    return ok(newTask);
  },

  async updateTask(
    taskId: number,
    input: {
      title: string;
      description: string;
      taskType: string;
      rewardPoint: number;
      socialPostUrl?: string | null;
      videoUrl?: string | null;
      platform?: string | null;
      socialPostId?: string | null;
      socialPlatform?: string | null;
      targetUrl?: string | null;
      isActive?: boolean;
      watchDuration?: number | null;
      difficulty?: string;
      isFlash?: boolean;
      isShare?: boolean;
      shareThreshold?: number;
      expiresAt?: string | null;
      isRecurring?: boolean;
    },
  ): Promise<ServiceResult<Task>> {
    const gatedUpdatePlatform = asToggleablePlatform(input.platform);
    if (gatedUpdatePlatform) {
      const platformEnabled = await FeatureFlagService.isPlatformEnabled(gatedUpdatePlatform);
      if (!platformEnabled) {
        return fail(
          `${gatedUpdatePlatform === "facebook" ? "Facebook" : "Instagram"} is currently disabled — enable it in Settings before saving tasks for it.`,
          400,
          "FEATURE_DISABLED",
        );
      }
    }

    const resolvedTaskType =
      input.platform === "youtube" && input.watchDuration
        ? "VIDEO_WATCH"
        : input.taskType;

    const [updatedTask] = await db
      .update(tasksTable)
      .set({
        title: input.title,
        description: input.description,
        taskType: resolvedTaskType,
        points: Number(input.rewardPoint),
        postUrl: input.socialPostUrl || input.videoUrl || null,
        platform: input.platform || null,
        socialPostId: input.socialPostId || null,
        socialPlatform: input.socialPlatform || null,
        targetUrl: input.targetUrl || input.videoUrl || null,
        isActive: input.isActive ?? true,
        watchDuration: input.platform === "youtube" && input.watchDuration ? Number(input.watchDuration) : null,
        difficulty: input.difficulty || "easy",
        isFlash: input.isFlash || false,
        isShare: input.isShare || false,
        shareThreshold: input.shareThreshold ?? 3,
        expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
        isRecurring: input.isRecurring ?? false,
      })
      .where(eq(tasksTable.id, taskId))
      .returning();
    if (!updatedTask) return fail("Task not found", 404);
    return ok(updatedTask);
  },

  async deleteTask(taskId: number): Promise<ServiceResult<{ message: string }>> {
    await db.delete(tasksTable).where(eq(tasksTable.id, taskId));
    return ok({ message: "Task deleted successfully" });
  },

  async bulkCreateTasks(
    tasks: Array<{
      title: string;
      description?: string;
      taskType: string;
      rewardPoint: number;
      socialPostUrl?: string | null;
      videoUrl?: string | null;
      platform?: string | null;
      socialPostId?: string | null;
      watchDuration?: number | null;
      difficulty?: string;
      isFlash?: boolean;
      isShare?: boolean;
      shareThreshold?: number;
      expiresAt?: string | null;
      isRecurring?: boolean;
    }>,
  ): Promise<ServiceResult<{ count: number }>> {
    const bulkFlagsResult = await FeatureFlagService.getFlags();
    if (bulkFlagsResult.success) {
      for (const t of tasks) {
        const gatedBulkPlatform = asToggleablePlatform(t.platform);
        if (gatedBulkPlatform && !bulkFlagsResult.data[gatedBulkPlatform]) {
          return fail(
            `${gatedBulkPlatform === "facebook" ? "Facebook" : "Instagram"} is currently disabled — enable it in Settings before creating tasks for it.`,
            400,
            "FEATURE_DISABLED",
          );
        }
      }
    }

    const values = tasks.map((t) => {
      const resolvedTaskType =
        t.platform === "youtube" && t.watchDuration
          ? "VIDEO_WATCH"
          : t.taskType;
      return {
        title: t.title,
        description: t.description || "",
        taskType: resolvedTaskType,
        points: t.rewardPoint,
        postUrl: t.socialPostUrl || t.videoUrl || null,
        platform: t.platform || null,
        socialPostId: t.socialPostId || null,
        watchDuration: t.platform === "youtube" && t.watchDuration ? t.watchDuration : null,
        difficulty: t.difficulty || "easy",
        isFlash: t.isFlash || false,
        isShare: t.isShare || false,
        shareThreshold: t.shareThreshold ?? 3,
        expiresAt: t.expiresAt ? new Date(t.expiresAt) : null,
        isRecurring: t.isRecurring ?? false,
      };
    });

    const inserted = await db.insert(tasksTable).values(values).returning();
    return ok({ count: inserted.length });
  },

  async getSubmissions(): Promise<ServiceResult<SubmissionItem[]>> {
    const submissions = await db
      .select({
        userTask: userTasksTable,
        task: tasksTable,
        user: usersTable,
      })
      .from(userTasksTable)
      .innerJoin(tasksTable, eq(userTasksTable.taskId, tasksTable.id))
      .innerJoin(usersTable, eq(userTasksTable.userId, usersTable.id))
      .where(eq(userTasksTable.status, "Pending Verification"))
      .orderBy(desc(userTasksTable.submittedAt))
      .limit(100);

    const mapped = submissions.map((s) => ({
      id: s.userTask.id,
      taskId: s.task.id,
      userId: s.user.id,
      userName: s.user.name,
      userEmail: s.user.email,
      taskTitle: s.task.title,
      taskType: s.task.taskType,
      taskPlatform: s.task.platform,
      watchDuration: s.task.watchDuration,
      points: s.task.points,
      status: s.userTask.status,
      proofUrl: s.userTask.proofUrl,
      proofImageUrl: s.userTask.proofImageUrl,
      assignedAt: s.userTask.assignedAt,
      completedAt: s.userTask.completedAt,
      proofPhash: s.userTask.proofPhash ?? null,
      proofExifFlags: s.userTask.proofExifFlags ?? null,
      isDuplicateProof: s.userTask.isDuplicateProof ?? false,
    }));

    return ok(mapped);
  },

  async verifySubmission(
    userTaskId: number,
    newStatus: string,
    rejectionReason?: string,
  ): Promise<ServiceResult<{ message: string }>> {
    const result = await db.transaction(async (tx) => {
      const [userTaskInfo] = await tx
        .select({
          userTask: userTasksTable,
          task: tasksTable,
          user: usersTable,
        })
        .from(userTasksTable)
        .innerJoin(tasksTable, eq(userTasksTable.taskId, tasksTable.id))
        .innerJoin(usersTable, eq(userTasksTable.userId, usersTable.id))
        .where(eq(userTasksTable.id, userTaskId))
        .for("update");

      if (!userTaskInfo) return fail("Submission not found", 404);

      const currentStatus = userTaskInfo.userTask.status;
      const taskPoints = userTaskInfo.task.points;
      let countChange = 0;

      if (newStatus === "Verified" && currentStatus !== "Verified") {
        countChange = 1;
      } else if (newStatus !== "Verified" && currentStatus === "Verified") {
        countChange = -1;
      }

      await tx
        .select()
        .from(usersTable)
        .where(eq(usersTable.id, userTaskInfo.user.id))
        .for("update");

      const setData: any = {
        points: countChange > 0
          ? sql`${usersTable.points} + ${taskPoints}`
          : countChange < 0
            ? sql`${usersTable.points} - ${taskPoints}`
            : undefined,
        monthlyPoints: countChange > 0
          ? sql`${usersTable.monthlyPoints} + ${taskPoints}`
          : undefined,
        completedTasksCount: sql`${usersTable.completedTasksCount} + ${countChange}`,
      };

      await tx
        .update(usersTable)
        .set(setData)
        .where(eq(usersTable.id, userTaskInfo.user.id));

      await tx
        .update(userTasksTable)
        .set({
          status: newStatus,
          ...(newStatus === "Verified" || newStatus === "Rejected"
            ? { proofImageUrl: null, proofUrl: null }
            : {}),
          ...(newStatus === "Rejected"
            ? { rejectionReason: rejectionReason ?? null, rejectedAt: new Date() }
            : {}),
        })
        .where(eq(userTasksTable.id, userTaskId));

      if (countChange > 0) {
        await tx.insert(pointsLogTable).values({
          userId: userTaskInfo.user.id,
          taskId: userTaskInfo.task.id,
          points: taskPoints,
          reason: `Admin verified: ${userTaskInfo.task.title}`,
        });
      }

      if (newStatus === "Verified" && currentStatus !== "Verified") {
        await ReferralService.awardReferralBonusIfEligible(userTaskInfo.user.id, tx);

        // Write permanent history record for recurring (daily refresh) tasks
        if (userTaskInfo.task.isRecurring) {
          const now = new Date();
          const completionDate = now.toISOString().slice(0, 10); // YYYY-MM-DD
          await tx.insert(dailyTaskCompletionsTable)
            .values({
              userId: userTaskInfo.user.id,
              taskId: userTaskInfo.task.id,
              completionDate,
              pointsAwarded: taskPoints,
              completedAt: now,
            })
            .onConflictDoNothing();
        }
      }

      if (newStatus === "Verified" || newStatus === "Rejected") {
        const imageUrl = userTaskInfo.userTask.proofImageUrl;
        const linkUrl = userTaskInfo.userTask.proofUrl;

        if (imageUrl) {
          deleteCloudinaryImage(imageUrl);
        }
        if (
          linkUrl &&
          linkUrl !== imageUrl &&
          linkUrl.includes("cloudinary.com")
        ) {
          deleteCloudinaryImage(linkUrl);
        }
      }

      return ok({ message: "Submission updated", userTaskInfo, newStatus, taskPoints });
    });

    if (!result.success) return result;

    // ── Notify the user (real-time push + DB record, with email fallback
    // when they're offline) — fired after the transaction commits so we
    // never block the DB write on email/SSE delivery. ────────────────────
    const { userTaskInfo, newStatus: status, taskPoints } = result.data;
    const userId = userTaskInfo.user.id;
    const taskTitle = userTaskInfo.task.title;

    if (status === "Rejected") {
      const timestamp = new Date();
      await NotificationService.deliver({
        userId,
        type: "submission_rejected",
        title: "Submission rejected",
        message: `Your submission for "${taskTitle}" was rejected: ${rejectionReason ?? "No reason provided"}`,
        data: {
          taskId: userTaskInfo.task.id,
          userTaskId,
          taskTitle,
          status: "Rejected",
          reason: rejectionReason ?? "No reason provided",
          rejectedAt: timestamp.toISOString(),
        },
        email: {
          subject: `Your submission for "${taskTitle}" was rejected`,
          html: submissionRejectedEmailHtml({
            name: userTaskInfo.user.name ?? "there",
            taskTitle,
            reason: rejectionReason ?? "No reason provided",
            timestamp: timestamp.toLocaleString(),
            dashboardUrl: `${process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXTAUTH_URL || "http://localhost:3000"}/dashboard`,
          }),
        },
      });
    } else if (status === "Verified") {
      await NotificationService.create({
        userId,
        type: "submission_approved",
        title: "Submission approved",
        message: `Your submission for "${taskTitle}" was approved — you earned ${taskPoints} pts!`,
        data: {
          taskId: userTaskInfo.task.id,
          userTaskId,
          taskTitle,
          status: "Verified",
          points: taskPoints,
          verifiedAt: new Date().toISOString(),
        },
      });
    }

    return ok({ message: result.data.message });
  },
};

function extractVideoId(url: string | null): string | null {
  if (!url) return null;
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

function extractChannelId(url: string | null): string | null {
  if (!url) return null;
  const rawMatch = url.match(/^(UC[\w-]{22})$/);
  if (rawMatch) return rawMatch[1];

  const atMatch = url.match(/youtube\.com\/@([\w.-]+)/);
  if (atMatch) return '@' + atMatch[1];

  const patterns = [
    /youtube\.com\/channel\/(UC[\w-]{22})/,
    /youtube\.com\/c\/([\w.-]+)/,
    /youtube\.com\/user\/([\w.-]+)/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

async function getValidCompletedTaskIds(
  userId: number,
  todayStart: Date,
): Promise<number[]> {
  const rows = await db
    .select({ taskId: userTasksTable.taskId })
    .from(userTasksTable)
    .innerJoin(tasksTable, eq(userTasksTable.taskId, tasksTable.id))
    .where(
      and(
        eq(userTasksTable.userId, userId),
        inArray(userTasksTable.status, ['Completed', 'Verified']),
        or(
          // Permanent tasks: always count as completed
          not(eq(tasksTable.isRecurring, true)),
          // Daily Refresh tasks: only count if completed today
          and(
            eq(tasksTable.isRecurring, true),
            isNotNull(userTasksTable.assignedAt),
            gte(userTasksTable.assignedAt, todayStart),
          ),
        ),
      ),
    );

  return rows
    .map((r) => r.taskId)
    .filter((id): id is number => id !== null);
}

type MapTasksContext = {
  tasks: (typeof tasksTable.$inferSelect)[];
  userTasksMap: Map<number | null, {
    id: number;
    taskId: number | null;
    status: string | null;
    proofUrl: string | null;
    assignedAt: Date | null;
    completedAt: Date | null;
  }>;
  shareTaskMap: Map<number | null, {
    shareUrl: string | null;
    clickCount: number;
    uniqueClicks: number;
    clickThreshold: number;
    pointsAwarded: boolean;
  }>;
  dailyLoginStr: string | null;
  todayStart: Date;
  today: string;
};

function mapTasksToItems(ctx: MapTasksContext): UserTaskItem[] {
  return ctx.tasks.map((task) => {
    const isDailyLogin = task.platform === "daily-login";
    const claimedToday = ctx.dailyLoginStr === ctx.today;

    const userTask = ctx.userTasksMap.get(task.id);
    const effectiveUserTask = (() => {
      if (!userTask?.id) return null;

      if (task.isRecurring && userTask.assignedAt && userTask.assignedAt < ctx.todayStart) return null;
      return userTask;
    })();

    const userStatus = isDailyLogin
      ? claimedToday ? "Completed" : null
      : effectiveUserTask?.status || null;
    const isExpiredFlash = !!(
      task.isFlash &&
      task.expiresAt &&
      new Date(task.expiresAt) < new Date() &&
      !userStatus
    );
    const shareInfo = ctx.shareTaskMap.get(task.id);

    return {
      id: task.id,
      title: task.title,
      description: task.description,
      taskType: task.taskType,
      points: task.points,
      postUrl: task.postUrl,
      platform: task.platform,
      socialPostId: task.socialPostId ?? null,
      created: task.createdAt ? new Date(task.createdAt).toLocaleDateString() : "N/A",
      watchDuration: task.watchDuration ?? null,
      difficulty: task.difficulty,
      isFlash: task.isFlash,
      isShare: task.isShare,
      expiresAt: task.expiresAt ? task.expiresAt.toISOString() : null,
      isExpired: isExpiredFlash,
      userStatus,
      userAssignedAt: isDailyLogin ? null : effectiveUserTask?.assignedAt || null,
      completedAt: isDailyLogin ? null : effectiveUserTask?.completedAt || null,
      shareLink: shareInfo?.shareUrl || null,
      shareClickCount: shareInfo?.uniqueClicks || 0,
      shareClickThreshold: shareInfo?.clickThreshold || task.shareThreshold || 3,
      sharePointsAwarded: shareInfo?.pointsAwarded || false,
      isRecurring: task.isRecurring ?? false,
    };
  });
}

async function awardFacebookPoints(
  userId: number,
  task: Task,
  userTask: UserTask,
  multiplier: number,
  fingerprint?: string,
): Promise<ServiceResult<FacebookCompleteResult>> {
  const taskPoints = Math.round((task.points || 0) * multiplier);
  const completionDurationSeconds =
    userTask.assignedAt
      ? Math.round((Date.now() - new Date(userTask.assignedAt).getTime()) / 1000)
      : null;
  const now = new Date();
  const completionDate = now.toISOString().split("T")[0];

  await db.transaction(async (tx) => {
    const [locked] = await tx
      .select()
      .from(userTasksTable)
      .where(eq(userTasksTable.id, userTask.id))
      .for("update");

    if (!locked || ['completed', 'verified', 'cancelled'].includes(locked.status?.toLowerCase() ?? '')) {
      return;
    }

    await tx
      .update(userTasksTable)
      .set({
        status: "Completed",
        completedAt: now,
        submissionFingerprint: fingerprint ?? null,
        completionDurationSeconds: completionDurationSeconds ?? null,
      })
      .where(eq(userTasksTable.id, userTask.id));

    await tx
      .update(usersTable)
      .set({
        points: sql`${usersTable.points} + ${taskPoints}`,
        monthlyPoints: sql`${usersTable.monthlyPoints} + ${taskPoints}`,
        completedTasksCount: sql`${usersTable.completedTasksCount} + 1`,
      })
      .where(eq(usersTable.id, userId));


    const [taskRow] = await tx.select({ isRecurring: tasksTable.isRecurring }).from(tasksTable).where(eq(tasksTable.id, task.id));
    if (taskRow?.isRecurring) {
      await tx.insert(dailyTaskCompletionsTable)
        .values({
          userId,
          taskId: task.id,
          completionDate,
          pointsAwarded: taskPoints,
          completedAt: now,
        })
        .onConflictDoNothing();
    }
  });

  await ReferralService.awardReferralBonusIfEligible(userId);

  return ok({
    message: "Facebook task completed and points awarded!",
    pointsAwarded: taskPoints,
  });
}

async function awardInstagramPoints(
  userId: number,
  task: Task,
  userTask: UserTask,
  multiplier: number,
  fingerprint?: string,
): Promise<ServiceResult<InstagramCompleteResult>> {
  const taskPoints = Math.round((task.points || 0) * multiplier);
  const completionDurationSeconds =
    userTask.assignedAt
      ? Math.round((Date.now() - new Date(userTask.assignedAt).getTime()) / 1000)
      : null;
  const now = new Date();
  const completionDate = now.toISOString().split("T")[0];

  await db.transaction(async (tx) => {

    const [locked] = await tx
      .select()
      .from(userTasksTable)
      .where(eq(userTasksTable.id, userTask.id))
      .for("update");

    if (!locked || ['completed', 'verified', 'cancelled'].includes(locked.status?.toLowerCase() ?? '')) {
      return;
    }

    await tx
      .update(userTasksTable)
      .set({
        status: "Completed",
        completedAt: now,
        submissionFingerprint: fingerprint ?? null,
        completionDurationSeconds: completionDurationSeconds ?? null,
      })
      .where(eq(userTasksTable.id, userTask.id));

    await tx
      .update(usersTable)
      .set({
        points: sql`${usersTable.points} + ${taskPoints}`,
        monthlyPoints: sql`${usersTable.monthlyPoints} + ${taskPoints}`,
        completedTasksCount: sql`${usersTable.completedTasksCount} + 1`,
      })
      .where(eq(usersTable.id, userId));

    // Write permanent history record for recurring tasks
    const [taskRow] = await tx.select({ isRecurring: tasksTable.isRecurring }).from(tasksTable).where(eq(tasksTable.id, task.id));
    if (taskRow?.isRecurring) {
      await tx.insert(dailyTaskCompletionsTable)
        .values({
          userId,
          taskId: task.id,
          completionDate,
          pointsAwarded: taskPoints,
          completedAt: now,
        })
        .onConflictDoNothing();
    }
  });

  await ReferralService.awardReferralBonusIfEligible(userId);

  return ok({
    message: "Instagram task completed and points awarded!",
    pointsAwarded: taskPoints,
  });
}