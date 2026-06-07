import { NextRequest } from "next/server";
import { requireUser } from "@/src/services/auth.service";
import { TaskService } from "@/src/services/task.service";
import { toNextResponse } from "@/src/lib/api-response";

export async function GET(req: NextRequest) {
  const auth = await requireUser();
  if (!auth.success) return toNextResponse(auth);

  const { searchParams } = new URL(req.url);
  const taskType = searchParams.get("taskType") || undefined;
  const cursor = searchParams.get("cursor") || undefined;
  const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "10", 10) || 10, 1), 50);

  const result = await TaskService.getDashboardTasks(auth.data.id, taskType, cursor, limit);
  return toNextResponse(result);
}
