import { NextRequest } from "next/server";
import { TaskService } from "@/src/services/task.service";

export async function POST(req: NextRequest) {
  try {
    const { shareCode, fingerprint } = await req.json();

    if (!shareCode || !fingerprint) {
      return Response.json({ ok: false });
    }

    const result = await TaskService.setOwnerFingerprint(shareCode, fingerprint);
    return Response.json({ ok: result.success });
  } catch {
    return Response.json({ ok: false });
  }
}
