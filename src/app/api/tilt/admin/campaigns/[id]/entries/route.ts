import { NextRequest, NextResponse } from 'next/server';
import { eq, asc } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import { tiltDb } from '@/src/db/tilt-db';
import {
    lotteryEntriesTable,
    lotterySessionsTable,
    qrTokensTable,
    tiltUsersTable,
} from '@/src/db/tilt-schema';
import { requireTiltSuperadmin } from '@/src/lib/tilt/require-superadmin';

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const auth = await requireTiltSuperadmin(req);
        if (!auth.ok) return auth.response;

        const { id } = await params;
        if (!id) {
            return NextResponse.json({ error: 'Campaign ID is required.' }, { status: 400 });
        }

        const entries = await tiltDb
            .select({
                id: lotteryEntriesTable.id,
                fullName: lotteryEntriesTable.fullName,
                email: lotteryEntriesTable.email,
                phonePlain: lotteryEntriesTable.phonePlain,
                address: lotteryEntriesTable.address,
                flagged: lotteryEntriesTable.flagged,
                flagReason: lotteryEntriesTable.flagReason,
                outletName: tiltUsersTable.name,
                createdAt: lotteryEntriesTable.createdAt,
            })
            .from(lotteryEntriesTable)
            .innerJoin(lotterySessionsTable, eq(lotterySessionsTable.id, lotteryEntriesTable.sessionId))
            .innerJoin(qrTokensTable, eq(qrTokensTable.id, lotterySessionsTable.tokenId))
            .innerJoin(tiltUsersTable, eq(sql`${tiltUsersTable.id}::text`, qrTokensTable.outletId))
            .where(eq(lotteryEntriesTable.campaignId, id))
            .orderBy(asc(lotteryEntriesTable.createdAt));

        return NextResponse.json({ entries }, { status: 200 });
    } catch (error) {
        console.error('[tilt/admin/campaigns/entries]', error);
        return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
    }
}
