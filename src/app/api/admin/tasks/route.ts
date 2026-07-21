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
    const flattened = parsed.error.flatten();
    const fieldErrors = flattened.fieldErrors;
    const formErrors = flattened.formErrors;
    const firstField = Object.keys(fieldErrors)[0];
    const firstMessage = firstField
      ? `${firstField}: ${(fieldErrors[firstField as keyof typeof fieldErrors] as string[])?.[0]}`
      : formErrors[0] || "Validation failed";

    return NextResponse.json(
      { error: firstMessage, details: fieldErrors },
      { status: 400 },
    );
  }

  const result = await TaskService.createTask(parsed.data);
  if (!result.success) {
    return NextResponse.json(
      { error: result.error, code: result.code },
      { status: result.status ?? 500 },
    );
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
  const platform = searchParams.get("platform");
  const search = searchParams.get("search")?.trim() ?? "";

  const result = await TaskService.getAdminTasks({ page, limit, search, taskType, platform });

  return NextResponse.json(result, { status: 200 });
}
