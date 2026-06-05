import { NextRequest, NextResponse } from "next/server";
import { UserService } from "@/src/services/user.service";
import { rateLimit, getClientIp } from "@/src/lib/rate-limit";
import { z } from "zod";

const signupSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email format"),
  password: z.string().min(8, "Password must be at least 8 characters").max(100, "Password too long"),
  referralCode: z.string().max(20).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp({ headers: req.headers });
    const rl = await rateLimit(`signup:ip:${ip}`, 5, 60 * 60_000);
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

    const result = await UserService.signup(parsed.data);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: (result as any).status ?? 400 });
    }

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error("Sign up error:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
