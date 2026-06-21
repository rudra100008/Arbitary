// lib/manage-task/types.ts
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
    watchDuration?: number;
    difficulty?: "easy" | "medium" | "hard";
    isFlash?: boolean;
    isShare?: boolean;
    shareThreshold?: number;
    expiresAt?: string;
    commentInstruction?: string;
    /** true = Daily Refresh (resets at midnight), false = Permanent */
    isRecurring?: boolean;
};

export type ModalMode = "add" | "edit";

export type TaskSource = "manual" | "share" | import("@/src/lib/social/type").Platform;

export const PLATFORMS: {
    value: import("@/src/lib/social/type").Platform;
    label: string;
    color: string;
    icon?: string;
}[] = [
        { value: "facebook", label: "Facebook", color: "#1877F2", icon: "📘" },
        { value: "instagram", label: "Instagram", color: "#E1306C", icon: "📷" },
        { value: "youtube", label: "YouTube", color: "#FF0000", icon: "▶️" },
    ];