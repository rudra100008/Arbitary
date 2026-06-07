import { NextRequest } from "next/server";
import { requireUser } from "@/src/services/auth.service";
import { TaskService } from "@/src/services/task.service";
import { toNextResponse } from "@/src/lib/api-response";

export async function GET(req: NextRequest) {
  const auth = await requireUser();
  if (!auth.success) return toNextResponse(auth);

  const { searchParams } = new URL(req.url);
  const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "50", 10) || 50, 1), 100);

  const result = await TaskService.getCompletedTasks(auth.data.id, limit);
  return toNextResponse(result);
}
