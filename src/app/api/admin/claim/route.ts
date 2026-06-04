import { NextRequest, NextResponse } from "next/server";
import { db } from "@/src/db";
import { userTasksTable, tasksTable, usersTable, pointsLogTable } from "@/src/db/schema";
import { eq, desc, and, sql } from "drizzle-orm";
import { requireAdmin } from "@/src/services/auth.service";
import { ReferralService } from "@/src/services/referral.service";
import { getRankLabel } from "@/src/lib/tiers";

async function deleteCloudinaryImage(url: string): Promise<void> {
  try {
    const uploadSegment = "/upload/";
    const idx = url.indexOf(uploadSegment);
    if (idx === -1) return;
    const afterUpload = url.slice(idx + uploadSegment.length);
    const withoutVersion = afterUpload.replace(/^v\d+\//, "");
    const publicId = withoutVersion.replace(/\.[^.]+$/, "");

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    if (!cloudName || !apiKey || !apiSecret) return;

    const auth = Buffer.from(`${apiKey}:${apiSecret}`).toString("base64");
    await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ public_id: publicId }),
      },
    );
  } catch {
    // non-critical; orphaned images are acceptable
  }
}

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const claims = await db
    .select({
      id: userTasksTable.id,
      userId: userTasksTable.userId,
      taskId: userTasksTable.taskId,
      proofUrl: userTasksTable.proofUrl,
      proofImageUrl: userTasksTable.proofImageUrl,
      completedAt: userTasksTable.completedAt,
      assignedAt: userTasksTable.assignedAt,
      status: userTasksTable.status,
      taskTitle: tasksTable.title,
      taskPoints: tasksTable.points,
      userName: usersTable.name,
      userEmail: usersTable.email,
    })
    .from(userTasksTable)
    .innerJoin(tasksTable, eq(userTasksTable.taskId, tasksTable.id))
    .innerJoin(usersTable, eq(userTasksTable.userId, usersTable.id))
    .where(
      and(
        eq(userTasksTable.status, "pending"),
        sql`${userTasksTable.proofUrl} IS NOT NULL`,
      ),
    )
    .orderBy(desc(userTasksTable.completedAt));

  return NextResponse.json(claims);
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action");
  const id = searchParams.get("id");

  if (!action || !id) {
    return NextResponse.json({ error: "action and id are required" }, { status: 400 });
  }

  const [userTask] = await db
    .select({
      userTask: userTasksTable,
      task: tasksTable,
      user: usersTable,
    })
    .from(userTasksTable)
    .innerJoin(tasksTable, eq(userTasksTable.taskId, tasksTable.id))
    .innerJoin(usersTable, eq(userTasksTable.userId, usersTable.id))
    .where(eq(userTasksTable.id, Number(id)));

  if (!userTask) {
    return NextResponse.json({ error: "Claim not found" }, { status: 404 });
  }

  if (action === "approve") {
    const pointsAwarded = userTask.task.points ?? 0;

    await db.transaction(async (tx) => {
      const newLifetime = (userTask.user.lifetimePoints || 0) + pointsAwarded;

      await tx
        .update(userTasksTable)
        .set({ status: "verified" })
        .where(eq(userTasksTable.id, Number(id)));

      await tx
        .update(usersTable)
        .set({
          points: sql`${usersTable.points} + ${pointsAwarded}`,
          lifetimePoints: sql`${usersTable.lifetimePoints} + ${pointsAwarded}`,
          rank: getRankLabel(newLifetime),
          completedTasksCount: sql`${usersTable.completedTasksCount} + 1`,
        })
        .where(eq(usersTable.id, userTask.user.id));

      await tx.insert(pointsLogTable).values({
        userId: userTask.user.id,
        taskId: userTask.task.id,
        points: pointsAwarded,
        reason: `Admin approved: ${userTask.task.title}`,
      });
    });

    await ReferralService.awardReferralBonusIfEligible(userTask.user.id);

    return NextResponse.json({ message: "Claim approved and points awarded" });
  }

  if (action === "reject") {
    if (userTask.userTask.proofImageUrl) {
      await deleteCloudinaryImage(userTask.userTask.proofImageUrl);
    }

    await db
      .update(userTasksTable)
      .set({ status: "rejected" })
      .where(eq(userTasksTable.id, Number(id)));

    return NextResponse.json({ message: "Claim rejected" });
  }

  return NextResponse.json({ error: "Invalid action. Use 'approve' or 'reject'." }, { status: 400 });
}
