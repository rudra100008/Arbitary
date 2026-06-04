import { NextRequest, NextResponse } from "next/server";
import { db } from "@/src/db";
import { tasksTable, watchSessionsTable, usersTable } from "@/src/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { requireUser } from "@/src/services/auth.service";

const MAX_CHECKPOINT_SECONDS = 12;
const CLOCK_DRIFT_BUFFER_MS = 5_000;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireUser();
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  const { id } = await params;
  const taskId = Number(id);
  if (isNaN(taskId)) {
    return NextResponse.json({ error: "Invalid task ID" }, { status: 400 });
  }

  const [task] = await db
    .select()
    .from(tasksTable)
    .where(and(eq(tasksTable.id, taskId), eq(tasksTable.platform, "youtube")));

  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  const [existingSession] = await db
    .select()
    .from(watchSessionsTable)
    .where(
      and(
        eq(watchSessionsTable.userId, auth.data.id),
        eq(watchSessionsTable.taskId, taskId),
      ),
    )
    .orderBy(sql`${watchSessionsTable.createdAt} DESC`)
    .limit(1);

  if (existingSession) {
    return NextResponse.json({
      sessionId: existingSession.id,
      watchedSeconds: existingSession.watchedSeconds,
      requiredSeconds: task.watchDuration ?? 30,
      completed: false,
      lastPosition: existingSession.lastPositionSeconds,
    });
  }

  const [session] = await db
    .insert(watchSessionsTable)
    .values({
      userId: auth.data.id,
      taskId,
    })
    .returning();

  return NextResponse.json({
    sessionId: session.id,
    watchedSeconds: 0,
    requiredSeconds: task.watchDuration ?? 30,
    completed: false,
    lastPosition: 0,
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireUser();
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  const { id } = await params;
  const taskId = Number(id);
  if (isNaN(taskId)) {
    return NextResponse.json({ error: "Invalid task ID" }, { status: 400 });
  }

  const body = await req.json();
  const { positionSeconds } = body;

  if (typeof positionSeconds !== "number" || positionSeconds < 0) {
    return NextResponse.json({ error: "positionSeconds is required and must be a positive number" }, { status: 400 });
  }

  const [session] = await db
    .select()
    .from(watchSessionsTable)
    .where(
      and(
        eq(watchSessionsTable.userId, auth.data.id),
        eq(watchSessionsTable.taskId, taskId),
      ),
    )
    .orderBy(sql`${watchSessionsTable.createdAt} DESC`)
    .limit(1);

  if (!session) {
    return NextResponse.json({ error: "No active watch session. Start one first." }, { status: 404 });
  }

  if (session.completedAt) {
    return NextResponse.json({ error: "Watch session already completed" }, { status: 400 });
  }

  const sessionAge = Date.now() - new Date(session.lastCheckpointAt ?? session.createdAt ?? new Date()).getTime();
  if (sessionAge < (MAX_CHECKPOINT_SECONDS * 1000 - CLOCK_DRIFT_BUFFER_MS)) {
    return NextResponse.json({
      error: "Progress reported too quickly",
      watchedSeconds: session.watchedSeconds,
      retryAfterSeconds: Math.ceil((MAX_CHECKPOINT_SECONDS * 1000 - sessionAge) / 1000),
    }, { status: 429 });
  }

  const delta = positionSeconds - session.lastPositionSeconds;
  const creditedSeconds = Math.min(Math.max(0, delta), MAX_CHECKPOINT_SECONDS);
  const newTotal = session.watchedSeconds + creditedSeconds;

  const requiredSeconds = (await db
    .select({ watchDuration: tasksTable.watchDuration })
    .from(tasksTable)
    .where(eq(tasksTable.id, taskId))
    .then((r) => r[0]?.watchDuration)) ?? 30;

  const isCompleted = newTotal >= requiredSeconds;

  await db
    .update(watchSessionsTable)
    .set({
      watchedSeconds: newTotal,
      lastPositionSeconds: positionSeconds,
      lastCheckpointAt: new Date(),
      completedAt: isCompleted ? new Date() : null,
    })
    .where(eq(watchSessionsTable.id, session.id));

  return NextResponse.json({
    watchedSeconds: newTotal,
    requiredSeconds,
    completed: isCompleted,
    creditedSeconds,
  });
}
