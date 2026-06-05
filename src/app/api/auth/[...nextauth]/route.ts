import NextAuth from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/src/auth";
import { getClientIp, rateLimit } from "@/src/lib/rate-limit";

const handler = NextAuth(authOptions);

async function POST(
  req: NextRequest,
  context: { params: { nextauth: string[] } },
) {
  if (req.nextUrl.pathname === "/api/auth/callback/credentials") {
    const cloned = req.clone();
    const formData = await cloned.formData();
    const email = (formData.get("email") as string) || "";
    const ip = getClientIp({ headers: req.headers });

    const [byEmail, byIp] = await Promise.all([
      rateLimit(`login:email:${email}`, 10, 15 * 60_000),
      rateLimit(`login:ip:${ip}`, 30, 15 * 60_000),
    ]);

    if (!byEmail.allowed || !byIp.allowed) {
      const retry = Math.max(byEmail.retryAfterSeconds, byIp.retryAfterSeconds);
      const errorUrl = new URL("/api/auth/callback/credentials", req.nextUrl.origin);
      errorUrl.searchParams.set("error", `RATE_LIMITED:${retry}`);
      return NextResponse.json({ url: errorUrl.toString() }, { status: 429 });
    }
  }

  return handler(req, context);
}

export { handler as GET };
export { POST };
