import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/src/services/auth.service";
import { TaskService } from "@/src/services/task.service";
import { pickUpTaskSchema, updateTaskSchema, cancelTaskSchema } from "@/src/lib/validations/task";
import { toNextResponse } from "@/src/lib/api-response";

export async function GET(req: NextRequest) {
  const auth = await requireUser();
  if (!auth.success) return toNextResponse(auth);

  const { searchParams } = new URL(req.url);
  const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "10", 10) || 10, 1), 50);
  const cursorRaw = searchParams.get("cursor");
  const cursor: { createdAt: string; id: number } | null = cursorRaw
    ? (JSON.parse(cursorRaw) as { createdAt: string; id: number })
    : null;
  const filter = searchParams.get("filter") as 'available' | 'completed' | null;
  const taskType = searchParams.get("taskType") || undefined;

  const result = await TaskService.getUserTasks(auth.data.id, limit, cursor, filter ?? undefined, taskType);
  return toNextResponse(result);
}

export async function POST(req: NextRequest) {
  const auth = await requireUser();
  if (!auth.success) return toNextResponse(auth);

  const parsed = pickUpTaskSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const result = await TaskService.pickUpTask(auth.data.id, parsed.data.taskId);
  if (!result.success) return toNextResponse(result);
  return NextResponse.json(
    { message: result.data.message },
    { status: 201 },
  );
}

export async function DELETE(req: NextRequest) {
  const auth = await requireUser();
  if (!auth.success) return toNextResponse(auth);

  const parsed = cancelTaskSchema.safeParse(
    Object.fromEntries(new URL(req.url).searchParams),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const result = await TaskService.cancelTask(auth.data.id, parsed.data.taskId);
  return toNextResponse(result);
}

export async function PATCH(req: NextRequest) {
  const auth = await requireUser();
  if (!auth.success) return toNextResponse(auth);

  const parsed = updateTaskSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { taskId, status, proofUrl } = parsed.data;
  const result = await TaskService.updateTaskStatus(
    auth.data.id,
    taskId,
    status,
    proofUrl,
  );
  return toNextResponse(result);
}
