import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/src/services/auth.service";
import { TaskService } from "@/src/services/task.service";
import { youtubeCompleteSchema } from "@/src/lib/validations/task";
import { toNextResponse } from "@/src/lib/api-response";

export async function POST(req: NextRequest) {
  const auth = await requireUser();
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  const parsed = youtubeCompleteSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { taskId, watchedSeconds, fingerprint } = parsed.data;
  const result = await TaskService.completeYoutubeTask(
    auth.data.id,
    Number(taskId),
    watchedSeconds,
    fingerprint,
  );
  if (!result.success) return toNextResponse(result);

  return NextResponse.json(result.data, { status: 200 });
}
