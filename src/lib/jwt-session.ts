import { encode, decode } from "next-auth/jwt";
import { cookies } from "next/headers";

/**
 * Merges `updates` into the active NextAuth JWT session cookie.
 * Used to propagate server-side token changes (e.g. refreshed Google access
 * token) back to the client without requiring a full re-login.
 *
 * Shared by youtube.service.ts and any other server-side code that needs to
 * patch the session cookie in-place.
 */
export async function updateJwtToken(
  updates: Record<string, unknown>,
): Promise<void> {
  try {
    const cookieStore = await cookies();
    const secret = process.env.NEXTAUTH_SECRET!;
    const nextAuthUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const secure = nextAuthUrl.startsWith("https://");
    const cookieName = secure
      ? "__Secure-next-auth.session-token"
      : "next-auth.session-token";
    const maxAge = 30 * 24 * 60 * 60;

    const currentCookie = cookieStore.get(cookieName)?.value;
    if (!currentCookie) return;

    const current = await decode({ token: currentCookie, secret });
    if (!current) return;

    const updated = { ...current, ...updates };
    const newToken = await encode({ token: updated, secret, maxAge });

    cookieStore.set(cookieName, newToken, {
      httpOnly: true,
      secure,
      sameSite: "lax",
      maxAge,
      path: "/",
    });
  } catch (e) {
    console.error("JWT update failed:", e);
  }
}
