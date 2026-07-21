import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/src/services/auth.service";
import { db } from "@/src/db";
import { usersTable } from "@/src/db/schema";
import { eq } from "drizzle-orm";
import { encryptToken } from "@/src/lib/token-crypto";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body: { pageId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.pageId) {
    return NextResponse.json({ error: "pageId is required" }, { status: 400 });
  }

  const cookieStore = await cookies();
  const stashRaw = cookieStore.get("fb_pages_stash")?.value;
  const tokenStashRaw = cookieStore.get("fb_user_token_stash")?.value;

  // Clear stash cookies immediately
  cookieStore.delete("fb_pages_stash");
  cookieStore.delete("fb_user_token_stash");

  if (!stashRaw || !tokenStashRaw) {
    return NextResponse.json(
      { error: "Session expired. Please restart the Facebook connection flow." },
      { status: 400 },
    );
  }

  let pages: Array<{
    id: string;
    name: string;
    accessToken: string;
    igUserId: string | null;
    igUsername: string | null;
  }>;
  let userTokenStash: { accessToken: string; expiresAt: string; dataAccessExpiresAt: string | null };

  try {
    pages = JSON.parse(stashRaw);
    userTokenStash = JSON.parse(tokenStashRaw);
  } catch {
    return NextResponse.json(
      { error: "Corrupted session data. Please restart the flow." },
      { status: 400 },
    );
  }

  const selectedPage = pages.find((p) => p.id === body.pageId);
  if (!selectedPage) {
    return NextResponse.json(
      { error: "Selected page not found in the stashed list." },
      { status: 400 },
    );
  }

  await db
    .update(usersTable)
    .set({
      fbUserAccessToken: encryptToken(userTokenStash.accessToken, 'facebook'),
      fbUserTokenExpiresAt: new Date(userTokenStash.expiresAt),
      fbPageId: selectedPage.id,
      fbPageName: selectedPage.name,
      fbPageAccessToken: encryptToken(selectedPage.accessToken, 'facebook'),
      fbIgUserId: selectedPage.igUserId,
      fbIgUsername: selectedPage.igUsername,
      fbConnectedAt: new Date(),
      fbDataAccessExpiresAt: userTokenStash.dataAccessExpiresAt
        ? new Date(userTokenStash.dataAccessExpiresAt)
        : null,
    })
    .where(eq(usersTable.id, auth.data.id));

  return NextResponse.redirect(
    new URL("/admin/settings?connected=1", req.url),
  );
}
