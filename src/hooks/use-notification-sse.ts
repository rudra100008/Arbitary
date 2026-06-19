"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
    NOTIFICATIONS_QUERY_KEY,
    type AppNotification,
    type NotificationsResponse,
} from "./use-notifications";

/**
 * Notification types that reflect a change to one of the user's task
 * submissions. When one of these arrives, the dashboard's task list and
 * points are stale and need to be refreshed immediately.
 */
const SUBMISSION_STATUS_NOTIFICATION_TYPES = new Set([
    "submission_rejected",
    "submission_approved",
]);

/**
 * Notification types that mean a participant submission status changed.
 * When one of these arrives the participants page should re-fetch its
 * status so the "View Status" panel updates without a manual refresh.
 */
const PARTICIPANT_STATUS_NOTIFICATION_TYPES = new Set([
    "participant_approved",
    "participant_rejected",
]);

/**
 * All notification types that should trigger the notification sound.
 * Only plays for SSE-delivered events — never for history loaded on init.
 */
const SOUND_NOTIFICATION_TYPES = new Set([
    "submission_rejected",
    "submission_approved",
    "participant_approved",
    "participant_rejected",
    "points_awarded",
    "task_assigned",
    "tier_upgrade",
    "event_announcement",
]);

/**
 * Subscribes to /api/notifications/subscribe (SSE) and:
 *  - prepends newly received notifications to the react-query cache,
 *  - shows a sonner toast,
 *  - plays a notification sound once (debounced for bursts),
 *  - for task submission changes: invalidates user-tasks + user-points,
 *  - for participant status changes: invalidates the participant-status
 *    query so the participants page re-fetches without a manual refresh.
 *
 * Mount this once per authenticated session (already done in main layout).
 */
export function useNotificationSSE({ enabled = true }: { enabled?: boolean } = {}) {
    const queryClient = useQueryClient();
    const esRef = useRef<EventSource | null>(null);

    // Audio refs — no state to avoid re-renders
    const audioRef = useRef<HTMLAudioElement | null>(null);
    // Debounce: multiple simultaneous notifications → one sound play
    const soundDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    function scheduleSound() {
        if (soundDebounceRef.current) clearTimeout(soundDebounceRef.current);
        soundDebounceRef.current = setTimeout(() => {
            try {
                if (!audioRef.current) {
                    audioRef.current = new Audio("/sounds/notification.wav");
                    audioRef.current.volume = 0.6;
                }
                audioRef.current.currentTime = 0;
                audioRef.current.play().catch(() => {
                    // Browser blocks autoplay before first user interaction — safe to ignore
                });
            } catch {
                // Non-fatal
            }
            soundDebounceRef.current = null;
        }, 100);
    }

    useEffect(() => {
        if (!enabled) {
            esRef.current?.close();
            esRef.current = null;
            return;
        }

        let es = esRef.current;
        if (!es) {
            es = new EventSource("/api/notifications/subscribe");
            esRef.current = es;
        }

        es.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === "notification") {
                    const notification: AppNotification = data.notification;

                    // 1. Prepend to notification center cache
                    queryClient.setQueryData<NotificationsResponse | undefined>(
                        NOTIFICATIONS_QUERY_KEY,
                        (old) => {
                            if (!old) return old;
                            if (old.notifications.some((n) => n.id === notification.id)) return old;
                            return {
                                notifications: [notification, ...old.notifications],
                                unreadCount: old.unreadCount + (notification.isRead ? 0 : 1),
                            };
                        },
                    );

                    // 2. Toast
                    toast(notification.title, {
                        description: notification.message,
                    });

                    // 3. Sound — only for SSE-delivered events, never for page-load history
                    if (SOUND_NOTIFICATION_TYPES.has(notification.type)) {
                        scheduleSound();
                    }

                    // 4. Invalidate task-related queries
                    if (SUBMISSION_STATUS_NOTIFICATION_TYPES.has(notification.type)) {
                        queryClient.invalidateQueries({ queryKey: ["user-tasks"] });
                        queryClient.invalidateQueries({ queryKey: ["user-points"] });
                    }

                    // 5. Invalidate participant status — makes the participants page
                    //    re-fetch automatically when an admin approves/rejects.
                    if (PARTICIPANT_STATUS_NOTIFICATION_TYPES.has(notification.type)) {
                        queryClient.invalidateQueries({ queryKey: ["participant-status"] });
                    }
                }
            } catch {
                // Ignore heartbeat lines and parse errors
            }
        };

        es.onerror = () => {
            // EventSource reconnects automatically
        };

        return () => {
            es?.close();
            esRef.current = null;
            if (soundDebounceRef.current) clearTimeout(soundDebounceRef.current);
        };
    }, [queryClient, enabled]);

    return null;
}