import { NextResponse } from "next/server";
import { requireUser } from "@/src/services/auth.service";
import { TaskService } from "@/src/services/task.service";

export async function GET() {
  const auth = await requireUser();
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  const result = await TaskService.getCompletedTodayCount(auth.data.id);
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({ count: result.data.count }, { status: 200 });
}
