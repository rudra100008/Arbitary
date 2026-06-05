import { NextRequest, NextResponse } from "next/server";
import { TaskService } from "@/src/services/task.service";

function isSafeRedirectUrl(url: string, origin: string): boolean {
  if (url.startsWith("/")) return true;
  try {
    const parsed = new URL(url);
    return parsed.origin === origin;
  } catch {
    return false;
  }
}

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

    const redirectUrl = isSafeRedirectUrl(result.data.redirectUrl, req.nextUrl.origin)
      ? result.data.redirectUrl
      : "/";

    return NextResponse.json({ ...result.data, redirectUrl });
  } catch (error) {
    console.error("Share click error:", error);
    return NextResponse.json({ allowed: false, redirectUrl: "/" });
  }
}
