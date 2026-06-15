import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/src/services/auth.service";
import { TaskService } from "@/src/services/task.service";
import { rateLimit } from "@/src/lib/rate-limit";
import { pickUpTaskSchema, updateTaskSchema, cancelTaskSchema } from "@/src/lib/validations/task";
import { toNextResponse } from "@/src/lib/api-response";
import { failWithDetails } from "@/src/services/result";

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

  const rl = await rateLimit(`claim:user:${auth.data.id}`, 10, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: `Too many attempts. Try again in ${rl.retryAfterSeconds}s.` },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } },
    );
  }

  const parsed = pickUpTaskSchema.safeParse(await req.json());
  if (!parsed.success) {
    return toNextResponse(failWithDetails("Validation failed", parsed.error.flatten().fieldErrors));
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
    return toNextResponse(failWithDetails("Validation failed", parsed.error.flatten().fieldErrors));
  }

  const result = await TaskService.cancelTask(auth.data.id, parsed.data.taskId);
  return toNextResponse(result);
}

export async function PATCH(req: NextRequest) {
  const auth = await requireUser();
  if (!auth.success) return toNextResponse(auth);

  const rl = await rateLimit(`claim:user:${auth.data.id}`, 10, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: `Too many attempts. Try again in ${rl.retryAfterSeconds}s.` },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } },
    );
  }

  const parsed = updateTaskSchema.safeParse(await req.json());
  if (!parsed.success) {
    return toNextResponse(failWithDetails("Validation failed", parsed.error.flatten().fieldErrors));
  }

  const { taskId, status, proofUrl, proofImageUrl, proofPhash, proofExifFlags } = parsed.data;
  const result = await TaskService.updateTaskStatus(
    auth.data.id,
    taskId,
    status,
    proofUrl,
    proofImageUrl,
    proofPhash ?? undefined,
    proofExifFlags ?? undefined,
  );
  return toNextResponse(result);
}