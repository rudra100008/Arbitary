import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/src/services/auth.service";
import { TaskService } from "@/src/services/task.service";
import { adminTaskSchema } from "@/src/lib/validations/task";

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  const parsed = adminTaskSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const result = await TaskService.createTask(parsed.data);
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json(
    { message: "Task created successfully", task: result.data },
    { status: 201 },
  );
}

export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const page = Math.max(parseInt(searchParams.get("page") || "1", 10) || 1, 1);
  const limit = Math.min(
    Math.max(parseInt(searchParams.get("limit") || "10", 10) || 10, 1),
    100,
  );
  const taskType = searchParams.get("taskType");

  const result = await TaskService.getAllTasks(page, limit);
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  const tasks = taskType
    ? result.data.tasks.filter((t) => t.taskType === taskType)
    : result.data.tasks;

  return NextResponse.json(
    {
      tasks,
      totalCount: result.data.totalCount,
      totalPages: result.data.totalPages,
      currentPage: result.data.currentPage,
    },
    { status: 200 },
  );
}
