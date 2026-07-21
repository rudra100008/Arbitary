import crypto from "crypto";
import { db } from "@/src/db";
import { usersTable, referralsTable, userTasksTable, pointsLogTable } from "@/src/db/schema";
import { eq, and, isNull, sql, } from "drizzle-orm";
import { ServiceResult, ok, fail } from "./result";
import { rateLimit } from "@/src/lib/rate-limit";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export const REFERRAL_BONUS = 100;

// Sentinel used to distinguish expected business-rule rejections
// (which get a 400 + user-facing message) from unexpected DB/runtime
// errors (which get a 500 and should not leak internals to the client).
class ReferralRuleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ReferralRuleError";
  }
}

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
      } catch (err: unknown) {
        if (!(err instanceof Error) || (err as NodeJS.ErrnoException).code !== "23505" || attempt === 4) throw err;
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
        // Lock the user row with Drizzle ORM (not raw sql`...FOR UPDATE`)
        // to prevent concurrent bind attempts on the same account.
        const [user] = await tx
          .select()
          .from(usersTable)
          .where(eq(usersTable.id, userId))
          .for("update");

        if (!user) throw new ReferralRuleError("User not found");
        if (user.referredBy) throw new ReferralRuleError("You have already used a referral code");

        const [referrer] = await tx
          .select()
          .from(usersTable)
          .where(sql`UPPER(${usersTable.referralCode}) = ${normalized}`);

        if (!referrer) throw new ReferralRuleError("Invalid referral code — please check and try again");
        if (referrer.id === userId) throw new ReferralRuleError("You cannot use your own referral code");

        if (referrer.createdAt && user.createdAt && referrer.createdAt > user.createdAt) {
          throw new ReferralRuleError("Cannot link to an account younger than yours");
        }

        const [completedResult] = await tx
          .select({ count: sql<number>`COUNT(*)` })
          .from(userTasksTable)
          .where(
            and(
              eq(userTasksTable.userId, userId),
              sql`LOWER(${userTasksTable.status}) IN ('completed', 'verified')`,
            ),
          );

        const hasCompletedRequiredTasks = (completedResult?.count ?? 0) >= 3;

        await tx
          .update(usersTable)
          .set({ referredBy: referrer.id, referralRewarded: hasCompletedRequiredTasks })
          .where(eq(usersTable.id, userId));

        await tx.insert(referralsTable).values({
          referrerId: referrer.id,
          referredId: userId,
          pointsAwarded: hasCompletedRequiredTasks ? REFERRAL_BONUS : 0,
        });

        if (hasCompletedRequiredTasks) {
          await tx
            .update(usersTable)
            .set({
              points: sql`${usersTable.points} + ${REFERRAL_BONUS}`,
              monthlyPoints: sql`${usersTable.monthlyPoints} + ${REFERRAL_BONUS}`,
            })
            .where(eq(usersTable.id, referrer.id));
        }

        return { bonusAwarded: hasCompletedRequiredTasks };
      });

      return ok(result);
    } catch (err: unknown) {
      if (err instanceof ReferralRuleError) {
        // Known business rule violation — safe to show to the user
        return fail(err.message, 400);
      }
      // Unexpected DB/runtime error — log internally, don't leak details
      console.error("[ReferralService.bindReferralCode] Unexpected error:", err);
      return fail("Something went wrong. Please try again.", 500);
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

    if (!user) return fail("User not found", 404);

    // Auto-assign a referral code if the user doesn't have one yet.
    // This handles accounts created before code assignment was added,
    // or OAuth signups where assignReferralCode failed silently.
    let code = user.code;
    if (!code) {
      const assigned = await ReferralService.assignReferralCode(userId);
      if (!assigned.success) return fail("Could not generate referral code", 500);
      code = assigned.data.code;
    }

    const referrals = await db
      .select()
      .from(referralsTable)
      .where(eq(referralsTable.referrerId, userId));

    return ok({
      code: code,
      link: `${process.env.NEXTAUTH_URL}/signup?ref=${code}`,
      totalReferred: referrals.length,
      converted: referrals.filter((r) => (r.pointsAwarded ?? 0) > 0).length,
      pointsEarned: referrals.reduce((sum, r) => sum + (r.pointsAwarded ?? 0), 0),
    });
  },

  async awardReferralBonusIfEligible(userId: number, tx?: Tx): Promise<void> {
    const runInTransaction = async (transactionContext: Tx) => {
      const [user] = await transactionContext
        .select()
        .from(usersTable)
        .where(eq(usersTable.id, userId))
        .for("update");

      const referredBy = user?.referredBy;
      if (!referredBy || user?.referralRewarded) return;

      const [completedResult] = await transactionContext
        .select({ count: sql<number>`COUNT(*)` })
        .from(userTasksTable)
        .where(
          and(
            eq(userTasksTable.userId, userId),
            sql`LOWER(${userTasksTable.status}) IN ('completed', 'verified')`,
          ),
        );

      if ((completedResult?.count ?? 0) < 3) return;

      const [referrer] = await transactionContext
        .select()
        .from(usersTable)
        .where(eq(usersTable.id, referredBy));
      if (!referrer) return;

      await transactionContext
        .update(usersTable)
        .set({ referralRewarded: true })
        .where(eq(usersTable.id, userId));

      await transactionContext
        .update(referralsTable)
        .set({ pointsAwarded: REFERRAL_BONUS })
        .where(
          and(
            eq(referralsTable.referrerId, referredBy),
            eq(referralsTable.referredId, userId),
          ),
        );

      await transactionContext
        .update(usersTable)
        .set({
          points: sql`${usersTable.points} + ${REFERRAL_BONUS}`,
          monthlyPoints: sql`${usersTable.monthlyPoints} + ${REFERRAL_BONUS}`,
        })
        .where(eq(usersTable.id, referredBy));

      await transactionContext.insert(pointsLogTable).values({
        userId: referredBy,
        points: REFERRAL_BONUS,
        reason: `Referral bonus for referring user #${userId}`,
      });
    };

    if (tx) {
      await runInTransaction(tx);
    } else {
      await db.transaction(async (newTx) => {
        await runInTransaction(newTx);
      });
    }
  },
};