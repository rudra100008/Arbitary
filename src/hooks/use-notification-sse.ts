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
 * points are stale and need to be refreshed immediately — otherwise the
 * user sees a "Submission rejected"/"approved" toast while the task card
 * still shows "Pending Verification".
 */
const SUBMISSION_STATUS_NOTIFICATION_TYPES = new Set([
    "submission_rejected",
    "submission_approved",
]);

/**
 * Subscribes to /api/notifications/subscribe (SSE) and:
 *  - prepends newly received notifications to the react-query cache so the
 *    notification center updates instantly without a page refresh,
 *  - shows a toast for the new notification, and
 *  - for submission status changes (rejected/approved), immediately
 *    invalidates the user's task list and points so the dashboard reflects
 *    the new status in lockstep with the notification (no stale "Pending
 *    Verification" card).
 *
 * Mount this once for any authenticated session (e.g. in the main layout).
 */
export function useNotificationSSE({ enabled = true }: { enabled?: boolean } = {}) {
    const queryClient = useQueryClient();
    const esRef = useRef<EventSource | null>(null);

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

                    queryClient.setQueryData<NotificationsResponse | undefined>(
                        NOTIFICATIONS_QUERY_KEY,
                        (old) => {
                            if (!old) return old;
                            // avoid duplicates if it's already in the cache
                            if (old.notifications.some((n) => n.id === notification.id)) return old;
                            return {
                                notifications: [notification, ...old.notifications],
                                unreadCount: old.unreadCount + (notification.isRead ? 0 : 1),
                            };
                        },
                    );

                    toast(notification.title, {
                        description: notification.message,
                    });

                    // Keep the dashboard's task cards and points in sync with
                    // this notification — don't wait for the separate
                    // polling-based task-status SSE to catch up.
                    if (SUBMISSION_STATUS_NOTIFICATION_TYPES.has(notification.type)) {
                        queryClient.invalidateQueries({ queryKey: ["user-tasks"] });
                        queryClient.invalidateQueries({ queryKey: ["user-points"] });
                    }
                }
            } catch {
                // ignore heartbeat/comment lines and parse errors
            }
        };

        es.onerror = () => {
            // EventSource auto-reconnects; nothing to do
        };

        return () => {
            es?.close();
            esRef.current = null;
        };
    }, [queryClient, enabled]);

    return null;
}
