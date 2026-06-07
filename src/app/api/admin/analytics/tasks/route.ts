import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/src/services/auth.service";
import { TaskService } from "@/src/services/task.service";
import { eq, and, sql, desc } from "drizzle-orm";
import { db } from "@/src/db";
import { tasksTable, userTasksTable } from "@/src/db/schema";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  const tasks = await db
    .select({
      id: tasksTable.id,
      title: tasksTable.title,
      taskType: tasksTable.taskType,
      points: tasksTable.points,
    })
    .from(tasksTable)
    .orderBy(desc(tasksTable.createdAt));

  const result = [];

  for (const task of tasks) {
    const [pickedUp] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(userTasksTable)
      .where(eq(userTasksTable.taskId, task.id));

    const [completed] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(userTasksTable)
      .where(
        and(
          eq(userTasksTable.taskId, task.id),
          sql`${userTasksTable.status} IN ('Completed', 'Verified')`,
        ),
      );

    const [cancelled] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(userTasksTable)
      .where(
        and(
          eq(userTasksTable.taskId, task.id),
          eq(userTasksTable.status, "Cancelled"),
        ),
      );

    const picked = pickedUp?.count ?? 0;
    const completedCount = completed?.count ?? 0;
    const cancelledCount = cancelled?.count ?? 0;

    result.push({
      taskId: task.id,
      title: task.title,
      taskType: task.taskType,
      points: task.points,
      pickedUp: picked,
      completedCount,
      cancelled: cancelledCount,
      conversionRate: picked > 0 ? Math.round((completedCount / picked) * 100) : 0,
      dropOffRate: picked > 0 ? Math.round((cancelledCount / picked) * 100) : 0,
    });
  }

  return NextResponse.json({ tasks: result }, { status: 200 });
}
