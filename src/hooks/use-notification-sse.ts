"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
    NOTIFICATIONS_QUERY_KEY,
    type AppNotification,
    type NotificationsResponse,
} from "./use-notifications";

const SUBMISSION_STATUS_NOTIFICATION_TYPES = new Set([
    "submission_rejected",
    "submission_approved",
]);

const PARTICIPANT_STATUS_NOTIFICATION_TYPES = new Set([
    "participant_approved",
    "participant_rejected",
]);

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

// Notification types that are important enough to show a browser notification
// when the tab is hidden or the browser is minimised.
const BROWSER_NOTIFY_TYPES = new Set([
    "submission_approved",
    "submission_rejected",
    "participant_approved",
    "participant_rejected",
    "points_awarded",
    "tier_upgrade",
    "event_announcement",
]);

// ─── Browser Notification Permission ─────────────────────────────────────────

/**
 * Request Notification permission once, silently.
 * We call this on the first real SSE event so we're guaranteed to be inside
 * a user-gesture context (the user must have interacted with the page to
 * trigger the event that opens the SSE connection).
 */
let permissionRequested = false;
async function ensurePermission(): Promise<boolean> {
    if (!("Notification" in window)) return false;
    if (Notification.permission === "granted") return true;
    if (Notification.permission === "denied") return false;
    if (permissionRequested) return false;

    permissionRequested = true;
    const result = await Notification.requestPermission();
    return result === "granted";
}

function showBrowserNotification(notification: AppNotification) {
    if (!("Notification" in window)) return;
    if (Notification.permission !== "granted") return;
    // Only show browser notification when the tab is hidden
    if (document.visibilityState === "visible") return;

    const n = new Notification(notification.title, {
        body: notification.message,
        icon: "/icon-192.png",   // adjust to your actual PWA icon path
        tag: `arbitary-notif-${notification.id}`, // deduplicates bursts
        renotify: false,
    } as NotificationOptions);

    // Focus the tab when the user clicks the notification
    n.onclick = () => {
        window.focus();
        n.close();
    };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useNotificationSSE({ enabled = true }: { enabled?: boolean } = {}) {
    const queryClient = useQueryClient();
    const esRef = useRef<EventSource | null>(null);

    const audioRef = useRef<HTMLAudioElement | null>(null);
    const soundDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    // Track whether we've had at least one user interaction so autoplay works
    const userInteractedRef = useRef(false);

    // Mark user interaction on first click/keypress — needed for audio autoplay policy
    useEffect(() => {
        const mark = () => { userInteractedRef.current = true; };
        window.addEventListener("click", mark, { once: true });
        window.addEventListener("keydown", mark, { once: true });
        return () => {
            window.removeEventListener("click", mark);
            window.removeEventListener("keydown", mark);
        };
    }, []);

    function scheduleSound() {
        if (soundDebounceRef.current) clearTimeout(soundDebounceRef.current);
        soundDebounceRef.current = setTimeout(() => {
            try {
                if (!audioRef.current) {
                    audioRef.current = new Audio("/sounds/notification.wav");
                    audioRef.current.volume = 0.6;
                }
                audioRef.current.currentTime = 0;
                // Only attempt play if the user has interacted — avoids Chrome autoplay errors
                if (userInteractedRef.current) {
                    audioRef.current.play().catch(() => {
                        // Autoplay still blocked — ignore silently
                    });
                }
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

        // Request browser notification permission early (before first notification arrives)
        // so we're ready when the first event comes in.
        ensurePermission().catch(() => { });

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

                    // 2. Sonner toast (visible when tab is active)
                    toast(notification.title, {
                        description: notification.message,
                    });

                    // 3. Sound — debounced, only after user interaction
                    if (SOUND_NOTIFICATION_TYPES.has(notification.type)) {
                        scheduleSound();
                    }

                    // 4. Browser Notification API — fires when tab is hidden/minimised
                    if (BROWSER_NOTIFY_TYPES.has(notification.type)) {
                        // Ensure we have permission first (may already be granted)
                        ensurePermission().then((granted) => {
                            if (granted) showBrowserNotification(notification);
                        });
                    }

                    // 5. Invalidate task-related queries
                    if (SUBMISSION_STATUS_NOTIFICATION_TYPES.has(notification.type)) {
                        queryClient.invalidateQueries({ queryKey: ["user-tasks"] });
                        queryClient.invalidateQueries({ queryKey: ["user-points"] });
                    }

                    // 6. Invalidate participant status
                    if (PARTICIPANT_STATUS_NOTIFICATION_TYPES.has(notification.type)) {
                        queryClient.invalidateQueries({ queryKey: ["participant-status"] });
                    }
                }
            } catch {
                // Ignore heartbeat lines and parse errors
            }
        };

        es.onerror = () => {
            // EventSource reconnects automatically — no action needed
        };

        return () => {
            es?.close();
            esRef.current = null;
            if (soundDebounceRef.current) clearTimeout(soundDebounceRef.current);
        };
    }, [queryClient, enabled]);

    return null;
}