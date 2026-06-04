// src/lib/social/types.ts
// Central types for all social media platforms — add new platforms here

export type Platform = "facebook" | "instagram" | "youtube" | "tiktok" | "daily-login";

export interface SocialPost {
    id: string;            // platform-specific post ID
    platform: Platform;
    title: string;         // normalized title / caption
    thumbnailUrl?: string; // preview image
    url: string;           // link to the post
    likeCount?: number;
    publishedAt: string;
}

export const PLATFORM_LABELS: Record<Platform, string> = {
    facebook: "Facebook",
    instagram: "Instagram",
    youtube: "YouTube",
    tiktok: "TikTok",
    "daily-login": "Daily Login",
};

export const PLATFORM_COLORS: Record<Platform, { bg: string; text: string; border: string }> = {
    facebook: { bg: "#1877F2", text: "#fff", border: "#1877F2" },
    instagram: { bg: "#E1306C", text: "#fff", border: "#E1306C" },
    youtube: { bg: "#FF0000", text: "#fff", border: "#FF0000" },
    tiktok: { bg: "#010101", text: "#fff", border: "#010101" },
    "daily-login": { bg: "#10B981", text: "#fff", border: "#10B981" },
};