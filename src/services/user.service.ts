import { db } from "@/src/db";
import { usersTable, referralsTable, userTasksTable, tasksTable } from "@/src/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { customAlphabet } from "nanoid";
import bcrypt from "bcryptjs";
import { toDateStr } from "@/src/lib/streak-helper";
import { ServiceResult, ok, fail } from "./result";
import type { User } from "@/src/types/db";

const generateReferralCode = customAlphabet(
  "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789",
  8,
);

export type UserPointsResult = {
  points: number;
  completedTasksCount: number;
  currentStreak: number;
  longestStreak: number;
  claimedToday: boolean;
};

export type UserProfile = Pick<
  User,
  "id" | "name" | "email" | "image" | "bio" | "location" | "phoneNumber" | "referralCode" | "points"
>;

export const UserService = {
  async getUserPoints(userId: number): Promise<ServiceResult<UserPointsResult>> {
    const [user] = await db
      .select({
        points: usersTable.points,
        completedTasksCount: usersTable.completedTasksCount,
        currentStreak: usersTable.currentStreak,
        longestStreak: usersTable.longestStreak,
        dailyLoginDate: usersTable.dailyLoginDate,
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
    });
  },

  async updateProfile(
    userId: number,
    data: { name?: string; phone?: string; bio?: string; location?: string },
  ): Promise<ServiceResult<{ success: true }>> {
    const updates: Record<string, unknown> = {};
    if (data.name !== undefined) updates.name = data.name;
    if (data.phone !== undefined) updates.phoneNumber = data.phone;
    if (data.bio !== undefined) updates.bio = data.bio;
    if (data.location !== undefined) updates.location = data.location;

    if (Object.keys(updates).length === 0) return fail("No fields to update", 400);

    await db.update(usersTable).set(updates).where(eq(usersTable.id, userId));
    return ok({ success: true });
  },

  async getProfile(userId: number): Promise<ServiceResult<UserProfile>> {
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
      })
      .from(usersTable)
      .where(eq(usersTable.id, userId));

    if (!user) return fail("User not found", 404);
    return ok(user);
  },

  async generateReferralCode(userId: number): Promise<ServiceResult<{ referralCode: string }>> {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
    if (!user) return fail("User not found", 404);

    if (user.referralCode) return ok({ referralCode: user.referralCode });

    let code = generateReferralCode();
    let existing = await db.select().from(usersTable).where(eq(usersTable.referralCode, code));
    while (existing.length > 0) {
      code = generateReferralCode();
      existing = await db.select().from(usersTable).where(eq(usersTable.referralCode, code));
    }

    await db.update(usersTable).set({ referralCode: code }).where(eq(usersTable.id, userId));
    return ok({ referralCode: code });
  },

  async signup(data: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    referralCode?: string;
  }): Promise<ServiceResult<{ success: true }>> {
    const existing = await db.select().from(usersTable).where(eq(usersTable.email, data.email)).limit(1);
    if (existing.length > 0) {
      return fail("An account with this email already exists", 400);
    }

    const hashPassword = await bcrypt.hash(data.password, 12);

    let newUserCode = generateReferralCode();
    let existingCode = await db.select().from(usersTable).where(eq(usersTable.referralCode, newUserCode));
    while (existingCode.length > 0) {
      newUserCode = generateReferralCode();
      existingCode = await db.select().from(usersTable).where(eq(usersTable.referralCode, newUserCode));
    }

    const [newUser] = await db.insert(usersTable).values({
      email: data.email,
      name: `${data.firstName} ${data.lastName}`,
      password: hashPassword,
      provider: "credentials",
      referralCode: newUserCode,
      lastLoginAt: new Date(),
    }).returning();

    if (data.referralCode) {
      const [referrer] = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.referralCode, data.referralCode))
        .limit(1);

      if (referrer && referrer.id !== newUser.id) {
        await db.insert(referralsTable).values({
          referrerId: referrer.id,
          referredId: newUser.id,
        });
      }
    }

    return ok({ success: true });
  },

  async claimProfileReward(
    userId: number,
    taskId: number,
  ): Promise<ServiceResult<{ pointsAwarded: number }>> {
    const [task] = await db.select({ points: tasksTable.points }).from(tasksTable).where(eq(tasksTable.id, taskId));
    if (!task) return fail("Task not found", 404);

    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
    if (!user) return fail("User not found", 404);

    if (!user.bio || !user.phoneNumber || !user.location) {
      return fail("Complete your profile first (bio, phone, and location required)", 400);
    }

    const existing = await db
      .select()
      .from(userTasksTable)
      .where(
        sql`${userTasksTable.userId} = ${userId} AND ${userTasksTable.taskId} = ${taskId} AND ${userTasksTable.status} = 'Completed'`,
      );
    if (existing.length > 0) return fail("You already completed this task", 429);

    const taskPoints = task.points ?? 0;

    await db.transaction(async (tx) => {
      await tx
        .insert(userTasksTable)
        .values({ userId, taskId, status: "Completed", completedAt: new Date() })
        .returning();

      await tx
        .update(usersTable)
        .set({
          points: (user.points || 0) + taskPoints,
          completedTasksCount: sql`${usersTable.completedTasksCount} + 1`,
        })
        .where(eq(usersTable.id, userId));
    });

    return ok({ pointsAwarded: taskPoints });
  },

  async claimReferralReward(
    userId: number,
    taskId: number,
  ): Promise<ServiceResult<{ pointsAwarded: number; referralCount: number }>> {
    const [task] = await db.select({ points: tasksTable.points }).from(tasksTable).where(eq(tasksTable.id, taskId));
    if (!task) return fail("Task not found", 404);
    const taskPoints = task.points ?? 0;

    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
    if (!user) return fail("User not found", 404);

    const existing = await db
      .select()
      .from(userTasksTable)
      .where(
        sql`${userTasksTable.userId} = ${userId} AND ${userTasksTable.taskId} = ${taskId} AND ${userTasksTable.status} = 'Completed'`,
      );
    if (existing.length > 0) return fail("You already completed this task", 429);

    const referrals = await db
      .select()
      .from(referralsTable)
      .where(eq(referralsTable.referrerId, userId))
      .orderBy(desc(referralsTable.createdAt));

    const unclaimedReferrals = referrals.filter((r) => r.pointsAwarded === 0);
    if (unclaimedReferrals.length === 0) {
      return fail("No referrals found. Share your referral code to invite friends!", 400);
    }

    const totalReferralPoints = unclaimedReferrals.length * taskPoints;

    await db.transaction(async (tx) => {
      await tx
        .insert(userTasksTable)
        .values({ userId, taskId, status: "Completed", completedAt: new Date() })
        .returning();

      await tx
        .update(usersTable)
        .set({
          points: (user.points || 0) + totalReferralPoints,
          completedTasksCount: sql`${usersTable.completedTasksCount} + 1`,
        })
        .where(eq(usersTable.id, userId));

      for (const ref of unclaimedReferrals) {
        await tx
          .update(referralsTable)
          .set({ pointsAwarded: taskPoints })
          .where(eq(referralsTable.id, ref.id));
      }
    });

    return ok({ pointsAwarded: totalReferralPoints, referralCount: unclaimedReferrals.length });
  },
};
