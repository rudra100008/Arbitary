import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/src/services/auth.service";
import { TaskService } from "@/src/services/task.service";

export async function POST(req: NextRequest) {
  const auth = await requireUser();
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { taskId } = body as { taskId?: number };

  if (!taskId) {
    return NextResponse.json({ error: "Task ID is required" }, { status: 400 });
  }

  const result = await TaskService.completeFacebookTask(auth.data.id, Number(taskId), (auth.data as any).facebookId);
  if (!result.success) {
    const status = (result as any).status ?? 400;
    const response: Record<string, unknown> = { error: result.error };
    if (status === 429) {
      response.verificationCode = await TaskService.getVerificationCode(auth.data.id, Number(taskId));
    }
    return NextResponse.json(response, { status });
  }

  return NextResponse.json(result.data, { status: 200 });
}

export async function GET(req: NextRequest) {
  const auth = await requireUser();
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const taskId = searchParams.get("taskId");

  if (!taskId) {
    return NextResponse.json({ error: "taskId query param is required" }, { status: 400 });
  }

  const code = await TaskService.getVerificationCode(auth.data.id, Number(taskId));
  return NextResponse.json({ verificationCode: code });
}
