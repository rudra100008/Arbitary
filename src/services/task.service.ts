import { db } from "@/src/db";
import {
  tasksTable,
  userTasksTable,
  usersTable,
  shareTasksTable,
  shareClicksTable,
} from "@/src/db/schema";
import { eq, and, desc, sql, or, gte, lt, inArray, not, type SQL, isNotNull } from "drizzle-orm";
import { calculateStreak, getNextMilestone, toDateStr } from "@/src/lib/streak-helper";
import { getStreakMultiplier } from "@/src/lib/gamification";
import {
  findCodeInComments,
  checkUserCommentedOnPost,
  getVerificationCode,
} from "@/src/lib/facebook";
import { nanoid } from "nanoid";
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

export type YoutubeCompleteResult = {
  message: string;
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
  points: number;
  status: string;
  proofUrl: string | null;
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
  ): Promise<ServiceResult<UserTaskItem[]>> {
    const now = new Date();
    const todayStart = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    );

    // Inline filter: mirrors getValidCompletedTaskIds() logic for inclusion (vs exclusion in dashboard)
    // Uses the same or() clause directly to avoid a second round-trip for completed data.
    // Keep this condition in sync with getValidCompletedTaskIds().
    const rows = await db
      .select({
        userTask: userTasksTable,
        task: tasksTable,
      })
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
      )
      .orderBy(desc(userTasksTable.completedAt))
      .limit(limit);

    const taskIds = rows.map((r) => r.task.id);
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
    for (const r of rows) {
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

    return ok(items);
  },

  async pickUpTask(
    userId: number,
    taskId: number,
  ): Promise<ServiceResult<{ message: string }>> {
    const [targetTask] = await db
      .select()
      .from(tasksTable)
      .where(eq(tasksTable.id, taskId));
    if (!targetTask) return fail("Task not found", 404);

    if (targetTask.platform === "daily-login") {
      const today = new Date().toISOString().split("T")[0];
      const [user] = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.id, userId));
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

      await db.transaction(async (tx) => {
        await tx
          .update(usersTable)
          .set({
            dailyLoginDate: new Date(today),
            currentStreak: newStreak,
            longestStreak: newLongest,
            points: sql`${usersTable.points} + ${(targetTask.points || 0) + bonus}`,
            completedTasksCount: sql`${usersTable.completedTasksCount} + 1`,
            lastLoginAt: new Date(),
          })
          .where(eq(usersTable.id, userId));

        await tx
          .insert(userTasksTable)
          .values({
            userId,
            taskId,
            status: "Completed",
            assignedAt: new Date(today),
            completedAt: new Date(),
          })
          .returning();
      });

      return ok({ message: "Daily login reward claimed!" });
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
      const shareCode = nanoid(10);
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

    if (userTask.status === status) {
      return fail("Task is already in this status", 400);
    }

    const updateData: Record<string, unknown> = { status };
    if (proofUrl) updateData.proofUrl = proofUrl;

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
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, userId));
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

    return await db.transaction(async (tx) => {
      await tx
        .update(usersTable)
        .set({
          dailyLoginDate: new Date(today),
          lastLoginAt: new Date(),
          currentStreak: newStreak,
          longestStreak: newLongest,
          points: sql`${usersTable.points} + ${(task.points || 0) + bonus}`,
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
          sql`${userTasksTable.status} NOT IN ('Completed', 'Verified', 'Cancelled')`,
        ),
      )
      .orderBy(desc(userTasksTable.assignedAt));

    if (!userTaskWithTask) {
      return fail("Task not found or not picked up by you", 404);
    }

    const { userTask, task } = userTaskWithTask;
    if (task.platform !== "facebook") {
      return fail("This endpoint is only for Facebook tasks", 400);
    }

    const postId = task.socialPostId;
    if (!postId) {
      return fail("This task has no Facebook post linked", 400);
    }

    const code = getVerificationCode(Number(userId), Number(taskId));
    const codeResult = await findCodeInComments(postId, code);

    if (codeResult.error) {
      return fail(
        `Facebook API error: ${codeResult.error}`,
        500,
      );
    }

    if (codeResult.liked) {
      return await awardFacebookPoints(userId, task, userTask, multiplier, fingerprint);
    }

    if (facebookId) {
      const asidResult = await checkUserCommentedOnPost(postId, "", facebookId);
      if (asidResult.liked) {
        return await awardFacebookPoints(userId, task, userTask, multiplier, fingerprint);
      }
    }

    return fail(
      `Couldn't find your comment with code "${code}" on the post.`,
      429,
    );
  },

  async completeYoutubeTask(
    userId: number,
    taskId: number,
    watchedSeconds: number,
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
          sql`${userTasksTable.status} NOT IN ('Completed', 'Verified', 'Cancelled')`,
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

    const requiredSeconds = task.watchDuration ?? 30;
    if (!watchedSeconds || watchedSeconds < requiredSeconds) {
      const remaining = Math.ceil(requiredSeconds - (watchedSeconds || 0));
      return fail(
        `Please watch the video for at least ${requiredSeconds} seconds. ${remaining}s remaining.`,
        429,
      );
    }

    if (userTask.assignedAt) {
      const elapsedMs = Date.now() - new Date(userTask.assignedAt).getTime();
      if (elapsedMs / 1000 < requiredSeconds) {
        const remaining = Math.ceil(requiredSeconds - elapsedMs / 1000);
        return fail(`Please wait ${remaining}s before completing.`, 429);
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

      await tx
        .update(usersTable)
        .set({
          points: sql`${usersTable.points} + ${taskPoints}`,
          completedTasksCount: sql`${usersTable.completedTasksCount} + 1`,
        })
        .where(eq(usersTable.id, userId));
    });

    return ok({ message: "YouTube task completed and points awarded!", pointsAwarded: taskPoints });
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
          sql`${userTasksTable.status} IN ('Completed', 'Verified')`,
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
      points: s.task.points,
      status: s.userTask.status,
      proofUrl: s.userTask.proofUrl,
      assignedAt: s.userTask.assignedAt,
      completedAt: s.userTask.completedAt,
    }));

    return ok(mapped);
  },

  async verifySubmission(
    userTaskId: number,
    newStatus: string,
  ): Promise<ServiceResult<{ message: string }>> {
    const [userTaskInfo] = await db
      .select({
        userTask: userTasksTable,
        task: tasksTable,
        user: usersTable,
      })
      .from(userTasksTable)
      .innerJoin(tasksTable, eq(userTasksTable.taskId, tasksTable.id))
      .innerJoin(usersTable, eq(userTasksTable.userId, usersTable.id))
      .where(eq(userTasksTable.id, userTaskId));

    if (!userTaskInfo) return fail("Submission not found", 404);

    const currentStatus = userTaskInfo.userTask.status;
    const taskPoints = userTaskInfo.task.points;

    if (newStatus === "Verified" && currentStatus !== "Verified") {
      await db.update(usersTable)
        .set({
          points: sql`${usersTable.points} + ${taskPoints}`,
          completedTasksCount: sql`${usersTable.completedTasksCount} + 1`,
        })
        .where(eq(usersTable.id, userTaskInfo.user.id));
    } else if (newStatus !== "Verified" && currentStatus === "Verified") {
      await db.update(usersTable)
        .set({
          points: sql`${usersTable.points} - ${taskPoints}`,
          completedTasksCount: sql`${usersTable.completedTasksCount} - 1`,
        })
        .where(eq(usersTable.id, userTaskInfo.user.id));
    }

    await db.update(userTasksTable)
      .set({ status: newStatus })
      .where(eq(userTasksTable.id, userTaskId));

    return ok({ message: "Submission updated" });
  },
};

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

    await tx
      .update(usersTable)
      .set({
        points: sql`${usersTable.points} + ${taskPoints}`,
        completedTasksCount: sql`${usersTable.completedTasksCount} + 1`,
      })
      .where(eq(usersTable.id, userId));
  });

  return ok({
    message: "Facebook task completed and points awarded!",
    pointsAwarded: taskPoints,
  });
}
