import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/src/services/auth.service";
import { UserService } from "@/src/services/user.service";
import { FeatureFlagService } from "@/src/services/feature-flag.service";
import { z } from "zod";

const profileUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  phone: z.string().max(20).regex(/^[+\d\s()-]*$/, "Invalid phone format").optional(),
  bio: z.string().max(500).optional(),
  location: z.string().max(100).optional(),
  instagramUsername: z.string().max(50).transform(val => val.replace(/^@/, '').trim().toLowerCase()).optional(),
}).strict();

export async function GET() {
  const auth = await requireUser();
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  const result = await UserService.getProfile(auth.data.id);
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 404 });
  }

  return NextResponse.json(result.data);
}

export async function PATCH(req: NextRequest) {
  const auth = await requireUser();
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  const body = await req.json();
  const parsed = profileUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  if (parsed.data.instagramUsername !== undefined) {
    const instagramEnabled = await FeatureFlagService.isPlatformEnabled("instagram");
    if (!instagramEnabled) {
      return NextResponse.json(
        { error: "Instagram linking is temporarily unavailable.", code: "FEATURE_DISABLED" },
        { status: 403 },
      );
    }
  }

  const result = await UserService.updateProfile(auth.data.id, parsed.data);
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json(result.data);
}
