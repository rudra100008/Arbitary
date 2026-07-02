import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { requireUser } from "@/src/services/auth.service";
import { db } from "@/src/db";
import { usersTable } from "@/src/db/schema";

const avatarSchema = z.object({
  source: z.enum(["google", "facebook"]),
});

export async function POST(req: NextRequest) {
  const auth = await requireUser();
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  const body = await req.json();
  const parsed = avatarSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid source. Must be 'google' or 'facebook'." },
      { status: 400 },
    );
  }

  const { source } = parsed.data;

  // Load the stored per-provider image URLs from DB — never trust a URL from the client
  const [dbUser] = await db
    .select({ googleImage: usersTable.googleImage, facebookImage: usersTable.facebookImage })
    .from(usersTable)
    .where(eq(usersTable.id, auth.data.id))
    .limit(1);

  if (!dbUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const resolvedUrl = source === "google" ? dbUser.googleImage : dbUser.facebookImage;

  if (!resolvedUrl) {
    return NextResponse.json(
      { error: `No ${source} profile image stored. Link your ${source} account first.` },
      { status: 400 },
    );
  }

  await db
    .update(usersTable)
    .set({ image: resolvedUrl })
    .where(eq(usersTable.id, auth.data.id));

  // The frontend calls onUpdateSession() (NextAuth update()) after this request,
  // which triggers trigger === "update" in the jwt callback and reloads image from DB.
  return NextResponse.json({ ok: true });
}
