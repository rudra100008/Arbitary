import { db } from "@/src/db";
import { usersTable } from "@/src/db/schema";
import { getRankLabel } from "@/src/lib/tiers";
import { eq } from "drizzle-orm";

export async function checkRankUpdate(userId: number): Promise<string> {
  const [user] = await db
    .select({ lifetimePoints: usersTable.lifetimePoints, rank: usersTable.rank })
    .from(usersTable)
    .where(eq(usersTable.id, userId));

  if (!user) throw new Error(`User ${userId} not found`);

  const correctRank = getRankLabel(user.lifetimePoints);
  if (user.rank !== correctRank) {
    await db
      .update(usersTable)
      .set({ rank: correctRank })
      .where(eq(usersTable.id, userId));
  }
  return correctRank;
}
