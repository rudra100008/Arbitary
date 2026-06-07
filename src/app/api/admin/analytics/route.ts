import { NextResponse } from "next/server";
import { db } from "@/src/db";
import { usersTable, userTasksTable } from "@/src/db/schema";
import { eq, sql } from "drizzle-orm";
import { requireAdmin } from "@/src/services/auth.service";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  const thirtyDaysAgo = new Date(
    Date.now() - 30 * 24 * 60 * 60 * 1000,
  );

  const [[pointsResult], [activeResult], [pendingResult]] =
    await Promise.all([
      db
        .select({
          total: sql<number>`coalesce(sum(${usersTable.points}), 0)`,
        })
        .from(usersTable),
      db
        .select({
          count: sql<number>`count(*)::int`,
        })
        .from(usersTable)
        .where(
          sql`${usersTable.lastLoginAt} >= ${thirtyDaysAgo} OR ${usersTable.completedTasksCount} > 0`,
        ),
      db
        .select({
          count: sql<number>`count(*)::int`,
        })
        .from(userTasksTable)
        .where(eq(userTasksTable.status, "Pending Verification")),
    ]);

  return NextResponse.json({
    success: true,
    data: {
      totalPointsDistributed: Number(pointsResult?.total ?? 0),
      activeUsers: Number(activeResult?.count ?? 0),
      pendingVerifications: Number(pendingResult?.count ?? 0),
    },
  });
}
