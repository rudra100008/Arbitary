import { getServerSession } from "next-auth";
import { authOptions } from "@/src/auth";
import { ServiceResult, ok, fail } from "./result";

function getVerificationCode(userId: number, taskId: number): string {
  const crypto = require("crypto");
  const hash = crypto
    .createHash("sha256")
    .update(`youtube:${userId}:${taskId}:${process.env.NEXTAUTH_SECRET}`)
    .digest("hex")
    .slice(0, 8);
  return `#v${hash}`;
}

export const YouTubeService = {
  async getAccessToken(): Promise<ServiceResult<string>> {
    const session = await getServerSession(authOptions);
    const s = session as any;
    const token = s?.googleAccessToken;
    if (!token) return fail("YouTube not linked. Sign in with Google.", 401);

    const expiry = s?.googleTokenExpiry;
    if (expiry && Date.now() > expiry * 1000) {
      return fail("Google session expired. Sign out and sign back in with Google.", 401);
    }

    return ok(token);
  },

  async verifySubscription(
    channelId: string,
    accessToken: string,
  ): Promise<{ verified: boolean; needsScreenshot: boolean }> {
    try {
      const res = await fetch(
        `https://www.googleapis.com/youtube/v3/subscriptions?part=snippet&forChannelId=${channelId}&mine=true`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );
      if (res.status === 403) return { verified: false, needsScreenshot: true };
      if (!res.ok) return { verified: false, needsScreenshot: false };
      const data = await res.json();
      if (data.items?.length > 0) return { verified: true, needsScreenshot: false };
      return { verified: false, needsScreenshot: true };
    } catch {
      return { verified: false, needsScreenshot: false };
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
      if (!res.ok) return false;
      const data = await res.json();
      return data.items?.[0]?.rating === "like";
    } catch {
      return false;
    }
  },

  async resolveChannelHandle(
    handle: string,
    accessToken: string,
  ): Promise<string | null> {
    try {
      const res = await fetch(
        `https://www.googleapis.com/youtube/v3/channels?part=id&forHandle=${handle}`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );
      if (!res.ok) return null;
      const data = await res.json();
      return data.items?.[0]?.id || null;
    } catch {
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
      if (!meRes.ok) return false;
      const meData = await meRes.json();
      const myChannelId = meData.items?.[0]?.id;
      if (!myChannelId) return false;

      const commentsRes = await fetch(
        `https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId=${videoId}&maxResults=100`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );
      if (!commentsRes.ok) return false;
      const commentsData = await commentsRes.json();

      return commentsData.items?.some(
        (item: any) =>
          item.snippet?.topLevelComment?.snippet?.authorChannelId?.value === myChannelId,
      ) ?? false;
    } catch {
      return false;
    }
  },

  getVerificationCode,
};
