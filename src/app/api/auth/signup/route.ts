import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { db } from "@/src/db";
import { usersTable } from "@/src/db/schema";
import { eq } from "drizzle-orm";
import { UserService } from "@/src/services/user.service";
import { rateLimit, getClientIp } from "@/src/lib/rate-limit";
import { sendEmail } from "@/src/lib/email";
import { verifyEmailHtml } from "@/src/lib/emails/verify-email";
import { z } from "zod";
import { isDisposableDomain } from "fakeout";

const signupSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email format"),
  password: z.string().min(8, "Password must be at least 8 characters").max(100, "Password too long"),
  dateOfBirth: z
    .string()
    .refine((val) => !Number.isNaN(new Date(val).getTime()), "Enter a valid date of birth")
    .refine((val) => new Date(val).getTime() <= Date.now(), "Date of birth can't be in the future"),
  referralCode: z.string().max(20).optional(),
  fingerprint: z.string().max(255).optional(),
  turnstileToken: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp({ headers: req.headers });
    const rl = await rateLimit(`signup:ip:${ip}`, 20, 60 * 60_000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many signups from this network. Try again later." },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } },
      );
    }

    const body = await req.json();
    const parsed = signupSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const emailDomain = parsed.data.email.split("@")[1]?.toLowerCase();
    if (emailDomain && isDisposableDomain(emailDomain)) {
      return NextResponse.json(
        { error: "Disposable email addresses are not allowed" },
        { status: 400 },
      );
    }

    // Turnstile verification
    const turnstileSecret = process.env.TURNSTILE_SECRET_KEY;
    if (turnstileSecret && parsed.data.turnstileToken) {
      const verifyRes = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          secret: turnstileSecret,
          response: parsed.data.turnstileToken,
          remoteip: ip,
        }),
      });
      const verifyData = await verifyRes.json();
      if (!verifyData.success) {
        return NextResponse.json({ error: "Bot verification failed. Please refresh and try again." }, { status: 400 });
      }
    }

    const rawToken = crypto.randomUUID();
    const bcryptHash = await bcrypt.hash(rawToken, 10);
    const lookupKey = crypto.createHash("sha256").update(rawToken).digest("hex").slice(0, 16);
    const tokenHash = `${lookupKey}:${bcryptHash}`;

    const result = await UserService.signup(parsed.data, {
      verificationToken: tokenHash,
      verificationTokenExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    const { userId } = result.data;

    // Soft-flag for duplicate fingerprint abuse
    if (parsed.data.fingerprint && userId) {
      const duplicates = await db
        .select({ id: usersTable.id })
        .from(usersTable)
        .where(eq(usersTable.signupFingerprint, parsed.data.fingerprint))
        .limit(2);
      if (duplicates.length > 1) {
        console.warn(`[Fingerprint] Duplicate signup fingerprint ${parsed.data.fingerprint} — flagging user ${userId}`);
        await db.update(usersTable).set({ isFlagged: true, signupFingerprintFlagged: true }).where(eq(usersTable.id, userId));
      }
    }

    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const verifyLink = `${baseUrl}/verify-email/${rawToken}`;

    await sendEmail({
      to: parsed.data.email,
      subject: "Verify your Arbitrary email",
      html: verifyEmailHtml(`${parsed.data.firstName} ${parsed.data.lastName}`, verifyLink),
    });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error("Sign up error:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
