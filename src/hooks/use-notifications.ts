"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export type AppNotification = {
    id: number;
    type: string;
    title: string;
    message: string;
    data: Record<string, unknown> | null;
    isRead: boolean;
    readAt: string | null;
    createdAt: string;
};

export type NotificationsResponse = {
    notifications: AppNotification[];
    unreadCount: number;
};

export const NOTIFICATIONS_QUERY_KEY = ["notifications"] as const;

export function useNotifications() {
    const queryClient = useQueryClient();

    const { data, isLoading, isError } = useQuery({
        queryKey: NOTIFICATIONS_QUERY_KEY,
        queryFn: async () => {
            const res = await fetch("/api/notifications?limit=30");
            if (!res.ok) throw new Error("Failed to fetch notifications");
            return res.json() as Promise<NotificationsResponse>;
        },
        // SSE delivers updates instantly; this is just a safety-net refresh
        // (covers the case where the SSE connection drops momentarily).
        refetchInterval: 60_000,
    });

    const markRead = useMutation({
        mutationFn: async (notificationIds: number[]) => {
            const res = await fetch("/api/notifications", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ notificationIds }),
            });
            if (!res.ok) throw new Error("Failed to mark notification as read");
            return res.json();
        },
        onMutate: async (notificationIds) => {
            await queryClient.cancelQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
            const previous = queryClient.getQueryData<NotificationsResponse>(NOTIFICATIONS_QUERY_KEY);

            queryClient.setQueryData<NotificationsResponse | undefined>(
                NOTIFICATIONS_QUERY_KEY,
                (old) => {
                    if (!old) return old;
                    const idSet = new Set(notificationIds);
                    let unreadDelta = 0;
                    const notifications = old.notifications.map((n) => {
                        if (idSet.has(n.id) && !n.isRead) {
                            unreadDelta += 1;
                            return { ...n, isRead: true, readAt: new Date().toISOString() };
                        }
                        return n;
                    });
                    return {
                        notifications,
                        unreadCount: Math.max(0, old.unreadCount - unreadDelta),
                    };
                },
            );

            return { previous };
        },
        onError: (_err, _vars, context) => {
            if (context?.previous) {
                queryClient.setQueryData(NOTIFICATIONS_QUERY_KEY, context.previous);
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
        },
    });

    const markAllRead = useMutation({
        mutationFn: async () => {
            const res = await fetch("/api/notifications", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ markAll: true }),
            });
            if (!res.ok) throw new Error("Failed to mark notifications as read");
            return res.json();
        },
        onMutate: async () => {
            await queryClient.cancelQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
            const previous = queryClient.getQueryData<NotificationsResponse>(NOTIFICATIONS_QUERY_KEY);

            queryClient.setQueryData<NotificationsResponse | undefined>(
                NOTIFICATIONS_QUERY_KEY,
                (old) => {
                    if (!old) return old;
                    return {
                        notifications: old.notifications.map((n) => ({
                            ...n,
                            isRead: true,
                            readAt: n.readAt ?? new Date().toISOString(),
                        })),
                        unreadCount: 0,
                    };
                },
            );

            return { previous };
        },
        onError: (_err, _vars, context) => {
            if (context?.previous) {
                queryClient.setQueryData(NOTIFICATIONS_QUERY_KEY, context.previous);
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
        },
    });

    const deleteNotifications = useMutation({
        mutationFn: async (notificationIds: number[]) => {
            const res = await fetch("/api/notifications", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ notificationIds }),
            });
            if (!res.ok) throw new Error("Failed to delete notification");
            return res.json();
        },
        onMutate: async (notificationIds) => {
            await queryClient.cancelQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
            const previous = queryClient.getQueryData<NotificationsResponse>(NOTIFICATIONS_QUERY_KEY);

            queryClient.setQueryData<NotificationsResponse | undefined>(
                NOTIFICATIONS_QUERY_KEY,
                (old) => {
                    if (!old) return old;
                    const idSet = new Set(notificationIds);
                    let unreadDelta = 0;
                    const notifications = old.notifications.filter((n) => {
                        if (idSet.has(n.id)) {
                            if (!n.isRead) unreadDelta += 1;
                            return false;
                        }
                        return true;
                    });
                    return {
                        notifications,
                        unreadCount: Math.max(0, old.unreadCount - unreadDelta),
                    };
                },
            );

            return { previous };
        },
        onError: (_err, _vars, context) => {
            if (context?.previous) {
                queryClient.setQueryData(NOTIFICATIONS_QUERY_KEY, context.previous);
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
        },
    });

    const deleteAllNotifications = useMutation({
        mutationFn: async () => {
            const res = await fetch("/api/notifications", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ deleteAll: true }),
            });
            if (!res.ok) throw new Error("Failed to delete notifications");
            return res.json();
        },
        onMutate: async () => {
            await queryClient.cancelQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
            const previous = queryClient.getQueryData<NotificationsResponse>(NOTIFICATIONS_QUERY_KEY);

            queryClient.setQueryData<NotificationsResponse | undefined>(
                NOTIFICATIONS_QUERY_KEY,
                () => ({ notifications: [], unreadCount: 0 }),
            );

            return { previous };
        },
        onError: (_err, _vars, context) => {
            if (context?.previous) {
                queryClient.setQueryData(NOTIFICATIONS_QUERY_KEY, context.previous);
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
        },
    });

    return {
        notifications: data?.notifications ?? [],
        unreadCount: data?.unreadCount ?? 0,
        isLoading,
        isError,
        markRead: (id: number) => markRead.mutate([id]),
        markAllRead: () => markAllRead.mutate(),
        deleteNotification: (id: number) => deleteNotifications.mutate([id]),
        deleteAllNotifications: () => deleteAllNotifications.mutate(),
    };
}