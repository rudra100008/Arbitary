import crypto from "crypto";
import { db } from "@/src/db";
import {
  tasksTable,
  userTasksTable,
  usersTable,
  shareTasksTable,
  shareClicksTable,
  watchSessionsTable,
} from "@/src/db/schema";
import { eq, and, desc, sql, or, gte, lt, inArray, not, type SQL, isNotNull, ne } from "drizzle-orm";
import { calculateStreak, getNextMilestone, toDateStr } from "@/src/lib/streak-helper";
import { getStreakMultiplier } from "@/src/lib/gamification";
import {
  findCodeInComments,
  checkUserCommentedOnPost,
  getVerificationCode,
} from "@/src/lib/facebook";
import { InstagramService } from "@/src/lib/instagram";
import { YouTubeService } from "./youtube.service";
import { ReferralService } from "./referral.service";
import { isYtLike, isYtSubscribe, isYtComment } from "@/src/lib/task-detector";
import { pointsLogTable } from "@/src/db/schema";
import { ServiceResult, ok, fail } from "./result";
import type { Task, UserTask } from "@/src/types/db";
import { TASK_STATUS } from "@/src/lib/constants/task-status";

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
  message: string;
  requiresScreenshot?: boolean;
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

    const now = new Date();
    const todayStart = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    );
    const today = new Date().toISOString().split("T")[0];
    const dailyLoginStr = toDateStr(user?.dailyLoginDate);

    // Build WHERE conditions
    const conditions: (SQL | undefined)[] = [];

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

    const now = new Date();
    const todayStart = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    );
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
          taskType && taskType !== "all" ? eq(tasksTable.taskType, taskType) : undefined,
        ),
      );

    const activeTaskIds = activeUserTasksRows
      .map((r) => r.tasks.id)
      .filter((id): id is number => id !== null);

    // ── Available tasks (paginated) ──
    const availableConditions: (SQL | undefined)[] = [];

    if (taskType && taskType !== "all") {
      availableConditions.push(eq(tasksTable.taskType, taskType));
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
      tasks: activeUserTasksRows.map((r) => r.tasks),
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
    const now = new Date();
    const todayStart = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    );

    // Inline filter: mirrors getValidCompletedTaskIds() logic for inclusion (vs exclusion in dashboard)
    // Uses the same or() clause directly to avoid a second round-trip for completed data.
    // Keep this condition in sync with getValidCompletedTaskIds().
    const conditions: (SQL | undefined)[] = [
      eq(userTasksTable.userId, userId),
      inArray(userTasksTable.status, ['Completed', 'Verified']),
      or(
        not(eq(tasksTable.taskType, 'daily')),
        and(
          eq(tasksTable.taskType, 'daily'),
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
        expiresAt: task.expiresAt ? task.expiresAt.toISOString() : null,
        isExpired: false,
        userStatus: r.userTask.status,
        userAssignedAt: r.userTask.assignedAt,
        completedAt: r.userTask.completedAt,
        shareLink: shareInfo?.shareUrl || null,
        shareClickCount: shareInfo?.clickCount || 0,
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
    if (currentUser?.role === "admin") {
      return fail("Admins cannot pick up tasks", 403);
    }

    const [targetTask] = await db
      .select()
      .from(tasksTable)
      .where(eq(tasksTable.id, taskId));
    if (!targetTask) return fail("Task not found", 404);

    if (targetTask.platform === "daily-login") {
      const dlResult = await this.claimDailyLogin(userId, taskId);
      if (!dlResult.success) return dlResult;
      return ok({ message: dlResult.data.message });
    }

    // Re-claim: delete any previous rejected entry for this task
    const existingRejected = await db
      .select()
      .from(userTasksTable)
      .where(
        and(
          eq(userTasksTable.userId, userId),
          eq(userTasksTable.taskId, taskId),
          eq(userTasksTable.status, "Rejected"),
        ),
      )
      .then((rows) => rows[0]);

    if (existingRejected) {
      if (existingRejected.proofImageUrl) {
        await deleteCloudinaryImage(existingRejected.proofImageUrl);
      }
      await db
        .delete(userTasksTable)
        .where(eq(userTasksTable.id, existingRejected.id));
    }

    // Prevent re-picking the same task (In Progress, Completed, Verified, Pending Verification)
    const existingNonRejected = await db
      .select()
      .from(userTasksTable)
      .where(
        and(
          eq(userTasksTable.userId, userId),
          eq(userTasksTable.taskId, taskId),
          ne(userTasksTable.status, "Rejected"),
        ),
      )
      .then((rows) => rows[0]);

    if (existingNonRejected) {
      return fail("You have already picked up this task", 400);
    }

    const existingActiveTasks = await db
      .select({ userTask: userTasksTable, task: tasksTable })
      .from(userTasksTable)
      .innerJoin(tasksTable, eq(userTasksTable.taskId, tasksTable.id))
      .where(
        and(
          eq(userTasksTable.userId, userId),
          eq(userTasksTable.status, "In Progress"),
          eq(tasksTable.taskType, targetTask.taskType!),
        ),
      );

    if (existingActiveTasks.length > 0) {
      return fail(
        `You can only pick up one ${targetTask.taskType} task at a time.`,
        400,
      );
    }

    await db
      .insert(userTasksTable)
      .values({
        userId,
        taskId,
        status: "In Progress",
        assignedAt: new Date(),
      })
      .returning();

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

  async claimDailyLogin(
    userId: number,
    taskId: number,
  ): Promise<ServiceResult<DailyLoginResult>> {
    const [task] = await db
      .select()
      .from(tasksTable)
      .where(eq(tasksTable.id, taskId));
    if (!task) return fail("Task not found", 404);

    const today = new Date().toISOString().split("T")[0];


    return await db.transaction(async (tx) => {
      // Lock the user row to prevent concurrent double-credit
      const [user] = await tx
        .select()
        .from(usersTable)
        .where(eq(usersTable.id, userId))
        .for("update");
      if (!user) return fail("User not found", 404);

      const dailyLoginStr = toDateStr(user.dailyLoginDate);
      if (dailyLoginStr === today) {
        return fail("You already claimed your daily login reward today", 429);
      }

      const { newStreak, bonus } = calculateStreak(
        user.dailyLoginDate,
        user.currentStreak || 0,
      );
      const newLongest = Math.max(user.longestStreak || 0, newStreak);
      const bonusPoints = bonus;
      const basePoints = task.points || 0;
      await tx
        .update(usersTable)
        .set({
          dailyLoginDate: new Date(today),
          lastLoginAt: new Date(),
          currentStreak: newStreak,
          longestStreak: newLongest,
          points: sql`${usersTable.points} + ${basePoints + bonusPoints}`,
          lifetimePoints: sql`${usersTable.lifetimePoints} + ${basePoints + bonusPoints}`,
          completedTasksCount: sql`${usersTable.completedTasksCount} + 1`,
        })
        .where(eq(usersTable.id, userId));

      const [userTask] = await tx
        .insert(userTasksTable)
        .values({
          userId,
          taskId: Number(taskId),
          status: "Completed",
          assignedAt: new Date(),
          completedAt: new Date(),
        })
        .returning();

      const nextMilestone = getNextMilestone(newStreak);

      return ok({
        message:
          bonus > 0
            ? `Daily login reward claimed! Streak milestone bonus: +${bonus} pts!`
            : "Daily login reward claimed!",
        pointsAwarded: (task.points || 0) + bonus,
        basePoints: task.points || 0,
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
    // ... implementation ...
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
      .orderBy(desc(userTasksTable.assignedAt));

    if (!userTaskWithTask) {
      return fail("Task not found or not picked up by you", 404);
    }

    const { userTask, task } = userTaskWithTask;
    if (task.platform !== "instagram") {
      return fail("This endpoint is only for Instagram tasks", 400);
    }

    const postId = task.socialPostId;
    if (!postId) {
      return fail("This task has no Instagram post linked", 400);
    }

    const code = getVerificationCode(Number(userId), Number(taskId));

    try {
      const verification = await InstagramService.findCodeInComments(postId, code, user.instagramUsername);

      if (verification.found) {
        return await awardInstagramPoints(userId, task, userTask, multiplier, fingerprint);
      }
    } catch (error: any) {
      return fail(`Instagram API error: ${error.message}`, 500);
    }

    // Fallback: auto-verification failed — set to Pending Verification for admin review
    await db
      .update(userTasksTable)
      .set({ status: "Pending Verification" })
      .where(eq(userTasksTable.id, userTask.id));

    return ok({
      message:
        "Could not verify your comment automatically. Please upload a screenshot as proof.",
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
      .orderBy(desc(userTasksTable.assignedAt));

    if (!userTaskWithTask) {
      return fail("Task not found or not picked up by you", 404);
    }

    const { userTask, task } = userTaskWithTask;

    if (task.platform !== "youtube") {
      return fail("This endpoint is only for YouTube tasks", 400);
    }

    const tokenResult = await YouTubeService.getAuthorizedClient(userId);
    if (!tokenResult.success) {
      return fail("Link your YouTube account in settings first", 401);
    }

    const accessToken = tokenResult.data;
    const taskType = task.taskType;
    const pointsAwarded = task.points || 0;

    // Dynamic pattern-based YouTube verification
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
    } else if (taskType !== "VIDEO_WATCH" && taskType !== "video_watch") {
      return fail("Could not determine the YouTube task type from the URL or title", 400);
    }

    // Watch duration check: only VIDEO_WATCH tasks require a watch session
    if (taskType === "VIDEO_WATCH" || taskType === "video_watch") {
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
      const minWatchTime = Math.round(videoDuration * 0.85);
      const accumulatedTime = session.accumulatedWatchTime || 0;

      // Check 1: accumulated watch time >= 85% of video duration
      if (accumulatedTime < minWatchTime) {
        return fail(
          `Watched ${accumulatedTime}s of ${videoDuration}s. Need ${minWatchTime}s to complete.`,
          429,
        );
      }

      // Check 2: heartbeat coverage >= 75% of expected 30s intervals
      const heartbeatLog = (session.heartbeatLog as number[]) || [];
      const expectedIntervals = Math.ceil(videoDuration / 30);
      if (heartbeatLog.length < Math.ceil(expectedIntervals * 0.75)) {
        return fail(
          `Insufficient playback coverage (${heartbeatLog.length}/${expectedIntervals} intervals). Keep watching steadily.`,
          429,
        );
      }

      // Check 3: no single gap > 2 intervals (60s)
      for (let i = 1; i < heartbeatLog.length; i++) {
        const gap = heartbeatLog[i] - heartbeatLog[i - 1];
        if (gap > 60) {
          return fail(
            `Playback gap of ${gap}s detected. Please watch without long pauses.`,
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
    await db.transaction(async (tx) => {
      await tx
        .update(userTasksTable)
        .set({
          status: "Completed",
          completedAt: new Date(),
          submissionFingerprint: fingerprint ?? null,
          completionDurationSeconds: completionDurationSeconds ?? null,
        })
        .where(eq(userTasksTable.id, userTask.id));

      const [currentUser] = await tx
        .select({ points: usersTable.points, lifetimePoints: usersTable.lifetimePoints })
        .from(usersTable)
        .where(eq(usersTable.id, userId))
        .for("update");

      if (currentUser) {
        await tx
          .update(usersTable)
          .set({
            points: sql`${usersTable.points} + ${taskPoints}`,
            lifetimePoints: sql`${usersTable.lifetimePoints} + ${taskPoints}`,
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
      }
    });

    await ReferralService.awardReferralBonusIfEligible(userId);

    const msg = isYtSubscribe(task)
      ? "YouTube subscription verified and points awarded!"
      : "YouTube task completed and points awarded!";
    return ok({ message: msg });
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

    if (fingerprint) {
      const existingClick = await db
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

    if (shareTask.pointsAwarded) {
      return ok({
        allowed: false,
        reason: "completed",
        redirectUrl: targetUrl,
      });
    }

    await db.insert(shareClicksTable).values({
      shareCode,
      visitorIp: ip || null,
      fingerprint: fingerprint || null,
      userAgent: userAgent || null,
    });

    const [updated] = await db
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
      const [userTask] = await db
        .select()
        .from(userTasksTable)
        .where(
          and(
            eq(userTasksTable.userId, updated.userId),
            eq(userTasksTable.taskId, updated.taskId),
            eq(userTasksTable.status, "In Progress"),
          ),
        );

      const [task] = await db
        .select({ points: tasksTable.points })
        .from(tasksTable)
        .where(eq(tasksTable.id, updated.taskId));

      if (userTask) {
        await db.transaction(async (tx) => {
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
        });
      }
    }

    return ok({ allowed: true, redirectUrl: targetUrl });
  },

  async setOwnerFingerprint(
    shareCode: string,
    fingerprint: string,
  ): Promise<ServiceResult<{ success: true }>> {
    const [shareTask] = await db
      .select()
      .from(shareTasksTable)
      .where(eq(shareTasksTable.shareCode, shareCode));

    if (!shareTask) return fail("Share task not found", 404);

    await db
      .update(shareTasksTable)
      .set({ ownerFingerprint: fingerprint })
      .where(eq(shareTasksTable.shareCode, shareCode));

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
  ): Promise<string> {
    return getVerificationCode(userId, taskId);
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
    }));

    return ok({ tasks: mappedTasks, totalCount, totalPages, currentPage: page });
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
  }): Promise<ServiceResult<Task>> {
    const [newTask] = await db
      .insert(tasksTable)
      .values({
        title: input.title,
        description: input.description,
        taskType: input.taskType,
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
    },
  ): Promise<ServiceResult<Task>> {
    const [updatedTask] = await db
      .update(tasksTable)
      .set({
        title: input.title,
        description: input.description,
        taskType: input.taskType,
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
    }>,
  ): Promise<ServiceResult<{ count: number }>> {
    const values = tasks.map((t) => ({
      title: t.title,
      description: t.description || "",
      taskType: t.taskType,
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
    }));

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
      .where(eq(userTasksTable.status, "Pending Verification"));

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
    }));

    return ok(mapped);
  },

  async verifySubmission(
    userTaskId: number,
    newStatus: string,
  ): Promise<ServiceResult<{ message: string }>> {
    return await db.transaction(async (tx) => {
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
        lifetimePoints: countChange > 0
          ? sql`${usersTable.lifetimePoints} + ${taskPoints}`
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
        await ReferralService.awardReferralBonusIfEligible(userTaskInfo.user.id);
      }

      if (newStatus === "Verified" || newStatus === "Rejected") {
        const proofUrl = userTaskInfo.userTask.proofImageUrl;
        if (proofUrl) {
          deleteCloudinaryImage(proofUrl);
        }
      }

      return ok({ message: "Submission updated" });
    });
  },
};

async function deleteCloudinaryImage(url: string | null): Promise<void> {
  if (!url) return;
  try {
    const uploadSegment = "/upload/";
    const idx = url.indexOf(uploadSegment);
    if (idx === -1) return;
    const afterUpload = url.slice(idx + uploadSegment.length);
    const withoutVersion = afterUpload.replace(/^v\d+\//, "");
    const publicId = withoutVersion.replace(/\.[^.]+$/, "");

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    if (!cloudName || !apiKey || !apiSecret) return;

    const auth = Buffer.from(`${apiKey}:${apiSecret}`).toString("base64");
    await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ public_id: publicId }),
      },
    );
  } catch {
    // non-critical; orphaned images are acceptable
  }
}

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
          not(eq(tasksTable.taskType, 'daily')),
          and(
            eq(tasksTable.taskType, 'daily'),
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
      if (task.taskType === "daily" && userTask.assignedAt && userTask.assignedAt < ctx.todayStart) return null;
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
      shareClickCount: shareInfo?.clickCount || 0,
      shareClickThreshold: shareInfo?.clickThreshold || task.shareThreshold || 3,
      sharePointsAwarded: shareInfo?.pointsAwarded || false,
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

  await db.transaction(async (tx) => {
    await tx
      .update(userTasksTable)
      .set({
        status: "Completed",
        completedAt: new Date(),
        submissionFingerprint: fingerprint ?? null,
        completionDurationSeconds: completionDurationSeconds ?? null,
      })
      .where(eq(userTasksTable.id, userTask.id));

    const [currentUser] = await tx
      .select({ points: usersTable.points, lifetimePoints: usersTable.lifetimePoints })
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .for("update");

    if (currentUser) {
      await tx
        .update(usersTable)
        .set({
          points: sql`${usersTable.points} + ${taskPoints}`,
          lifetimePoints: sql`${usersTable.lifetimePoints} + ${taskPoints}`,
          completedTasksCount: sql`${usersTable.completedTasksCount} + 1`,
        })
        .where(eq(usersTable.id, userId));

      await tx.insert(pointsLogTable).values({
        userId,
        taskId: task.id,
        points: taskPoints,
        reason: `Facebook task: ${task.title}`,
      });
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

  await db.transaction(async (tx) => {
    await tx
      .update(userTasksTable)
      .set({
        status: "Completed",
        completedAt: new Date(),
        submissionFingerprint: fingerprint ?? null,
        completionDurationSeconds: completionDurationSeconds ?? null,
      })
      .where(eq(userTasksTable.id, userTask.id));

    const [currentUser] = await tx
      .select({ points: usersTable.points, lifetimePoints: usersTable.lifetimePoints })
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .for("update");

    if (currentUser) {
      await tx
        .update(usersTable)
        .set({
          points: sql`${usersTable.points} + ${taskPoints}`,
          lifetimePoints: sql`${usersTable.lifetimePoints} + ${taskPoints}`,
          completedTasksCount: sql`${usersTable.completedTasksCount} + 1`,
        })
        .where(eq(usersTable.id, userId));

      await tx.insert(pointsLogTable).values({
        userId,
        taskId: task.id,
        points: taskPoints,
        reason: `Instagram task: ${task.title}`,
      });
    }
  });

  await ReferralService.awardReferralBonusIfEligible(userId);

  return ok({
    message: "Instagram task completed and points awarded!",
    pointsAwarded: taskPoints,
  });
}
