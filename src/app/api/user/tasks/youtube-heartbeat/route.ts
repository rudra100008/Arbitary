import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/src/services/auth.service";
import { youtubeHeartbeatSchema } from "@/src/lib/validations/task";
import { db } from "@/src/db";
import {
  youtubeSessionsTable,
  userTasksTable,
  tasksTable,
  usersTable,
} from "@/src/db/schema";
import { eq, and, sql, desc } from "drizzle-orm";
import crypto from "crypto";

const CHALLENGE_SECRET =
  process.env.YOUTUBE_CHALLENGE_SECRET ?? process.env.NEXTAUTH_SECRET!;

function signChallenge(sessionId: number, challengeHeartbeat: number): string {
  return crypto
    .createHmac("sha256", CHALLENGE_SECRET)
    .update(`${sessionId}-${challengeHeartbeat}`)
    .digest("hex");
}

export async function POST(req: NextRequest) {
  const auth = await requireUser();
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  const parsed = youtubeHeartbeatSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { taskId, heartbeatIndex, sessionToken, responseToken } = parsed.data;
  const userId = auth.data.id;

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
    return NextResponse.json({ error: "Active task not found" }, { status: 404 });
  }

  // 1. Fetch and secure the watch session (verifying ownership)
  const watchSession = await db.query.youtubeSessionsTable.findFirst({
    where: and(
      eq(youtubeSessionsTable.userTaskId, userTaskRow.id),
      eq(youtubeSessionsTable.userId, userId),
      eq(youtubeSessionsTable.sessionToken, sessionToken),
    ),
  });

  if (!watchSession) {
    return NextResponse.json({ error: "Invalid watch session" }, { status: 400 });
  }

  // Status check before failure counter check
  if (watchSession.status !== "active") {
    return NextResponse.json({ error: "Session is no longer active" }, { status: 400 });
  }

  // 2. Enforce lockout/fraud guards
  if (watchSession.consecutiveFailures >= 3) {
    return NextResponse.json(
      { error: "Too many failures. Watch session locked." },
      { status: 429 },
    );
  }

  const now = new Date();

  // 3. Expiry Check — does NOT increment failure count
  if (now > watchSession.expiresAt) {
    await db
      .update(youtubeSessionsTable)
      .set({ status: "invalidated" })
      .where(eq(youtubeSessionsTable.id, watchSession.id));
    return NextResponse.json({ error: "Session expired" }, { status: 400 });
  }

  // 4. Sequential index check
  if (heartbeatIndex <= watchSession.heartbeatCount) {
    const newFailures = watchSession.consecutiveFailures + 1;
    const shouldInvalidate = newFailures >= 3;

    await db
      .update(youtubeSessionsTable)
      .set({
        status: shouldInvalidate ? "invalidated" : watchSession.status,
        consecutiveFailures: newFailures
      })
      .where(eq(youtubeSessionsTable.id, watchSession.id));

    if (shouldInvalidate) {
      await db
        .update(usersTable)
        .set({ isFlagged: true })
        .where(eq(usersTable.id, userId));
    }

    return NextResponse.json({ error: "Non-sequential heartbeat index" }, { status: 400 });
  }

  const timeElapsed =
    (now.getTime() - watchSession.lastHeartbeatAt.getTime()) / 1000;

  // 5. Enforce Interval timing window (only prevent heartbeats that are too fast)
  if (heartbeatIndex > 0 && timeElapsed < 9.5) {
    const newFailures = watchSession.consecutiveFailures + 1;
    const shouldInvalidate = newFailures >= 3;

    await db
      .update(youtubeSessionsTable)
      .set({
        status: shouldInvalidate ? "invalidated" : watchSession.status,
        consecutiveFailures: newFailures
      })
      .where(eq(youtubeSessionsTable.id, watchSession.id));

    if (shouldInvalidate) {
      await db
        .update(usersTable)
        .set({ isFlagged: true })
        .where(eq(usersTable.id, userId));
    }

    return NextResponse.json({ error: "Timing violation detected" }, { status: 400 });
  }

  // 6. Enforce Attention Challenge checks
  const challengeHeartbeat = Math.floor(watchSession.challengeSecond / 10);

  if (
    heartbeatIndex > challengeHeartbeat + 1 &&
    !watchSession.challengeCompleted
  ) {
    const newFailures = watchSession.consecutiveFailures + 1;
    await db
      .update(youtubeSessionsTable)
      .set({ status: "invalidated", consecutiveFailures: newFailures })
      .where(eq(youtubeSessionsTable.id, watchSession.id));

    if (newFailures >= 3) {
      await db
        .update(usersTable)
        .set({ isFlagged: true })
        .where(eq(usersTable.id, userId));
    }

    return NextResponse.json({ error: "Missed attention challenge" }, { status: 400 });
  }

  let isChallengeCompleted = watchSession.challengeCompleted;

  if (heartbeatIndex === challengeHeartbeat + 1) {
    const expectedToken = signChallenge(watchSession.id, challengeHeartbeat);
    if (responseToken !== expectedToken) {
      const newFailures = watchSession.consecutiveFailures + 1;
      await db
        .update(youtubeSessionsTable)
        .set({ status: "invalidated", consecutiveFailures: newFailures })
        .where(eq(youtubeSessionsTable.id, watchSession.id));

      if (newFailures >= 3) {
        await db
          .update(usersTable)
          .set({ isFlagged: true })
          .where(eq(usersTable.id, userId));
      }

      return NextResponse.json({ error: "Invalid challenge response token" }, { status: 400 });
    }
    isChallengeCompleted = true;
  }

  // 7. Complete Session Check & Point Award (Atomic Transaction)
  if (heartbeatIndex === watchSession.expectedHeartbeats) {
    if (!isChallengeCompleted) {
      return NextResponse.json({ error: "Challenge not completed" }, { status: 400 });
    }

    await db.transaction(async (tx) => {
      const [userTaskRow2] = await tx
        .select({ taskId: userTasksTable.taskId })
        .from(userTasksTable)
        .where(eq(userTasksTable.id, userTaskRow.id));

      if (!userTaskRow2 || !userTaskRow2.taskId) throw new Error("Task data not found");

      const [taskRow] = await tx
        .select({ points: tasksTable.points })
        .from(tasksTable)
        .where(eq(tasksTable.id, userTaskRow2.taskId!));

      if (!taskRow) throw new Error("Task data not found");

      await tx
        .update(userTasksTable)
        .set({ status: "Completed", completedAt: now })
        .where(eq(userTasksTable.id, userTaskRow.id));

      await tx
        .update(usersTable)
        .set({
          points: sql`${usersTable.points} + ${taskRow.points || 0}`,
          completedTasksCount: sql`${usersTable.completedTasksCount} + 1`,
        })
        .where(eq(usersTable.id, userId));

      await tx
        .update(youtubeSessionsTable)
        .set({
          status: "completed",
          heartbeatCount: heartbeatIndex,
          lastHeartbeatAt: now,
          consecutiveFailures: 0,
        })
        .where(eq(youtubeSessionsTable.id, watchSession.id));
    });

    return NextResponse.json({ completed: true });
  }

  // 8. Regular update
  await db
    .update(youtubeSessionsTable)
    .set({
      heartbeatCount: heartbeatIndex,
      lastHeartbeatAt: now,
      challengeCompleted: isChallengeCompleted,
      consecutiveFailures: 0,
    })
    .where(eq(youtubeSessionsTable.id, watchSession.id));

  const promptRequired = heartbeatIndex === challengeHeartbeat;
  const challengeToken = promptRequired
    ? signChallenge(watchSession.id, challengeHeartbeat)
    : undefined;

  return NextResponse.json({ ok: true, promptRequired, challengeToken });
}
