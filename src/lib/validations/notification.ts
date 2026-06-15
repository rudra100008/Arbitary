import z from "zod";
import { REJECTION_REASON_PRESETS, type RejectionReasonPreset } from "@/src/lib/constants/rejection-reasons";

/**
 * Predefined rejection reasons shown to the admin as quick-select options.
 * Admins can still type a fully custom reason instead.
 */
export const RejectionReasonPresets = REJECTION_REASON_PRESETS;
export type { RejectionReasonPreset };

/**
 * Notification types. Reusable across rejection/approval and future events
 * (points awarded, new tasks, tier upgrades, announcements, ...).
 */
export const NotificationTypeEnum = z.enum([
    "submission_rejected",
    "submission_approved",
    "points_awarded",
    "task_assigned",
    "tier_upgrade",
    "event_announcement",
]);

export type NotificationType = z.infer<typeof NotificationTypeEnum>;

export const listNotificationsQuerySchema = z.object({
    limit: z.coerce.number().int().min(1).max(50).optional(),
    unreadOnly: z
        .union([z.literal("true"), z.literal("false")])
        .optional()
        .transform((v) => v === "true"),
});

export const markNotificationsReadSchema = z
    .object({
        notificationIds: z.array(z.number().int().positive()).optional(),
        markAll: z.boolean().optional(),
    })
    .strict()
    .refine(
        (data) =>
            data.markAll === true ||
            (Array.isArray(data.notificationIds) && data.notificationIds.length > 0),
        {
            message: "Provide notificationIds or set markAll to true",
            path: ["notificationIds"],
        },
    );

export const deleteNotificationsSchema = z
    .object({
        notificationIds: z.array(z.number().int().positive()).optional(),
        deleteAll: z.boolean().optional(),
    })
    .strict()
    .refine(
        (data) =>
            data.deleteAll === true ||
            (Array.isArray(data.notificationIds) && data.notificationIds.length > 0),
        {
            message: "Provide notificationIds or set deleteAll to true",
            path: ["notificationIds"],
        },
    );