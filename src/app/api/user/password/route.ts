import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/src/services/auth.service";
import { db } from "@/src/db";
import { usersTable } from "@/src/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { rateLimit } from "@/src/lib/rate-limit";

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "New password must be at least 8 characters").max(100),
});

export async function PATCH(req: NextRequest) {
  const auth = await requireUser();
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  const rl = await rateLimit(`change-password:user:${auth.data.id}`, 5, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: `Too many attempts. Try again in ${rl.retryAfterSeconds}s.` },
      { status: 429 },
    );
  }

  let body: z.infer<typeof changePasswordSchema>;
  try {
    body = changePasswordSchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const [user] = await db
    .select({ password: usersTable.password })
    .from(usersTable)
    .where(eq(usersTable.id, auth.data.id));

  if (!user || !user.password) {
    return NextResponse.json(
      { error: "No password set — you signed up via Google/Facebook" },
      { status: 400 },
    );
  }

  const isValid = await bcrypt.compare(body.currentPassword, user.password);
  if (!isValid) {
    return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
  }

  if (body.currentPassword === body.newPassword) {
    return NextResponse.json(
      { error: "New password must be different from current password" },
      { status: 400 },
    );
  }

  const hash = await bcrypt.hash(body.newPassword, 12);

  await db
    .update(usersTable)
    .set({ password: hash })
    .where(eq(usersTable.id, auth.data.id));

  return NextResponse.json({ success: true });
}
