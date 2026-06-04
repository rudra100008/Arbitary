import { NextResponse } from "next/server";
import { db } from "@/src/db";
import { pointsLogTable, tasksTable } from "@/src/db/schema";
import { eq, desc } from "drizzle-orm";
import { requireUser } from "@/src/services/auth.service";

export async function GET() {
  const auth = await requireUser();
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  const pointsLog = await db
    .select({
      id: pointsLogTable.id,
      points: pointsLogTable.points,
      reason: pointsLogTable.reason,
      createdAt: pointsLogTable.createdAt,
      taskTitle: tasksTable.title,
    })
    .from(pointsLogTable)
    .leftJoin(tasksTable, eq(pointsLogTable.taskId, tasksTable.id))
    .where(eq(pointsLogTable.userId, auth.data.id))
    .orderBy(desc(pointsLogTable.createdAt))
    .limit(100);

  return NextResponse.json(pointsLog);
}
