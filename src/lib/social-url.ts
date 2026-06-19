import type { Platform } from "@/src/lib/social/type";

export interface ParsedSocialUrl {
  platform: Platform;
  normalizedUrl: string;
  /** Platform-native ID extracted where possible (YouTube video id, IG shortcode, FB video id) */
  id?: string;
}

const HOST_RULES: { platform: Platform; hosts: string[] }[] = [
  { platform: "youtube", hosts: ["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be"] },
  { platform: "instagram", hosts: ["instagram.com", "www.instagram.com"] },
  { platform: "facebook", hosts: ["facebook.com", "www.facebook.com", "m.facebook.com", "fb.watch"] },
];

const YT_ID_REGEX = /^[a-zA-Z0-9_-]{11}$/;
const IG_PATH_REGEX = /^\/(reel|p|tv)\/([a-zA-Z0-9_-]+)/;
const FB_WATCH_REGEX = /^\/watch\/?$/;
const FB_VIDEO_PATH_REGEX = /\/videos\/(\d+)/;
const FB_POST_PATH_REGEX = /\/posts\/([a-zA-Z0-9_-]+)/;
const FB_REEL_PATH_REGEX = /^\/reel\/(\d+)/;

function detectPlatform(host: string): Platform | null {
  const bare = host.toLowerCase();
  for (const rule of HOST_RULES) {
    if (rule.hosts.includes(bare)) {
      return rule.platform;
    }
  }
  return null;
}

function parseYouTube(url: URL): ParsedSocialUrl | null {
  let id: string | null = null;
  if (url.hostname.includes("youtu.be")) {
    id = url.pathname.slice(1).split("/")[0];
  } else if (url.pathname === "/watch") {
    id = url.searchParams.get("v");
  } else if (url.pathname.startsWith("/shorts/")) {
    id = url.pathname.split("/")[2];
  } else if (url.pathname.startsWith("/embed/")) {
    id = url.pathname.split("/")[2];
  }
  if (!id || !YT_ID_REGEX.test(id)) return null;
  return { platform: "youtube", normalizedUrl: `https://www.youtube.com/watch?v=${id}`, id };
}

function parseInstagram(url: URL): ParsedSocialUrl | null {
  const match = url.pathname.match(IG_PATH_REGEX);
  if (!match) return null;
  const [, kind, shortcode] = match;
  return {
    platform: "instagram",
    normalizedUrl: `https://www.instagram.com/${kind}/${shortcode}/`,
    id: shortcode,
  };
}

function parseFacebook(url: URL): ParsedSocialUrl | null {
  if (url.hostname.includes("fb.watch")) {
    const id = url.pathname.slice(1).split("/")[0];
    if (!id) return null;
    return { platform: "facebook", normalizedUrl: `https://fb.watch/${id}/`, id };
  }
  if (FB_WATCH_REGEX.test(url.pathname) && url.searchParams.get("v")) {
    const id = url.searchParams.get("v")!;
    return { platform: "facebook", normalizedUrl: `https://www.facebook.com/watch/?v=${id}`, id };
  }
  const videoMatch = url.pathname.match(FB_VIDEO_PATH_REGEX);
  if (videoMatch) {
    return { platform: "facebook", normalizedUrl: url.origin + url.pathname, id: videoMatch[1] };
  }
  const reelMatch = url.pathname.match(FB_REEL_PATH_REGEX);
  if (reelMatch) {
    return { platform: "facebook", normalizedUrl: url.origin + url.pathname, id: reelMatch[1] };
  }
  const postMatch = url.pathname.match(FB_POST_PATH_REGEX);
  if (postMatch) {
    return { platform: "facebook", normalizedUrl: url.origin + url.pathname, id: postMatch[1] };
  }
  return null;
}

/**
 * Parses + validates a participant-submitted URL.
 * Returns null if the URL is malformed or from an unsupported platform/path shape.
 *
 * IMPORTANT: this is the single source of truth for URL validation/platform
 * detection. It is imported by BOTH the client form (instant feedback) and
 * the API route (authoritative check) so behavior can never drift between
 * the two — never duplicate this logic elsewhere.
 */
export function parseSocialUrl(raw: string): ParsedSocialUrl | null {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;

  const platform = detectPlatform(url.hostname);
  if (!platform) return null;

  switch (platform) {
    case "youtube":
      return parseYouTube(url);
    case "instagram":
      return parseInstagram(url);
    case "facebook":
      return parseFacebook(url);
  }
}
