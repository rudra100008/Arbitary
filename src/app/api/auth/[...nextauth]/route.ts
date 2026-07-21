import NextAuth from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/src/auth";
import { db } from "@/src/db";
import { usersTable } from "@/src/db/schema";
import { eq } from "drizzle-orm";
import { getClientIp, rateLimit } from "@/src/lib/rate-limit";

const handler = NextAuth(authOptions);

async function POST(
  req: NextRequest,
  context: { params: Promise<{ nextauth: string[] }> },
) {
  if (req.nextUrl.pathname === "/api/auth/callback/credentials") {
    try {
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
        return NextResponse.redirect(
          new URL(`/login?error=RATE_LIMITED:${retry}`, req.url),
        );
      }

      const [user] = await db
        .select({ isVerified: usersTable.isVerified })
        .from(usersTable)
        .where(eq(usersTable.email, email.toLowerCase()));

      if (user && !user.isVerified) {
        return NextResponse.redirect(
          new URL("/login?error=VERIFY_EMAIL", req.url),
        );
      }
    } catch (error) {
      console.error("Login pre-check failed, allowing NextAuth to proceed:", error);
    }

  }

  return handler(req, context);
}

export { handler as GET };
export { POST };
