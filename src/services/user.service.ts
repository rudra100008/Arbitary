import { db } from "@/src/db";
import { usersTable, referralsTable, userTasksTable, tasksTable, pointsLogTable } from "@/src/db/schema";
import { eq, and, desc, sql, aliasedTable, gte } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { toDateStr } from "@/src/lib/streak-helper";
import { getStreakMultiplier, getCurrentMonthlyTier, getTierKey } from "@/src/lib/gamification";
import { rateLimit } from "@/src/lib/rate-limit";
import { ReferralService, REFERRAL_BONUS } from "./referral.service";
import { ServiceResult, ok, fail } from "./result";
import type { User } from "@/src/types/db";

export type UserPointsResult = {
  points: number;
  completedTasksCount: number;
  currentStreak: number;
  longestStreak: number;
  claimedToday: boolean;
  monthlyPoints: number;
  tier: string;
};

export type UserProfile = Pick<
  User,
  "id" | "name" | "email" | "image" | "bio" | "location" | "phoneNumber" | "referralCode" | "points"
> & { monthlyPoints: number; referredBy: number | null; referredByName: string | null; instagramUsername?: string | null };

export const UserService = {
  async getUserPoints(userId: number): Promise<ServiceResult<UserPointsResult>> {
    const [user] = await db
      .select({
        points: usersTable.points,
        completedTasksCount: usersTable.completedTasksCount,
        currentStreak: usersTable.currentStreak,
        longestStreak: usersTable.longestStreak,
        dailyLoginDate: usersTable.dailyLoginDate,
        monthlyPoints: usersTable.monthlyPoints,
      })
      .from(usersTable)
      .where(eq(usersTable.id, userId));

    if (!user) return fail("User not found", 404);

    const today = new Date().toISOString().split("T")[0];
    const dailyLoginStr = toDateStr(user.dailyLoginDate);

    return ok({
      points: user.points,
      completedTasksCount: user.completedTasksCount,
      currentStreak: user.currentStreak || 0,
      longestStreak: user.longestStreak || 0,
      claimedToday: dailyLoginStr === today,
      monthlyPoints: user.monthlyPoints ?? 0,
      tier: getTierKey(getCurrentMonthlyTier(user.monthlyPoints ?? 0)),
    });
  },

  async updateProfile(
    userId: number,
    data: { name?: string; phone?: string; bio?: string; location?: string; instagramUsername?: string },
  ): Promise<ServiceResult<{ success: true }>> {
    const updates: Record<string, unknown> = {};
    if (data.name !== undefined) updates.name = data.name;
    if (data.phone !== undefined) updates.phoneNumber = data.phone;
    if (data.bio !== undefined) updates.bio = data.bio;
    if (data.location !== undefined) updates.location = data.location;
    if (data.instagramUsername !== undefined) updates.instagramUsername = data.instagramUsername;

    if (Object.keys(updates).length === 0) return fail("No fields to update", 400);

    await db.update(usersTable).set(updates).where(eq(usersTable.id, userId));
    return ok({ success: true });
  },

  /** Used by the /complete-birthday backfill flow for existing users who
   *  signed up before the age-verification requirement was introduced. */
  async setDateOfBirth(userId: number, dateOfBirth: string): Promise<ServiceResult<{ success: true }>> {
    const [existing] = await db
      .select({ dateOfBirth: usersTable.dateOfBirth })
      .from(usersTable)
      .where(eq(usersTable.id, userId));

    if (!existing) return fail("User not found", 404);
    if (existing.dateOfBirth) return fail("Birthday has already been set", 400);

    await db.update(usersTable).set({ dateOfBirth: new Date(dateOfBirth) }).where(eq(usersTable.id, userId));
    return ok({ success: true });
  },

  async getProfile(userId: number): Promise<ServiceResult<UserProfile>> {
    const referrerAlias = aliasedTable(usersTable, "referrer");
    const [user] = await db
      .select({
        id: usersTable.id,
        name: usersTable.name,
        email: usersTable.email,
        image: usersTable.image,
        bio: usersTable.bio,
        location: usersTable.location,
        phoneNumber: usersTable.phoneNumber,
        referralCode: usersTable.referralCode,
        points: usersTable.points,
        lifetimePoints: usersTable.monthlyPoints,
        referredBy: usersTable.referredBy,
        referredByName: referrerAlias.name,
        instagramUsername: usersTable.instagramUsername,
      })
      .from(usersTable)
      .leftJoin(referrerAlias, eq(usersTable.referredBy, referrerAlias.id))
      .where(eq(usersTable.id, userId));

    if (!user) return fail("User not found", 404);
    return ok(user as UserProfile);
  },

  async generateReferralCode(userId: number): Promise<ServiceResult<{ referralCode: string }>> {
    const result = await ReferralService.assignReferralCode(userId);
    if (!result.success) return fail(result.error, result.status);
    return ok({ referralCode: result.data.code });
  },

  async signup(data: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    dateOfBirth: string;
    referralCode?: string;
    fingerprint?: string;
  }, verification?: {
    verificationToken: string;
    verificationTokenExpiresAt: Date;
  }): Promise<ServiceResult<{ success: true; userId: number }>> {
    const existing = await db.select().from(usersTable).where(eq(usersTable.email, data.email)).limit(1);
    if (existing.length > 0) {
      return fail("An account with this email already exists", 400);
    }

    const hashPassword = await bcrypt.hash(data.password, 12);

    const [newUser] = await db.insert(usersTable).values({
      email: data.email,
      name: `${data.firstName} ${data.lastName}`,
      password: hashPassword,
      provider: "credentials",
      dateOfBirth: new Date(data.dateOfBirth),
      verificationToken: verification?.verificationToken,
      verificationTokenExpiresAt: verification?.verificationTokenExpiresAt,
      signupFingerprint: data.fingerprint,
    }).returning();

    // Assign a unique referral code
    await ReferralService.assignReferralCode(newUser.id);

    // Bind referral code if provided
    if (data.referralCode) {
      await ReferralService.bindReferralCode(newUser.id, data.referralCode);
    }

    return ok({ success: true, userId: newUser.id });
  },

  async claimProfileReward(
    userId: number,
    taskId: number,
  ): Promise<ServiceResult<{ pointsAwarded: number }>> {
    const rl = await rateLimit(`claim:profile:${userId}`, 5, 60_000);
    if (!rl.allowed) return fail("Too many attempts. Try again later.", 429);

    const [task] = await db.select({ points: tasksTable.points }).from(tasksTable).where(eq(tasksTable.id, taskId));
    if (!task) return fail("Task not found", 404);

    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
    if (!user) return fail("User not found", 404);

    if (!user.bio || !user.phoneNumber || !user.location) {
      return fail("Complete your profile first (bio, phone, and location required)", 400);
    }

    const multiplier = getStreakMultiplier(user.currentStreak || 0);
    const taskPoints = Math.round((task.points ?? 0) * multiplier);

    await db.transaction(async (tx) => {
      const [existing] = await tx
        .select()
        .from(userTasksTable)
        .where(
          and(
            eq(userTasksTable.userId, userId),
            eq(userTasksTable.taskId, taskId),
            eq(userTasksTable.status, 'Completed'),
          ),
        )
        .for("update");

      if (existing) throw new Error("You already completed this task");

      await tx
        .insert(userTasksTable)
        .values({ userId, taskId, status: "Completed", completedAt: new Date() })
        .returning();

      const [lockedUser] = await tx
        .select()
        .from(usersTable)
        .where(eq(usersTable.id, userId))
        .for("update");

      if (lockedUser) {
        await tx
          .update(usersTable)
          .set({
            points: sql`${usersTable.points} + ${taskPoints}`,
            monthlyPoints: sql`${usersTable.monthlyPoints} + ${taskPoints}`,
            completedTasksCount: sql`${usersTable.completedTasksCount} + 1`,
          })
          .where(eq(usersTable.id, userId));
      }
    }).catch((err) => {
      if (err instanceof Error) return fail(err.message, 429);
      throw err;
    });

    return ok({ pointsAwarded: taskPoints });
  },

  async claimReferralReward(
    userId: number,
    taskId: number,
  ): Promise<ServiceResult<{ pointsAwarded: number; referralCount: number }>> {
    const rl = await rateLimit(`claim:referral:${userId}`, 5, 60_000);
    if (!rl.allowed) return fail("Too many attempts. Try again later.", 429);

    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
    if (!user) return fail("User not found", 404);

    try {
      const totalReferralPoints = await db.transaction(async (tx) => {
        const [existing] = await tx
          .select()
          .from(userTasksTable)
          .where(
            and(
              eq(userTasksTable.userId, userId),
              eq(userTasksTable.taskId, taskId),
              eq(userTasksTable.status, 'Completed'),
            ),
          )
          .for("update");

        if (existing) throw new Error("You already completed this task");

        const referrals = await tx
          .select()
          .from(referralsTable)
          .where(eq(referralsTable.referrerId, userId))
          .orderBy(desc(referralsTable.createdAt))
          .for("update");

        const unclaimedReferrals = referrals.filter((r) => r.pointsAwarded === 0);
        if (unclaimedReferrals.length === 0) {
          throw new Error("No referrals found. Share your referral code to invite friends!");
        }

        const points = unclaimedReferrals.length * REFERRAL_BONUS;

        await tx
          .insert(userTasksTable)
          .values({ userId, taskId, status: "Completed", completedAt: new Date() })
          .returning();

        const [lockedUser] = await tx
          .select()
          .from(usersTable)
          .where(eq(usersTable.id, userId))
          .for("update");

        if (lockedUser) {
          await tx
            .update(usersTable)
            .set({
              points: sql`${usersTable.points} + ${points}`,
              monthlyPoints: sql`${usersTable.monthlyPoints} + ${points}`,
              completedTasksCount: sql`${usersTable.completedTasksCount} + 1`,
            })
            .where(eq(usersTable.id, userId));
        }

        for (const ref of unclaimedReferrals) {
          await tx
            .update(referralsTable)
            .set({ pointsAwarded: REFERRAL_BONUS })
            .where(eq(referralsTable.id, ref.id));
        }

        return points;
      });

      return ok({ pointsAwarded: totalReferralPoints, referralCount: Math.floor(totalReferralPoints / REFERRAL_BONUS) });
    } catch (err) {
      return fail(err instanceof Error ? err.message : "An error occurred", 400);
    }
  },
};