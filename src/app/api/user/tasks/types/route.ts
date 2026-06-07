import { NextResponse } from "next/server";
import { requireUser } from "@/src/services/auth.service";
import { db } from "@/src/db";
import { tasksTable } from "@/src/db/schema";
import { sql } from "drizzle-orm";

export async function GET() {
  const auth = await requireUser();
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  try {
    const rawTypes = await db
      .selectDistinct({ taskType: tasksTable.taskType })
      .from(tasksTable)
      .where(sql`${tasksTable.taskType} IS NOT NULL`);

    const taskTypes = rawTypes
      .map((row) => row.taskType)
      .filter(Boolean) as string[];

    return NextResponse.json({ success: true, taskTypes }, { status: 200 });
  } catch (error) {
    console.error("Failed to fetch task types:", error);
    return NextResponse.json(
      { error: "Failed to fetch task types" },
      { status: 500 },
    );
  }
}
