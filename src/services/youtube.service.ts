import { getServerSession } from "next-auth";
import { eq } from "drizzle-orm";
import { authOptions } from "@/src/auth";
import { db } from "@/src/db";
import { usersTable } from "@/src/db/schema";
import { encryptToken, decryptToken } from "@/src/lib/token-crypto";
import { updateJwtToken } from "@/src/lib/jwt-session";
import { ServiceResult, ok, fail } from "./result";


export const YouTubeService = {
  async getAccessToken(): Promise<ServiceResult<string>> {
    const session = await getServerSession(authOptions);
    const s = session as typeof session & { googleAccessToken?: string, googleTokenExpiry?: number, googleRefreshToken?: string };
    const token = s?.googleAccessToken;
    if (!token) return fail("YouTube not linked. Sign in with Google.", 401);

    const expiry = s?.googleTokenExpiry;
    if (expiry && Date.now() > expiry * 1000) {
      return fail("Google session expired. Sign out and sign back in with Google.", 401);
    }

    return ok(token);
  },

  async getAuthorizedClient(userId: number): Promise<ServiceResult<string>> {
    const session = await getServerSession(authOptions);
    const s = session as typeof session & { googleAccessToken?: string, googleTokenExpiry?: number, googleRefreshToken?: string };
    let token: string | undefined = s?.googleAccessToken;
    let expiry: number | undefined = s?.googleTokenExpiry;
    let refreshToken: string | undefined = s?.googleRefreshToken;

    // Fall back to DB-stored encrypted refresh token if missing from session
    if (!refreshToken && userId) {
      try {
        const dbUser = await db.select({
          googleRefreshToken: usersTable.googleRefreshToken,
        }).from(usersTable).where(eq(usersTable.id, userId)).limit(1);

        if (dbUser[0]?.googleRefreshToken) {
          const decrypted = decryptToken(dbUser[0].googleRefreshToken);
          if (decrypted) {
            refreshToken = decrypted;
            expiry = 0;
            updateJwtToken({ googleRefreshToken: decrypted, googleTokenExpiry: 0 });
          }
        }
      } catch (e) {
        console.error(`[youtube] getAuthorizedClient: DB fallback failed (userId=${userId}):`, e);
      }
    }

    if (!token) console.error(`[youtube] getAuthorizedClient: no googleAccessToken in session (userId=${userId})`);

    const needsRefresh = !token || (expiry && Date.now() > expiry * 1000);
    if (needsRefresh && refreshToken) {
      console.log(`[youtube] getAuthorizedClient: refreshing token (token=${!!token}, expiry=${expiry}, now=${Math.floor(Date.now()/1000)})`);
      try {
        const res = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: process.env.GOOGLE_CLIENT_ID!,
            client_secret: process.env.GOOGLE_CLIENT_SECRET!,
            grant_type: 'refresh_token',
            refresh_token: refreshToken,
            scope: 'openid email profile https://www.googleapis.com/auth/youtube.force-ssl',
          }),
        });
        const data = await res.json();
        if (data.access_token) {
          token = data.access_token;
          console.log(`[youtube] getAuthorizedClient: refresh succeeded, scopes: ${data.scope}`);
          await updateJwtToken({
            googleAccessToken: data.access_token,
            googleTokenExpiry: Math.floor(Date.now() / 1000) + (data.expires_in || 3600),
          });
          if (data.refresh_token) {
            const encrypted = encryptToken(data.refresh_token);
            db.update(usersTable)
              .set({ googleRefreshToken: encrypted })
              .where(eq(usersTable.id, userId))
              .catch(err => console.error("Failed to persist rotated refresh token:", err));
            await updateJwtToken({ googleRefreshToken: data.refresh_token });
          }
        } else {
          console.error(`[youtube] getAuthorizedClient: refresh returned no access_token:`, data);
          return fail("Your Google connection expired. Please reconnect your account in settings.", 401);
        }
      } catch {
        return fail("Failed to refresh Google token. Sign out and sign back in.", 401);
      }
    }

    if (!token) return fail("YouTube not linked. Sign in with Google.", 401);
    return ok(token);
  },

  async verifySubscription(
    channelId: string,
    accessToken: string,
  ): Promise<{ verified: boolean; needsScreenshot?: boolean; privacyBlocked?: boolean }> {
    try {
      const res = await fetch(
        `https://www.googleapis.com/youtube/v3/subscriptions?part=snippet&forChannelId=${channelId}&mine=true`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );
      if (!res.ok) {
        console.error(`[youtube] verifySubscription failed: ${res.status}`, await res.text().catch(() => ""));
        if (res.status === 403) return { verified: false, privacyBlocked: true };
        return { verified: false, needsScreenshot: true };
      }
      const data = await res.json();
      if (data.items?.length > 0) return { verified: true };
      return { verified: false };
    } catch (e) {
      console.error("[youtube] verifySubscription exception:", e);
      return { verified: false, needsScreenshot: true };
    }
  },

  async verifyLike(
    videoId: string,
    accessToken: string,
  ): Promise<boolean> {
    try {
      const res = await fetch(
        `https://www.googleapis.com/youtube/v3/videos/getRating?id=${videoId}`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );
      if (!res.ok) {
        console.error(`[youtube] verifyLike failed: ${res.status}`, await res.text().catch(() => ""));
        return false;
      }
      const data = await res.json();
      return data.items?.[0]?.rating === "like";
    } catch (e) {
      console.error("[youtube] verifyLike exception:", e);
      return false;
    }
  },

  async resolveChannelHandle(
    handle: string,
    accessToken: string,
  ): Promise<string | null> {
    try {
      const cleanHandle = handle.startsWith("@") ? handle.slice(1) : handle;
      const res = await fetch(
        `https://www.googleapis.com/youtube/v3/channels?part=id&forHandle=${cleanHandle}`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );
      if (!res.ok) {
        console.error(`[youtube] resolveChannelHandle failed: ${res.status}`, await res.text().catch(() => ""));
        return null;
      }
      const data = await res.json();
      return data.items?.[0]?.id || null;
    } catch (e) {
      console.error("[youtube] resolveChannelHandle exception:", e);
      return null;
    }
  },

  async verifyComment(
    videoId: string,
    _userId: number,
    _taskId: number,
    accessToken: string,
  ): Promise<boolean> {
    try {
      const meRes = await fetch(
        "https://www.googleapis.com/youtube/v3/channels?part=id&mine=true",
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );
      if (!meRes.ok) {
        console.error(`[youtube] verifyComment (channels/mine) failed: ${meRes.status}`, await meRes.text().catch(() => ""));
        return false;
      }
      const meData = await meRes.json();
      const myChannelId = meData.items?.[0]?.id;
      if (!myChannelId) {
        console.error("[youtube] verifyComment: no channel ID found for this user");
        return false;
      }

      const commentsRes = await fetch(
        `https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId=${videoId}&maxResults=100`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );
      if (!commentsRes.ok) {
        console.error(`[youtube] verifyComment (commentThreads) failed: ${commentsRes.status}`, await commentsRes.text().catch(() => ""));
        return false;
      }
      const commentsData = await commentsRes.json();

      return commentsData.items?.some(
        (item: { snippet?: { topLevelComment?: { snippet?: { authorChannelId?: { value?: string } } } } }) =>
          item.snippet?.topLevelComment?.snippet?.authorChannelId?.value === myChannelId,
      ) ?? false;
    } catch (e) {
      console.error("[youtube] verifyComment exception:", e);
      return false;
    }
  },

};

