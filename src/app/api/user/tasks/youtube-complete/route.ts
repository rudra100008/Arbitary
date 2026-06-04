import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/src/services/auth.service";
import { TaskService } from "@/src/services/task.service";
import { youtubeCompleteSchema } from "@/src/lib/validations/task";

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

  const { taskId, watchedSeconds, sessionId } = parsed.data;
  const result = await TaskService.completeYoutubeTask(auth.data.id, Number(taskId), watchedSeconds, sessionId);
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: (result as any).status ?? 400 });
  }

  return NextResponse.json(result.data, { status: 200 });
}
