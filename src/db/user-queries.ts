import { db } from './index';
import { usersTable, referralsTable } from './schema';
import { eq, desc, sql } from 'drizzle-orm';
import { getUserTier } from '@/src/lib/gamification';

export type TopUser = {
  id: number;
  name: string | null;
  image: string | null;
  points: number;
  tasks: number;
  referrals: number;
  tier: string;
};

export async function getTopUsers(limit: number = 100): Promise<TopUser[]> {
  const result = await db
    .select({
      id: usersTable.id,
      name: usersTable.name,
      image: usersTable.image,
      points: usersTable.points,
      tasks: usersTable.completedTasksCount,
      referrals: sql<number>`(select count(*) from ${referralsTable} where ${referralsTable.referrerId} = ${usersTable.id})`,
    })
    .from(usersTable)
    .where(eq(usersTable.role, 'USER'))
    .orderBy(desc(usersTable.points))
    .limit(limit);

  return result.map((user) => ({
    ...user,
    tasks: Number(user.tasks),
    referrals: Number(user.referrals),
    tier: getUserTier(Number(user.tasks)),
  }));
}
