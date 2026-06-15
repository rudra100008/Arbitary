import { db } from "@/src/db";
import { notificationsTable, usersTable } from "@/src/db/schema";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { ok, fail, ServiceResult } from "./result";
import { notificationBus, type NotificationEvent } from "@/src/lib/realtime/notification-bus";
import { sendEmail } from "@/src/lib/email";
import type { NotificationType } from "@/src/lib/validations/notification";

export type NotificationItem = {
    id: number;
    type: string;
    title: string;
    message: string;
    data: Record<string, unknown> | null;
    isRead: boolean;
    readAt: string | null;
    createdAt: string;
};

export type CreateNotificationInput = {
    userId: number;
    type: NotificationType;
    title: string;
    message: string;
    data?: Record<string, unknown> | null;
};

export type DeliverNotificationInput = CreateNotificationInput & {
    /**
     * If provided, sent by email ONLY when the user has no live SSE
     * connection at the moment the notification is created (i.e. they're
     * offline and would otherwise miss the real-time push).
     */
    email?: {
        subject: string;
        html: string;
    };
};

function toNotificationItem(row: typeof notificationsTable.$inferSelect): NotificationItem {
    return {
        id: row.id,
        type: row.type,
        title: row.title,
        message: row.message,
        data: (row.data as Record<string, unknown> | null) ?? null,
        isRead: row.isRead,
        readAt: row.readAt ? row.readAt.toISOString() : null,
        createdAt: row.createdAt.toISOString(),
    };
}

export const NotificationService = {
    /**
     * Persist a notification and immediately push it to any live SSE
     * connection(s) the user has open. Does NOT send email — use `deliver`
     * for the full real-time-or-email workflow.
     */
    /**
     * Persist a notification and immediately push it to any live SSE
     * connection(s) the user has open. Does NOT send email — use `deliver`
     * for the full real-time-or-email workflow.
     *
     * Returns the persisted item plus whether the realtime push actually
     * reached a live listener (useful for offline/email fallback decisions
     * without a separate pre-check that can race with the insert).
     */
    async create(
        input: CreateNotificationInput,
    ): Promise<NotificationItem & { delivered: boolean }> {
        const [row] = await db
            .insert(notificationsTable)
            .values({
                userId: input.userId,
                type: input.type,
                title: input.title,
                message: input.message,
                data: input.data ?? null,
            })
            .returning();

        const item = toNotificationItem(row);

        const event: NotificationEvent = {
            id: item.id,
            type: item.type,
            title: item.title,
            message: item.message,
            data: item.data,
            isRead: item.isRead,
            readAt: item.readAt,
            createdAt: item.createdAt,
        };
        const delivered = notificationBus.publish(input.userId, event);

        return { ...item, delivered };
    },

    /**
     * Full delivery workflow used for "important" events that should reach
     * the user one way or another:
     *  - Always persisted (so it shows up in the notification center later).
     *  - Pushed in real-time via SSE if the user is currently online.
     *  - Otherwise, if `email` is provided, sent to the user's registered
     *    email address as a fallback.
     *
     * The online/offline decision is derived from the actual result of the
     * realtime publish at insert time, avoiding the race window of checking
     * `isOnline()` before the insert.
     */
    async deliver(input: DeliverNotificationInput): Promise<NotificationItem> {
        const { delivered, ...item } = await this.create(input);

        if (!delivered && input.email) {
            const [user] = await db
                .select({ email: usersTable.email, name: usersTable.name })
                .from(usersTable)
                .where(eq(usersTable.id, input.userId));

            if (user?.email) {
                // Best-effort — don't fail the whole operation if email delivery fails.
                sendEmail({
                    to: user.email,
                    subject: input.email.subject,
                    html: input.email.html,
                }).catch((err) => {
                    console.error("Failed to send notification email:", err);
                });
            }
        }

        return item;
    },

    async list(
        userId: number,
        opts: { limit?: number; unreadOnly?: boolean } = {},
    ): Promise<ServiceResult<{ notifications: NotificationItem[]; unreadCount: number }>> {
        const limit = Math.min(Math.max(opts.limit ?? 20, 1), 50);

        const conditions = [eq(notificationsTable.userId, userId)];
        if (opts.unreadOnly) conditions.push(eq(notificationsTable.isRead, false));

        const rows = await db
            .select()
            .from(notificationsTable)
            .where(and(...conditions))
            .orderBy(desc(notificationsTable.createdAt), desc(notificationsTable.id))
            .limit(limit);

        const [{ count }] = await db
            .select({ count: sql<number>`count(*)::int` })
            .from(notificationsTable)
            .where(and(eq(notificationsTable.userId, userId), eq(notificationsTable.isRead, false)));

        return ok({
            notifications: rows.map(toNotificationItem),
            unreadCount: count,
        });
    },

    async markRead(
        userId: number,
        opts: { notificationIds?: number[]; markAll?: boolean },
    ): Promise<ServiceResult<{ updated: number }>> {
        if (opts.markAll) {
            const updated = await db
                .update(notificationsTable)
                .set({ isRead: true, readAt: new Date() })
                .where(and(eq(notificationsTable.userId, userId), eq(notificationsTable.isRead, false)))
                .returning({ id: notificationsTable.id });

            return ok({ updated: updated.length });
        }

        if (!opts.notificationIds || opts.notificationIds.length === 0) {
            return fail("notificationIds or markAll is required", 400);
        }

        const updated = await db
            .update(notificationsTable)
            .set({ isRead: true, readAt: new Date() })
            .where(
                and(
                    eq(notificationsTable.userId, userId),
                    inArray(notificationsTable.id, opts.notificationIds),
                ),
            )
            .returning({ id: notificationsTable.id });

        return ok({ updated: updated.length });
    },

    async delete(
        userId: number,
        opts: { notificationIds?: number[]; deleteAll?: boolean },
    ): Promise<ServiceResult<{ deleted: number }>> {
        if (opts.deleteAll) {
            const deleted = await db
                .delete(notificationsTable)
                .where(eq(notificationsTable.userId, userId))
                .returning({ id: notificationsTable.id });

            return ok({ deleted: deleted.length });
        }

        if (!opts.notificationIds || opts.notificationIds.length === 0) {
            return fail("notificationIds or deleteAll is required", 400);
        }

        const deleted = await db
            .delete(notificationsTable)
            .where(
                and(
                    eq(notificationsTable.userId, userId),
                    inArray(notificationsTable.id, opts.notificationIds),
                ),
            )
            .returning({ id: notificationsTable.id });

        return ok({ deleted: deleted.length });
    },
};