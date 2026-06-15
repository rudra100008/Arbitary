

export type NotificationEvent = {
    id: number;
    type: string;
    title: string;
    message: string;
    data: Record<string, unknown> | null;
    isRead: boolean;
    readAt: string | null;
    createdAt: string;
};

type Listener = (event: NotificationEvent) => void;

const listenersByUser = new Map<number, Set<Listener>>();

export const notificationBus = {
    /**
     * Register a listener for a given user. Returns an unsubscribe function.
     */
    subscribe(userId: number, listener: Listener): () => void {
        let set = listenersByUser.get(userId);
        if (!set) {
            set = new Set();
            listenersByUser.set(userId, set);
        }
        set.add(listener);

        return () => {
            const current = listenersByUser.get(userId);
            if (!current) return;
            current.delete(listener);
            if (current.size === 0) {
                listenersByUser.delete(userId);
            }
        };
    },

    /**
     * Push an event to all of a user's live connections.
     * Returns true if at least one connection received it.
     */
    publish(userId: number, event: NotificationEvent): boolean {
        const set = listenersByUser.get(userId);
        if (!set || set.size === 0) return false;
        for (const listener of set) {
            try {
                listener(event);
            } catch {
                // a bad listener shouldn't break delivery to others
            }
        }
        return true;
    },

    /**
     * Whether the user currently has at least one open SSE connection.
     */
    isOnline(userId: number): boolean {
        const set = listenersByUser.get(userId);
        return !!set && set.size > 0;
    },
};