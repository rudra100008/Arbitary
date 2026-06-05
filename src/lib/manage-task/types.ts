// lib/types.ts
// Re-exports social types and defines the Task type used across all components.

export type { Platform, SocialPost } from "@/src/lib/social/type";
export { PLATFORM_LABELS } from "@/src/lib/social/type";

export type Task = {
    id: string | number;
    title: string;
    description: string;
    taskType: string;
    created: string;
    completedUsers: number;
    rewardPoint?: number;
    videoUrl?: string;
    platform?: import("@/src/lib/social/type").Platform;
    socialPostId?: string;
    socialPostUrl?: string;
    socialPlatform?: string;
    targetUrl?: string;
    isActive?: boolean;
    watchDuration?: number | null;
    difficulty?: string;
    isFlash?: boolean;
    isShare?: boolean;
    shareThreshold?: number;
    expiresAt?: string | null;
};

export type ModalMode = "add" | "edit";

export type TaskSource = "manual" | import("@/src/lib/social/type").Platform;

export const PLATFORMS: {
    value: import("@/src/lib/social/type").Platform;
    label: string;
    icon: string;
    color: string;
}[] = [
        { value: "facebook", label: "Facebook", icon: "f", color: "#1877F2" },
        { value: "instagram", label: "Instagram", icon: "📷", color: "#E1306C" },
        { value: "youtube", label: "YouTube", icon: "▶", color: "#FF0000" },
        { value: "tiktok", label: "TikTok", icon: "♪", color: "#010101" },
        { value: "daily-login", label: "Daily Login", icon: "📅", color: "#10B981" },
    ];