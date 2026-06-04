import { NextRequest, NextResponse } from "next/server";
import { TaskService } from "@/src/services/task.service";

export async function POST(req: NextRequest) {
  try {
    const { shareCode, fingerprint, userAgent } = await req.json();
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "unknown";

    const result = await TaskService.handleShareClick(shareCode, fingerprint, ip, userAgent);
    if (!result.success) {
      return NextResponse.json({ allowed: false, redirectUrl: "/" });
    }

    return NextResponse.json(result.data);
  } catch (error) {
    console.error("Share click error:", error);
    return NextResponse.json({ allowed: false, redirectUrl: "/" });
  }
}
