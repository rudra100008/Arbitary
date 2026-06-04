import { NextRequest, NextResponse } from "next/server";
import { Platform, SocialPost } from "@/src/lib/social/type";

interface GraphAPIError {
  message: string;
  type: string;
  code: number;
  error_subcode?: number;
  fbtrace_id: string;
}

interface CustomError extends Error {
  statusCode?: number;
  facebookError?: GraphAPIError;
}

interface FacebookPostItem {
  id: string;
  message?: string;
  full_picture?: string;
  permalink_url?: string;
  likes?: { summary?: { total_count?: number } };
  created_time: string;
}

interface FacebookPostsResponse {
  data?: FacebookPostItem[];
  error?: GraphAPIError;
}

interface InstagramMediaItem {
  id: string;
  caption?: string;
  media_type: string;
  media_url?: string;
  thumbnail_url?: string;
  permalink: string;
  like_count: number;
  timestamp: string;
}

interface YoutubePlaylistItem {
  id: { videoId: string };
  snippet: {
    title: string;
    thumbnails?: { medium?: { url: string } };
    publishedAt: string;
  };
}

async function fetchFacebookPosts(): Promise<SocialPost[]> {
  const pageId = process.env.FACEBOOK_PAGE_ID;
  const token = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
  if (!pageId || !token) {
    const err = new Error("Facebook environment variables are not configured") as CustomError;
    err.statusCode = 500;
    throw err;
  }

  const url = new URL("https://graph.facebook.com/v19.0/me/posts");
  url.searchParams.set("access_token", token);
  url.searchParams.set("fields", "id,message,created_time,full_picture,permalink_url");
  url.searchParams.set("limit", "10");

  let res: Response;
  try {
    res = await fetch(url.toString());
  } catch (netErr: unknown) {
    const netMessage = netErr instanceof Error ? netErr.message : String(netErr);
    const err = new Error(`Failed to connect to Facebook Graph API: ${netMessage}`) as CustomError;
    err.statusCode = 502;
    throw err;
  }

  let data: FacebookPostsResponse;
  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    try {
      data = (await res.json()) as FacebookPostsResponse;
    } catch (jsonErr: unknown) {
      const jsonMessage = jsonErr instanceof Error ? jsonErr.message : String(jsonErr);
      const err = new Error(`Failed to parse JSON response from Facebook. Status: ${res.status}. Error: ${jsonMessage}`) as CustomError;
      err.statusCode = 502;
      throw err;
    }
  } else {
    const bodyText = await res.text().catch(() => "");
    const err = new Error(`Facebook API returned non-JSON response. Status: ${res.status}. Body: ${bodyText.slice(0, 200)}`) as CustomError;
    err.statusCode = 502;
    throw err;
  }

  if (data?.error) {
    const err = new Error(data.error.message || "Facebook Graph API error") as CustomError;
    err.facebookError = data.error;
    err.statusCode = res.status || 500;
    throw err;
  }

  if (!data || !Array.isArray(data.data)) {
    const err = new Error("Invalid response format received from Facebook Graph API") as CustomError;
    err.statusCode = 502;
    throw err;
  }

  return data.data.map((p: FacebookPostItem) => ({
    id: p.id,
    platform: "facebook" as Platform,
    title: p.message?.slice(0, 80) || "Facebook Post",
    thumbnailUrl: p.full_picture,
    url: p.permalink_url || `https://facebook.com/${p.id}`,
    likeCount: p.likes?.summary?.total_count,
    publishedAt: p.created_time,
  }));
}

async function fetchInstagramPosts(): Promise<SocialPost[]> {
  const igUserId = process.env.INSTAGRAM_USER_ID;
  const token = process.env.INSTAGRAM_ACCESS_TOKEN;
  if (!igUserId || !token) throw new Error("Instagram env vars missing");

  const url = new URL(`https://graph.facebook.com/v19.0/${igUserId}/media`);
  url.searchParams.set("access_token", token);
  url.searchParams.set("fields", "id,caption,media_type,media_url,thumbnail_url,permalink,like_count,timestamp");
  url.searchParams.set("limit", "10");

  const res = await fetch(url.toString());
  const data = (await res.json()) as { data?: InstagramMediaItem[]; error?: { message: string } };
  if (data.error) throw new Error(data.error.message);

  return (data.data || []).map((p: InstagramMediaItem) => ({
    id: p.id,
    platform: "instagram" as Platform,
    title: p.caption?.slice(0, 80) || "Instagram Post",
    thumbnailUrl: p.thumbnail_url || p.media_url,
    url: p.permalink,
    likeCount: p.like_count,
    publishedAt: p.timestamp,
  }));
}

async function fetchYoutubePosts(): Promise<SocialPost[]> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  const channelId = process.env.YOUTUBE_CHANNEL_ID;
  if (!apiKey || !channelId) throw new Error("YouTube env vars missing");

  const url = new URL("https://www.googleapis.com/youtube/v3/search");
  url.searchParams.set("key", apiKey);
  url.searchParams.set("channelId", channelId);
  url.searchParams.set("part", "snippet");
  url.searchParams.set("order", "date");
  url.searchParams.set("maxResults", "10");
  url.searchParams.set("type", "video");

  const res = await fetch(url.toString());
  const data = (await res.json()) as { items?: YoutubePlaylistItem[]; error?: { message: string } };
  if (data.error) throw new Error(data.error.message);

  return (data.items || []).map((item: YoutubePlaylistItem) => ({
    id: item.id.videoId,
    platform: "youtube" as Platform,
    title: item.snippet.title,
    thumbnailUrl: item.snippet.thumbnails?.medium?.url,
    url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
    publishedAt: item.snippet.publishedAt,
  }));
}

async function fetchTiktokPosts(): Promise<SocialPost[]> {
  const token = process.env.TIKTOK_ACCESS_TOKEN;
  if (!token) throw new Error("TikTok env vars missing");
  return [];
}

const FETCHERS: Record<string, () => Promise<SocialPost[]>> = {
  facebook: fetchFacebookPosts,
  instagram: fetchInstagramPosts,
  youtube: fetchYoutubePosts,
  tiktok: fetchTiktokPosts,
};

export async function GET(req: NextRequest) {
  const { requireAdmin } = await import("@/src/services/auth.service");
  const auth = await requireAdmin();
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  const platform = req.nextUrl.searchParams.get("platform");
  if (!platform || !FETCHERS[platform]) {
    return NextResponse.json({ error: "Invalid platform" }, { status: 400 });
  }

  try {
    const posts = await FETCHERS[platform]();
    return NextResponse.json({ posts });
  } catch (err: unknown) {
    const customErr = err as CustomError;
    const statusCode = customErr.statusCode || 500;
    const message = customErr.message || "An unexpected error occurred";

    console.error(`[Social Posts API] Error fetching posts for platform '${platform}':`, {
      message,
      statusCode,
      facebookError: customErr.facebookError || null,
      stack: customErr.stack,
    });

    return NextResponse.json(
      {
        error: message,
        platform,
        ...(customErr.facebookError && {
          facebookError: {
            message: customErr.facebookError.message,
            code: customErr.facebookError.code,
            error_subcode: customErr.facebookError.error_subcode,
            type: customErr.facebookError.type,
          },
        }),
      },
      { status: statusCode },
    );
  }
}
