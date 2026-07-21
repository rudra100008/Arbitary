import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/src/services/auth.service";
import { db } from "@/src/db";
import { usersTable } from "@/src/db/schema";
import { eq } from "drizzle-orm";
import { encryptToken } from "@/src/lib/token-crypto";
import { cookies } from "next/headers";

const FACEBOOK_APP_ID = process.env.FACEBOOK_APP_ID;
const FACEBOOK_APP_SECRET = process.env.FACEBOOK_APP_SECRET;
const REDIRECT_URI = process.env.FACEBOOK_OAUTH_REDIRECT_URI;

interface FacebookTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface FacebookPage {
  id: string;
  name: string;
  access_token: string;
  instagram_business_account?: { id: string; name: string };
}

export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const cookieStore = await cookies();
  const savedState = cookieStore.get("fb_oauth_state")?.value;

  // Clear the state cookie immediately
  cookieStore.delete("fb_oauth_state");

  if (!code) {
    return NextResponse.redirect(
      new URL("/admin/dashboard/settings?error=no_code", req.url),
    );
  }

  if (!savedState || state !== savedState) {
    return NextResponse.redirect(
      new URL("/admin/dashboard/settings?error=csrf_failed", req.url),
    );
  }

  if (!FACEBOOK_APP_ID || !FACEBOOK_APP_SECRET || !REDIRECT_URI) {
    return NextResponse.redirect(
      new URL("/admin/dashboard/settings?error=server_config", req.url),
    );
  }

  try {
    // 1. Exchange code for short-lived user token
    const tokenRes = await fetch(
      `https://graph.facebook.com/v20.0/oauth/access_token?client_id=${FACEBOOK_APP_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&client_secret=${FACEBOOK_APP_SECRET}&code=${code}`,
    );
    if (!tokenRes.ok) {
      console.error("[FB Callback] Token exchange failed:", tokenRes.status);
      return NextResponse.redirect(
        new URL("/admin/dashboard/settings?error=token_exchange_failed", req.url),
      );
    }
    const tokenData: FacebookTokenResponse = await tokenRes.json();

    // 2. Exchange for long-lived user token
    const longTokenRes = await fetch(
      `https://graph.facebook.com/v20.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${FACEBOOK_APP_ID}&client_secret=${FACEBOOK_APP_SECRET}&fb_exchange_token=${tokenData.access_token}`,
    );
    if (!longTokenRes.ok) {
      console.error(
        "[FB Callback] Long-lived token exchange failed:",
        longTokenRes.status,
      );
      return NextResponse.redirect(
        new URL("/admin/dashboard/settings?error=long_token_failed", req.url),
      );
    }
    const longTokenData: FacebookTokenResponse = await longTokenRes.json();

    if (!longTokenData.access_token) {
      console.error("[FB Callback] Long-lived token response missing access_token:", longTokenData);
      return NextResponse.redirect(
        new URL("/admin/dashboard/settings?error=long_token_failed", req.url),
      );
    }

    // 3. Fetch pages the user manages
    const pagesRes = await fetch(
      `https://graph.facebook.com/v20.0/me/accounts?access_token=${longTokenData.access_token}&fields=id,name,access_token,instagram_business_account{id,name}`,
    );
    if (!pagesRes.ok) {
      console.error("[FB Callback] Pages fetch failed:", pagesRes.status);
      return NextResponse.redirect(
        new URL("/admin/dashboard/settings?error=pages_fetch_failed", req.url),
      );
    }
    const pagesData: { data: FacebookPage[] } = await pagesRes.json();
    const pages = pagesData.data || [];

    if (pages.length === 0) {
      return NextResponse.redirect(
        new URL("/admin/dashboard/settings?error=no_pages", req.url),
      );
    }

    // 4. Get data_access_expires from the token introspection
    let dataAccessExpiresAt: Date | null = null;
    try {
      const debugRes = await fetch(
        `https://graph.facebook.com/v20.0/debug_token?input_token=${longTokenData.access_token}&access_token=${FACEBOOK_APP_ID}|${FACEBOOK_APP_SECRET}`,
      );
      if (debugRes.ok) {
        const debugData: { data?: { data_access_expires_at?: number } } =
          await debugRes.json();
        if (debugData.data?.data_access_expires_at) {
          dataAccessExpiresAt = new Date(
            debugData.data.data_access_expires_at * 1000,
          );
        }
      }
    } catch {
      // Non-critical — continue without it
    }

    const expiresInSeconds =
      longTokenData.expires_in && longTokenData.expires_in > 0
        ? longTokenData.expires_in
        : 60 * 24 * 60 * 60;
    const userTokenExpiresAt = new Date(Date.now() + expiresInSeconds * 1000);

    if (pages.length === 1) {
      // Single page — save directly
      const page = pages[0];
      await db
        .update(usersTable)
        .set({
          fbUserAccessToken: encryptToken(longTokenData.access_token, 'facebook'),
          fbUserTokenExpiresAt: userTokenExpiresAt,
          fbPageId: page.id,
          fbPageName: page.name,
          fbPageAccessToken: encryptToken(page.access_token, 'facebook'),
          fbIgUserId: page.instagram_business_account?.id ?? null,
          fbIgUsername: page.instagram_business_account?.name ?? null,
          fbConnectedAt: new Date(),
          fbDataAccessExpiresAt: dataAccessExpiresAt,
        })
        .where(eq(usersTable.id, auth.data.id));

      return NextResponse.redirect(
        new URL("/admin/dashboard/settings?connected=1", req.url),
      );
    }

    // Multiple pages — stash the list in a short-lived signed cookie
    const pagesPayload = pages.map((p) => ({
      id: p.id,
      name: p.name,
      accessToken: p.access_token,
      igUserId: p.instagram_business_account?.id ?? null,
      igUsername: p.instagram_business_account?.name ?? null,
    }));

    cookieStore.set("fb_pages_stash", JSON.stringify(pagesPayload), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 600,
      path: "/",
    });

    // Also stash the user token info so select-page can use it
    cookieStore.set(
      "fb_user_token_stash",
      JSON.stringify({
        accessToken: longTokenData.access_token,
        expiresAt: userTokenExpiresAt.toISOString(),
        dataAccessExpiresAt: dataAccessExpiresAt?.toISOString() ?? null,
      }),
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 600,
        path: "/",
      },
    );

    return NextResponse.redirect(
      new URL("/admin/dashboard/settings/facebook-select-page", req.url),
    );
  } catch (err) {
    console.error("[FB Callback] Unexpected error:", err instanceof Error ? err.stack : err);
    return NextResponse.redirect(
      new URL("/admin/dashboard/settings?error=unexpected", req.url),
    );
  }
}
