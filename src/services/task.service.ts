import { db } from "@/src/db";
import {
  tasksTable,
  userTasksTable,
  usersTable,
  shareTasksTable,
  shareClicksTable,
  watchSessionsTable,
} from "@/src/db/schema";
import { eq, and, desc, sql, or, gte, ne } from "drizzle-orm";
import { calculateStreak, getNextMilestone, toDateStr } from "@/src/lib/streak-helper";
import {
  findCodeInComments,
  checkUserCommentedOnPost,
  getVerificationCode,
} from "@/src/lib/facebook";
import { YouTubeService } from "./youtube.service";
import { ReferralService } from "./referral.service";
import { pointsLogTable } from "@/src/db/schema";
import { ServiceResult, ok, fail } from "./result";
import { getRankLabel } from "@/src/lib/tiers";
import type { Task, UserTask, ShareTask } from "@/src/types/db";

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
  async getUserTasks(userId: number): Promise<ServiceResult<UserTaskItem[]>> {
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
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

    const tasksWithUserStatus = await db
      .select({ task: tasksTable, userTask: userTasksTable })
      .from(tasksTable)
      .leftJoin(
        userTasksTable,
        and(
          eq(userTasksTable.taskId, tasksTable.id),
          eq(userTasksTable.userId, userId),
          sql`(
            ${tasksTable.taskType} NOT IN ('daily', 'monthly')
            OR ${tasksTable.taskType} IS NULL
            OR (${tasksTable.taskType} = 'daily' AND ${userTasksTable.assignedAt} >= ${todayStart})
            OR (${tasksTable.taskType} = 'monthly' AND ${userTasksTable.assignedAt} >= ${monthStart})
          )`,
        ),
      )
      .orderBy(desc(tasksTable.createdAt), desc(userTasksTable.completedAt));

    const seen = new Map<number, (typeof tasksWithUserStatus)[number]>();
    for (const row of tasksWithUserStatus) {
      if (!seen.has(row.task.id)) seen.set(row.task.id, row);
    }
    const unique = Array.from(seen.values());

    const today = new Date().toISOString().split("T")[0];

    const dailyLoginStr = toDateStr(user?.dailyLoginDate);

    const shareTasks = await db
      .select()
      .from(shareTasksTable)
      .where(eq(shareTasksTable.userId, userId));

    const shareTaskMap = new Map(shareTasks.map((st) => [st.taskId, st]));

    const mappedTasks = unique.map((t) => {
      const isDailyLogin = t.task.platform === "daily-login";
      const claimedToday = dailyLoginStr === today;
      const userStatus = isDailyLogin
        ? claimedToday
          ? "Completed"
          : null
        : t.userTask?.status || null;
      const isExpiredFlash = !!(
        t.task.isFlash &&
        t.task.expiresAt &&
        new Date(t.task.expiresAt) < new Date() &&
        !userStatus
      );
      const shareInfo = shareTaskMap.get(t.task.id);

      return {
        id: t.task.id,
        title: t.task.title,
        description: t.task.description,
        taskType: t.task.taskType,
        points: t.task.points,
        postUrl: t.task.postUrl,
        platform: t.task.platform,
        socialPostId: t.task.socialPostId ?? null,
        created: t.task.createdAt
          ? new Date(t.task.createdAt).toLocaleDateString()
          : "N/A",
        watchDuration: t.task.watchDuration ?? null,
        difficulty: t.task.difficulty,
        isFlash: t.task.isFlash,
        isShare: t.task.isShare,
        expiresAt: t.task.expiresAt ? t.task.expiresAt.toISOString() : null,
        isExpired: isExpiredFlash,
        userStatus,
        userAssignedAt: isDailyLogin ? null : t.userTask?.assignedAt || null,
        completedAt: isDailyLogin ? null : t.userTask?.completedAt || null,
        shareLink: shareInfo?.shareUrl || null,
        shareClickCount: shareInfo?.clickCount || 0,
        shareClickThreshold: shareInfo?.clickThreshold || t.task.shareThreshold || 3,
        sharePointsAwarded: shareInfo?.pointsAwarded || false,
      };
    });

    return ok(mappedTasks);
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
      const today = new Date().toISOString().split("T")[0];

      return await db.transaction(async (tx) => {
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
        const basePoints = targetTask.points || 0;
        const bonusPoints = bonus;
        const newLifetime = (user.lifetimePoints || 0) + basePoints + bonusPoints;

        await tx
          .update(usersTable)
          .set({
            dailyLoginDate: new Date(today),
            currentStreak: newStreak,
            longestStreak: newLongest,
            points: sql`${usersTable.points} + ${basePoints + bonusPoints}`,
            lifetimePoints: sql`${usersTable.lifetimePoints} + ${basePoints + bonusPoints}`,
            rank: getRankLabel(newLifetime),
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
            completedAt: new Date(),
          })
          .returning();

        return ok({ message: "Daily login reward claimed!" });
      });
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
      const { nanoid } = await import("nanoid");
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
    proofImageUrl?: string,
  ): Promise<ServiceResult<{ message: string }>> {
    const updateData: Record<string, unknown> = { status };
    if (proofUrl) updateData.proofUrl = proofUrl;
    if (proofImageUrl) {
      updateData.proofImageUrl = proofImageUrl;
    } else if (proofUrl) {
      updateData.proofImageUrl = proofUrl;
    }

    const [updated] = await db
      .update(userTasksTable)
      .set(updateData)
      .where(
        and(eq(userTasksTable.userId, userId), eq(userTasksTable.taskId, taskId)),
      )
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
      const newLifetime = (user.lifetimePoints || 0) + basePoints + bonusPoints;

      await tx
        .update(usersTable)
        .set({
          dailyLoginDate: new Date(today),
          lastLoginAt: new Date(),
          currentStreak: newStreak,
          longestStreak: newLongest,
          points: sql`${usersTable.points} + ${basePoints + bonusPoints}`,
          lifetimePoints: sql`${usersTable.lifetimePoints} + ${basePoints + bonusPoints}`,
          rank: getRankLabel(newLifetime),
          completedTasksCount: sql`${usersTable.completedTasksCount} + 1`,
        })
        .where(eq(usersTable.id, userId));

      const [userTask] = await tx
        .insert(userTasksTable)
        .values({
          userId,
          taskId: Number(taskId),
          status: "Completed",
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
  ): Promise<ServiceResult<FacebookCompleteResult>> {
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
      return await awardFacebookPoints(userId, task, userTask);
    }

    if (facebookId) {
      const asidResult = await checkUserCommentedOnPost(postId, "", facebookId);
      if (asidResult.liked) {
        return await awardFacebookPoints(userId, task, userTask);
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
    sessionId?: number,
  ): Promise<ServiceResult<YoutubeCompleteResult>> {
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

    const tokenResult = await YouTubeService.getAccessToken();
    if (!tokenResult.success) {
      return fail("Link your YouTube account in settings first", 401);
    }

    const accessToken = tokenResult.data;
    const taskType = task.taskType;
    const pointsAwarded = task.points || 0;

    // Type-specific YouTube verification
    if (taskType === "VIDEO_SUBSCRIBE") {
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
    } else if (taskType === "VIDEO_LIKE") {
      const videoId = task.socialPostId || extractVideoId(task.postUrl);
      const isLiked = videoId ? await YouTubeService.verifyLike(videoId, accessToken) : false;
      if (!isLiked) {
        return fail("Please like the video to complete this task", 429);
      }
    } else if (taskType !== "VIDEO_WATCH" && taskType !== "video_watch") {
      const targetUrl = task.postUrl ?? "";
      const titleLower = (task.title ?? "").toLowerCase();

      const isVidUrl =
        targetUrl.includes("youtube.com/watch") ||
        targetUrl.includes("youtu.be/") ||
        targetUrl.includes("youtube.com/shorts");

      const isChannelUrl =
        targetUrl.includes("youtube.com/channel") ||
        targetUrl.includes("youtube.com/@") ||
        targetUrl.includes("youtube.com/c/") ||
        targetUrl.includes("youtube.com/user/") ||
        (targetUrl.startsWith("UC") && !targetUrl.includes("/"));

      const isSubscriptionTask = isChannelUrl || titleLower.includes("subscri");
      const isCommentTask = isVidUrl && (titleLower.includes("comment") || titleLower.includes("engage"));
      const isLikeTask = isVidUrl && !isCommentTask && titleLower.includes("like");

      if (isCommentTask) {
        const videoId = task.socialPostId || extractVideoId(targetUrl);
        if (!videoId) {
          return fail("Could not extract video ID from the task URL", 400);
        }
        const hasCommented = await YouTubeService.verifyComment(videoId, userId, taskId, accessToken);
        if (!hasCommented) {
          return fail("Please comment on the video to complete this task", 429);
        }
      } else if (isLikeTask) {
        const videoId = task.socialPostId || extractVideoId(targetUrl);
        if (!videoId) {
          return fail("Could not extract video ID from the task URL", 400);
        }
        const isLiked = await YouTubeService.verifyLike(videoId, accessToken);
        if (!isLiked) {
          return fail("Please like the video to complete this task", 429);
        }
      } else if (isSubscriptionTask) {
        const channelId = task.socialPostId || extractChannelId(targetUrl);
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
      } else {
        return fail("Could not determine the YouTube task type from the URL or title", 400);
      }
    }

    // Watch duration check (skip for subscribe tasks — both exact and heuristic)
    const isSubscribeByUrl =
      (task.postUrl ?? "").includes("youtube.com/channel") ||
      (task.postUrl ?? "").includes("youtube.com/@") ||
      (task.postUrl ?? "").includes("youtube.com/c/") ||
      (task.postUrl ?? "").includes("youtube.com/user/") ||
      ((task.postUrl ?? "").startsWith("UC") && !(task.postUrl ?? "").includes("/")) ||
      (task.title ?? "").toLowerCase().includes("subscri");

    if (taskType !== "VIDEO_SUBSCRIBE" && !isSubscribeByUrl && taskType !== "VIDEO_LIKE") {
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
      if (!session.completedAt) {
        return fail("Watch session not yet completed. Keep watching.", 429);
      }

      const completedTime = session.completedAt ? new Date(session.completedAt).getTime() : 0;
      const createdTime = session.createdAt ? new Date(session.createdAt).getTime() : 0;
      const elapsedSeconds = Math.floor((completedTime - createdTime) / 1000);

      if (elapsedSeconds < requiredSeconds) {
        const remaining = Math.ceil(requiredSeconds - elapsedSeconds);
        return fail(
          `Server tracking shows ${elapsedSeconds}s watched. ${remaining}s remaining.`,
          429,
        );
      }
    }

    await db.transaction(async (tx) => {
      await tx
        .update(userTasksTable)
        .set({ status: "Completed", completedAt: new Date() })
        .where(eq(userTasksTable.id, userTask.id));

      const [currentUser] = await tx
        .select({ points: usersTable.points, lifetimePoints: usersTable.lifetimePoints })
        .from(usersTable)
        .where(eq(usersTable.id, userId))
        .for("update");

      if (currentUser) {
        const newLifetime = (currentUser.lifetimePoints || 0) + pointsAwarded;
        await tx
          .update(usersTable)
          .set({
            points: sql`${usersTable.points} + ${pointsAwarded}`,
            lifetimePoints: sql`${usersTable.lifetimePoints} + ${pointsAwarded}`,
            rank: getRankLabel(newLifetime),
            completedTasksCount: sql`${usersTable.completedTasksCount} + 1`,
          })
          .where(eq(usersTable.id, userId));

        const reason = taskType === "VIDEO_SUBSCRIBE"
          ? `YouTube subscribe: ${task.title}`
          : taskType === "VIDEO_WATCH" || taskType === "video_watch"
            ? `YouTube watch: ${task.title}`
            : `YouTube task: ${task.title}`;

        await tx.insert(pointsLogTable).values({
          userId,
          taskId: task.id,
          points: pointsAwarded,
          reason,
        });
      }
    });

    await ReferralService.awardReferralBonusIfEligible(userId);

    const msg = taskType === "VIDEO_SUBSCRIBE"
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

      if (userTask) {
        await db.transaction(async (tx) => {
          await tx
            .update(userTasksTable)
            .set({ status: "Completed", completedAt: new Date() })
            .where(eq(userTasksTable.id, userTask.id));
          await tx
            .update(usersTable)
            .set({
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

  async getAllTasks(): Promise<ServiceResult<AdminTaskItem[]>> {
    const tasks = await db
      .select()
      .from(tasksTable)
      .orderBy(desc(tasksTable.createdAt));

    const completedCounts = await db
      .select({
        taskId: userTasksTable.taskId,
        count: sql<number>`count(${userTasksTable.id})::int`,
      })
      .from(userTasksTable)
      .where(sql`LOWER(${userTasksTable.status}) IN ('completed', 'verified')`)
      .groupBy(userTasksTable.taskId);

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

    return ok(mappedTasks);
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
    let countChange = 0;

    if (newStatus === "Verified" && currentStatus !== "Verified") {
      countChange = 1;
    } else if (newStatus !== "Verified" && currentStatus === "Verified") {
      countChange = -1;
    }

    await db.transaction(async (tx) => {
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

      if (countChange > 0) {
        const newLifetime = (userTaskInfo.user.lifetimePoints || 0) + taskPoints;
        setData.rank = getRankLabel(newLifetime);
      }

      await tx
        .update(usersTable)
        .set(setData)
        .where(eq(usersTable.id, userTaskInfo.user.id));

      await tx
        .update(userTasksTable)
        .set({ status: newStatus })
        .where(eq(userTasksTable.id, userTaskId));

      if (countChange > 0) {
        await tx.insert(pointsLogTable).values({
          userId: userTaskInfo.user.id,
          taskId: userTaskInfo.task.id,
          points: taskPoints,
          reason: `Admin verified: ${userTaskInfo.task.title}`,
        });
      }
    });

    if (newStatus === "Verified" && currentStatus !== "Verified") {
      await ReferralService.awardReferralBonusIfEligible(userTaskInfo.user.id);
    }

    return ok({ message: "Submission updated" });
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
  // Raw channel ID (starts with UC and no path separators)
  const rawMatch = url.match(/^(UC[\w-]{22})$/);
  if (rawMatch) return rawMatch[1];

  const patterns = [
    /youtube\.com\/channel\/(UC[\w-]{22})/,
    /youtube\.com\/@([\w.-]+)/,
    /youtube\.com\/c\/([\w.-]+)/,
    /youtube\.com\/user\/([\w.-]+)/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

async function awardFacebookPoints(
  userId: number,
  task: Task,
  userTask: UserTask,
): Promise<ServiceResult<FacebookCompleteResult>> {
  const pointsAwarded = task.points || 0;

  await db.transaction(async (tx) => {
    await tx
      .update(userTasksTable)
      .set({ status: "Completed", completedAt: new Date() })
      .where(eq(userTasksTable.id, userTask.id));

    const [currentUser] = await tx
      .select({ points: usersTable.points, lifetimePoints: usersTable.lifetimePoints })
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .for("update");

    if (currentUser) {
      const newLifetime = (currentUser.lifetimePoints || 0) + pointsAwarded;
      await tx
        .update(usersTable)
        .set({
          points: sql`${usersTable.points} + ${pointsAwarded}`,
          lifetimePoints: sql`${usersTable.lifetimePoints} + ${pointsAwarded}`,
          rank: getRankLabel(newLifetime),
          completedTasksCount: sql`${usersTable.completedTasksCount} + 1`,
        })
        .where(eq(usersTable.id, userId));

      await tx.insert(pointsLogTable).values({
        userId,
        taskId: task.id,
        points: pointsAwarded,
        reason: `Facebook task: ${task.title}`,
      });
    }
  });

  await ReferralService.awardReferralBonusIfEligible(userId);

  return ok({
    message: "Facebook task completed and points awarded!",
    pointsAwarded,
  });
}
