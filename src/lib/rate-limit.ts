import { sql, lt } from 'drizzle-orm';
import { db } from "@/src/db";
import { rateLimitsTable } from "@/src/db/schema";

function getHeader(headers: Headers | Record<string, string | string[] | undefined>, name: string): string | undefined {
    if ('get' in headers) {
        return (headers as Headers).get(name) ?? undefined;
    }
    const val = (headers as Record<string, string | string[] | undefined>)[name];
    return Array.isArray(val) ? val[0] : val;
}

export function getClientIp(req: { headers: Headers | Record<string, string | string[] | undefined> }): string {
    const xff = getHeader(req.headers, 'x-forwarded-for');
    return xff?.split(',')[0]?.trim() ?? 'unknown';
}

export interface RateLimitResult {
    allowed: boolean;
    retryAfterSeconds: number;
}

export async function rateLimit(
    key: string,
    limit: number,
    windowMs: number,
): Promise<RateLimitResult> {
    const now = new Date();
    const newExpiry = new Date(now.getTime() + windowMs);

    const [row] = await db
        .insert(rateLimitsTable)
        .values({ key, count: 1, expiresAt: newExpiry })
        .onConflictDoUpdate({
            target: rateLimitsTable.key,
            set: {
                count: sql`CASE WHEN ${rateLimitsTable.expiresAt} < ${now}
                                THEN 1 ELSE ${rateLimitsTable.count} + 1 END`,
                expiresAt: sql`CASE WHEN ${rateLimitsTable.expiresAt} < ${now}
                                    THEN ${newExpiry} ELSE ${rateLimitsTable.expiresAt} END`,
            },
        })
        .returning({ count: rateLimitsTable.count, expiresAt: rateLimitsTable.expiresAt });

    const allowed = row.count <= limit;

    if (Math.random() < 0.02) {
        void db.delete(rateLimitsTable).where(lt(rateLimitsTable.expiresAt, now)).catch(() => {});
    }

    return {
        allowed,
        retryAfterSeconds: Math.max(0, Math.ceil((row.expiresAt.getTime() - now.getTime()) / 1000)),
    };
}
