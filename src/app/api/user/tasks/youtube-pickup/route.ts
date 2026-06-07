import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/src/services/auth.service";
import { youtubePickupSchema } from "@/src/lib/validations/task";
import { db } from "@/src/db";
import {
  youtubeSessionsTable,
  userTasksTable,
  tasksTable,
  usersTable,
} from "@/src/db/schema";
import { eq, and, sql, desc } from "drizzle-orm";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  const auth = await requireUser();
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  const parsed = youtubePickupSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { taskId } = parsed.data;
  const userId = auth.data.id;

  const [task] = await db
    .select()
    .from(tasksTable)
    .where(eq(tasksTable.id, taskId));

  if (!task || task.platform !== "youtube") {
    return NextResponse.json({ error: "YouTube task not found" }, { status: 404 });
  }

  const [userTaskRow] = await db
    .select()
    .from(userTasksTable)
    .where(
      and(
        eq(userTasksTable.userId, userId),
        eq(userTasksTable.taskId, taskId),
        sql`${userTasksTable.status} NOT IN ('Completed', 'Verified', 'Cancelled')`,
      ),
    )
    .orderBy(desc(userTasksTable.assignedAt))
    .limit(1);

  if (!userTaskRow) {
    return NextResponse.json(
      { error: "Task not picked up by you or already completed" },
      { status: 400 },
    );
  }

  const [fraudCheck] = await db
    .select({ isFlagged: usersTable.isFlagged })
    .from(usersTable)
    .where(eq(usersTable.id, userId));

  if (fraudCheck?.isFlagged) {
    return NextResponse.json(
      { error: "Account flagged for review. Please contact support." },
      { status: 403 },
    );
  }

  const existingSession = await db.query.youtubeSessionsTable.findFirst({
    where: and(
      eq(youtubeSessionsTable.userTaskId, userTaskRow.id),
      eq(youtubeSessionsTable.userId, userId),
      eq(youtubeSessionsTable.status, "active"),
    ),
  });

  if (existingSession) {
    await db
      .update(youtubeSessionsTable)
      .set({ status: "invalidated" })
      .where(eq(youtubeSessionsTable.id, existingSession.id));
  }

  const requiredSeconds = task.watchDuration ?? 30;
  const sessionToken = crypto.randomUUID();
  const expectedHeartbeats = Math.floor(requiredSeconds / 10);
  const challengeSecond = Math.max(
    15,
    Math.floor(Math.random() * Math.max(requiredSeconds - 25, 1)) + 15,
  );
  const expiresAt = new Date(Date.now() + requiredSeconds * 1000 + 600000); // 10 minute buffer


  await db.insert(youtubeSessionsTable).values({
    userTaskId: userTaskRow.id,
    userId,
    sessionToken,
    expectedHeartbeats,
    heartbeatCount: -1,
    challengeSecond,
    expiresAt,
  });

  return NextResponse.json(
    {
      sessionToken,
      expectedHeartbeats,
      challengeSecond,
      expiresAt: expiresAt.toISOString(),
      userTaskId: userTaskRow.id,
    },
    { status: 201 },
  );
}
