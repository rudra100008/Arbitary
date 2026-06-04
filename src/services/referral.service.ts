import crypto from "crypto";
import { db } from "@/src/db";
import { usersTable, referralsTable, userTasksTable, pointsLogTable } from "@/src/db/schema";
import { eq, and, isNull, inArray, sql } from "drizzle-orm";
import { ServiceResult, ok, fail } from "./result";
import { rateLimit } from "@/src/lib/rate-limit";
import { getRankLabel } from "@/src/lib/tiers";

const REFERRAL_BONUS = 100;

export const ReferralService = {
  async assignReferralCode(userId: number): Promise<ServiceResult<{ code: string }>> {
    const [existing] = await db
      .select({ code: usersTable.referralCode })
      .from(usersTable)
      .where(eq(usersTable.id, userId));
    if (!existing) return fail("User not found", 404);
    if (existing.code) return ok({ code: existing.code });

    let code = crypto.randomBytes(4).toString("hex").toUpperCase();
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        const [updated] = await db
          .update(usersTable)
          .set({ referralCode: code })
          .where(and(eq(usersTable.id, userId), isNull(usersTable.referralCode)))
          .returning({ code: usersTable.referralCode });
        if (updated?.code) return ok({ code: updated.code });
        code = crypto.randomBytes(4).toString("hex").toUpperCase();
      } catch (err: any) {
        if (err?.code !== "23505" || attempt === 4) throw err;
        code = crypto.randomBytes(4).toString("hex").toUpperCase();
      }
    }
    return fail("Failed to generate unique referral code", 500);
  },

  async bindReferralCode(
    userId: number,
    referralCode: string,
  ): Promise<ServiceResult<{ bonusAwarded: boolean }>> {
    const rl = await rateLimit(`referral:bind:${userId}`, 3, 60_000);
    if (!rl.allowed) return fail("Too many attempts. Try again later.", 429);

    const normalized = referralCode.trim().toUpperCase();

    try {
      const result = await db.transaction(async (tx) => {
        await tx.execute(sql`SELECT id FROM ${usersTable} WHERE id = ${userId} FOR UPDATE`);

        const [user] = await tx
          .select()
          .from(usersTable)
          .where(eq(usersTable.id, userId));

        if (!user) throw new Error("User not found");
        if (user.referredBy) throw new Error("Already referred by someone");

        const [referrer] = await tx
          .select()
          .from(usersTable)
          .where(eq(usersTable.referralCode, normalized));

        if (!referrer) throw new Error("Invalid referral code");
        if (referrer.id === userId) throw new Error("Cannot refer yourself");

        if (referrer.createdAt && user.createdAt && referrer.createdAt > user.createdAt) {
          throw new Error("Cannot link to an account younger than yours");
        }

        const [firstTask] = await tx
          .select()
          .from(userTasksTable)
          .where(
            and(
              eq(userTasksTable.userId, userId),
              inArray(userTasksTable.status, ["Completed", "Verified"]),
            ),
          )
          .limit(1);

        const hasCompletedFirstTask = !!firstTask;

        await tx
          .update(usersTable)
          .set({ referredBy: referrer.id, referralRewarded: hasCompletedFirstTask })
          .where(eq(usersTable.id, userId));

        await tx.insert(referralsTable).values({
          referrerId: referrer.id,
          referredId: userId,
          pointsAwarded: hasCompletedFirstTask ? REFERRAL_BONUS : 0,
        });

        if (hasCompletedFirstTask) {
          const [refUser] = await tx
            .select({ lifetimePoints: usersTable.lifetimePoints })
            .from(usersTable)
            .where(eq(usersTable.id, referrer.id));
          const newLifetime = (refUser?.lifetimePoints || 0) + REFERRAL_BONUS;
          await tx
            .update(usersTable)
            .set({
              points: sql`${usersTable.points} + ${REFERRAL_BONUS}`,
              lifetimePoints: sql`${usersTable.lifetimePoints} + ${REFERRAL_BONUS}`,
              rank: getRankLabel(newLifetime),
            })
            .where(eq(usersTable.id, referrer.id));
        }

        return { bonusAwarded: hasCompletedFirstTask };
      });

      return ok(result);
    } catch (err: any) {
      return fail(err.message, 400);
    }
  },

  async getReferralStats(
    userId: number,
  ): Promise<
    ServiceResult<{
      code: string;
      link: string;
      totalReferred: number;
      converted: number;
      pointsEarned: number;
    }>
  > {
    const [user] = await db
      .select({ code: usersTable.referralCode })
      .from(usersTable)
      .where(eq(usersTable.id, userId));
    if (!user?.code) return fail("No referral code", 404);

    const referrals = await db
      .select()
      .from(referralsTable)
      .where(eq(referralsTable.referrerId, userId));

    return ok({
      code: user.code,
      link: `${process.env.NEXTAUTH_URL}/signup?ref=${user.code}`,
      totalReferred: referrals.length,
      converted: referrals.filter((r) => (r.pointsAwarded ?? 0) > 0).length,
      pointsEarned: referrals.reduce((sum, r) => sum + (r.pointsAwarded ?? 0), 0),
    });
  },

  async awardReferralBonusIfEligible(userId: number): Promise<void> {
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, userId));
    const referredBy = user?.referredBy;
    if (!referredBy || user?.referralRewarded) return;

    const [referrer] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, referredBy));
    if (!referrer) return;

    await db.transaction(async (tx) => {
      await tx
        .update(usersTable)
        .set({ referralRewarded: true })
        .where(eq(usersTable.id, userId));

      await tx
        .update(referralsTable)
        .set({ pointsAwarded: REFERRAL_BONUS })
        .where(
          and(
            eq(referralsTable.referrerId, referredBy),
            eq(referralsTable.referredId, userId),
          ),
        );

      const [bonusUser] = await tx
        .select({ lifetimePoints: usersTable.lifetimePoints })
        .from(usersTable)
        .where(eq(usersTable.id, referredBy));
      const newLifetime = (bonusUser?.lifetimePoints || 0) + REFERRAL_BONUS;
      await tx
        .update(usersTable)
        .set({
          points: sql`${usersTable.points} + ${REFERRAL_BONUS}`,
          lifetimePoints: sql`${usersTable.lifetimePoints} + ${REFERRAL_BONUS}`,
          rank: getRankLabel(newLifetime),
        })
        .where(eq(usersTable.id, referredBy));

      await tx.insert(pointsLogTable).values({
        userId: referredBy,
        points: REFERRAL_BONUS,
        reason: `Referral bonus for referring user #${userId}`,
      });
    });
  },
};
