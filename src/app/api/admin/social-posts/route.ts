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
  code?: string;
  facebookError?: GraphAPIError;
}

interface YoutubePlaylistItem {
  id: { videoId: string };
  snippet: {
    title: string;
    thumbnails?: { medium?: { url: string } };
    publishedAt: string;
  };
}

async function fetchFacebookPosts(adminUserId?: number): Promise<SocialPost[]> {
  const { getPagePosts } = await import("@/src/lib/facebook");

  let posts: Awaited<ReturnType<typeof getPagePosts>>;
  try {
    posts = await getPagePosts(adminUserId);
  } catch (libErr: unknown) {
    const message = libErr instanceof Error ? libErr.message : String(libErr);
    const err = new Error(message) as CustomError;
    if (message.includes("credentials are not configured")) {
      err.statusCode = 409;
      err.code = "NOT_CONNECTED";
    } else {
      err.statusCode = 500;
    }
    throw err;
  }

  return posts.map((p) => ({
    id: p.id,
    platform: "facebook" as Platform,
    title: p.message?.slice(0, 80) || "Facebook Post",
    thumbnailUrl: p.full_picture,
    url: p.permalink_url || `https://facebook.com/${p.id}`,
    likeCount: p.likes?.summary?.total_count,
    publishedAt: p.created_time,
  }));
}

async function fetchInstagramPosts(type?: string, adminUserId?: number): Promise<SocialPost[]> {
  const { InstagramService } = await import("@/src/lib/instagram");

  try {
    const media = await InstagramService.getInstagramMedia(adminUserId);

    let filteredMedia = media;
    if (type === 'reels') {
      filteredMedia = media.filter(m => m.media_type === 'VIDEO');
    } else if (type === 'posts') {
      filteredMedia = media.filter(m => m.media_type !== 'VIDEO');
    }

    return filteredMedia.map((p) => ({
      id: p.id,
      platform: "instagram" as Platform,
      title: p.caption?.slice(0, 80) || "Instagram Post",
      thumbnailUrl: p.media_type === 'VIDEO' ? p.thumbnail_url : p.media_url,
      url: p.permalink,
      likeCount: 0,
      publishedAt: "",
    }));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Instagram fetch failed";
    const customErr = new Error(message) as CustomError;
    if (message.includes("credentials missing")) {
      customErr.statusCode = 409;
      customErr.code = "NOT_CONNECTED";
    } else {
      customErr.statusCode = 502;
    }
    throw customErr;
  }
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

const FETCHERS: Record<string, (type?: string, adminUserId?: number) => Promise<SocialPost[]>> = {
  facebook: (_type, adminUserId) => fetchFacebookPosts(adminUserId),
  instagram: (type, adminUserId) => fetchInstagramPosts(type, adminUserId),
  youtube: () => fetchYoutubePosts(),
  tiktok: () => fetchTiktokPosts(),
};

export async function GET(req: NextRequest) {
  const { requireAdmin } = await import("@/src/services/auth.service");
  const auth = await requireAdmin();
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  const platform = req.nextUrl.searchParams.get("platform");
  const type = req.nextUrl.searchParams.get("type");
  if (!platform || !FETCHERS[platform]) {
    return NextResponse.json({ error: "Invalid platform" }, { status: 400 });
  }

  if (platform === "facebook" || platform === "instagram") {
    const { FeatureFlagService } = await import("@/src/services/feature-flag.service");
    const platformEnabled = await FeatureFlagService.isPlatformEnabled(platform);
    if (!platformEnabled) {
      return NextResponse.json(
        {
          error: `${platform === "facebook" ? "Facebook" : "Instagram"} is currently disabled — enable it in Settings to browse posts.`,
          code: "FEATURE_DISABLED",
        },
        { status: 403 },
      );
    }
  }

  try {
    const posts = await FETCHERS[platform](type ?? undefined, auth.data.id);
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
        code: customErr.code,
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
