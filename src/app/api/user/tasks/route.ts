import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/src/services/auth.service";
import { TaskService } from "@/src/services/task.service";
import { pickUpTaskSchema, updateTaskSchema, cancelTaskSchema } from "@/src/lib/validations/task";

function toNextResponse<T>(result: import("@/src/services/result").ServiceResult<T>): NextResponse {
  if (result.success) {
    return NextResponse.json(result.data, { status: 200 });
  }
  return NextResponse.json(
    { error: result.error, details: (result as any).details },
    { status: (result as any).status ?? 400 },
  );
}

export async function GET() {
  const auth = await requireUser();
  if (!auth.success) return toNextResponse(auth);
  const result = await TaskService.getUserTasks(auth.data.id);
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

  const { taskId, status, proofUrl, proofImageUrl } = parsed.data;
  const result = await TaskService.updateTaskStatus(
    auth.data.id,
    taskId,
    status,
    proofUrl,
    proofImageUrl,
  );
  return toNextResponse(result);
}
