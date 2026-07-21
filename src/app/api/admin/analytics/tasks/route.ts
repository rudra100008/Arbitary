import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/src/services/auth.service";
import { eq, and, sql, desc, gte, lte, type SQL } from "drizzle-orm";
import { db } from "@/src/db";
import { tasksTable, userTasksTable, dailyTaskCompletionsTable } from "@/src/db/schema";

export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  // ── Base per-task stats (all tasks) ──
  const tasksWithStats = await db
    .select({
      id: tasksTable.id,
      title: tasksTable.title,
      taskType: tasksTable.taskType,
      points: tasksTable.points,
      isRecurring: tasksTable.isRecurring,
      pickedUp: sql<number>`count(${userTasksTable.id})::int`,
      completedCount: sql<number>`count(${userTasksTable.id}) FILTER (WHERE ${userTasksTable.status} IN ('Completed', 'Verified'))::int`,
      cancelledCount: sql<number>`count(${userTasksTable.id}) FILTER (WHERE ${userTasksTable.status} = 'Cancelled')::int`,
    })
    .from(tasksTable)
    .leftJoin(userTasksTable, eq(tasksTable.id, userTasksTable.taskId))
    .groupBy(tasksTable.id)
    .orderBy(desc(tasksTable.createdAt));

  // ── Daily task history stats from permanent log ──
  const dailyConditions: SQL[] = [];
  if (from) dailyConditions.push(gte(dailyTaskCompletionsTable.completionDate, from));
  if (to) dailyConditions.push(lte(dailyTaskCompletionsTable.completionDate, to));

  const dailyStats = await db
    .select({
      taskId: dailyTaskCompletionsTable.taskId,
      totalCompletions: sql<number>`count(*)::int`,
      uniqueUsers: sql<number>`count(DISTINCT ${dailyTaskCompletionsTable.userId})::int`,
      totalPointsAwarded: sql<number>`sum(${dailyTaskCompletionsTable.pointsAwarded})::int`,
    })
    .from(dailyTaskCompletionsTable)
    .where(dailyConditions.length > 0 ? and(...dailyConditions) : undefined)
    .groupBy(dailyTaskCompletionsTable.taskId);

  const dailyStatsMap = new Map(dailyStats.map((d) => [d.taskId, d]));

  // ── Daily completion counts by date (for trend charts) ──
  const dailyTrend = await db
    .select({
      completionDate: dailyTaskCompletionsTable.completionDate,
      count: sql<number>`count(*)::int`,
      uniqueUsers: sql<number>`count(DISTINCT ${dailyTaskCompletionsTable.userId})::int`,
      pointsAwarded: sql<number>`sum(${dailyTaskCompletionsTable.pointsAwarded})::int`,
    })
    .from(dailyTaskCompletionsTable)
    .where(dailyConditions.length > 0 ? and(...dailyConditions) : undefined)
    .groupBy(dailyTaskCompletionsTable.completionDate)
    .orderBy(dailyTaskCompletionsTable.completionDate);

  // ── Summary stats ──
  const totalDailyCompletions = dailyStats.reduce((s, d) => s + d.totalCompletions, 0);
  const totalDailyPoints = dailyStats.reduce((s, d) => s + (d.totalPointsAwarded ?? 0), 0);
  const permanentCompletions = tasksWithStats
    .filter((t) => !t.isRecurring)
    .reduce((s, t) => s + t.completedCount, 0);
  const permanentPoints = tasksWithStats
    .filter((t) => !t.isRecurring)
    .reduce((s, t) => s + t.completedCount * t.points, 0);

  const result = tasksWithStats.map((t) => {
    const picked = t.pickedUp;
    const completed = t.completedCount;
    const cancelled = t.cancelledCount;
    const daily = dailyStatsMap.get(t.id);

    return {
      taskId: t.id,
      title: t.title,
      taskType: t.taskType,
      points: t.points,
      isRecurring: t.isRecurring,
      pickedUp: picked,
      completedCount: completed,
      cancelled: cancelled,
      conversionRate: picked > 0 ? Math.round((completed / picked) * 100) : 0,
      dropOffRate: picked > 0 ? Math.round((cancelled / picked) * 100) : 0,
      // Daily-specific analytics (only meaningful for isRecurring tasks)
      totalDailyCompletions: daily?.totalCompletions ?? 0,
      uniqueDailyUsers: daily?.uniqueUsers ?? 0,
      totalDailyPointsAwarded: daily?.totalPointsAwarded ?? 0,
    };
  });

  return NextResponse.json({
    tasks: result,
    dailyTrend,
    summary: {
      totalDailyCompletions,
      totalDailyPoints,
      permanentCompletions,
      permanentPoints,
    },
  }, { status: 200 });
}
