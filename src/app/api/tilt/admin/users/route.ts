import { NextRequest, NextResponse } from 'next/server';
import { tiltDb } from '@/src/db/tilt-db';
import {
    tiltUsersTable,
    invitedOutletsTable,
    qrTokensTable,
    lotterySessionsTable,
    lotteryEntriesTable,
} from '@/src/db/tilt-schema';
import { eq, count, isNotNull } from 'drizzle-orm';
import { jwtVerify } from 'jose';
import { sendEmail } from '@/src/lib/email';
import { outletInviteHtml } from '@/src/lib/emails/outlet-invite';

const TILT_JWT_SECRET = new TextEncoder().encode(
    process.env.TILT_JWT_SECRET ?? 'tilt-fallback-secret-change-in-production'
);

async function requireSuperadmin(req: NextRequest) {
    const token = req.cookies.get('tilt_token')?.value;
    if (!token) return null;
    try {
        const { payload } = await jwtVerify(token, TILT_JWT_SECRET);
        return (payload as { id: number; email: string; name: string; role: string }).role === 'SUPERADMIN'
            ? payload
            : null;
    } catch {
        return null;
    }
}

export async function GET(req: NextRequest) {
    try {
        const payload = await requireSuperadmin(req);
        if (!payload) {
            return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
        }

        // ── Signed-up outlets ──────────────────────────────────────────────
        const outlets = await tiltDb
            .select({
                id: tiltUsersTable.id,
                name: tiltUsersTable.name,
                email: tiltUsersTable.email,
                role: tiltUsersTable.role,
                address: tiltUsersTable.address,
                createdAt: tiltUsersTable.createdAt,
            })
            .from(tiltUsersTable)
            .where(eq(tiltUsersTable.role, 'outlet'))
            .orderBy(tiltUsersTable.createdAt)
            .limit(100);

        // ── Scan counts per outlet ─────────────────────────────────────────
        const scanCounts = await tiltDb
            .select({
                outletId: qrTokensTable.outletId,
                count: count(),
            })
            .from(qrTokensTable)
            .where(isNotNull(qrTokensTable.usedAt))
            .groupBy(qrTokensTable.outletId);

        // ── Submission counts per outlet ────────────────────────────────────
        const submissionCounts = await tiltDb
            .select({
                outletId: qrTokensTable.outletId,
                count: count(),
            })
            .from(lotteryEntriesTable)
            .innerJoin(lotterySessionsTable, eq(lotterySessionsTable.id, lotteryEntriesTable.sessionId))
            .innerJoin(qrTokensTable, eq(qrTokensTable.id, lotterySessionsTable.tokenId))
            .groupBy(qrTokensTable.outletId);

        // ── Invited emails not yet signed up ────────────────────────────────
        const invited = await tiltDb
            .select()
            .from(invitedOutletsTable)
            .orderBy(invitedOutletsTable.createdAt)
            .limit(100);

        // ── Merge ──────────────────────────────────────────────────────────
        const scanMap = new Map(scanCounts.map((r) => [r.outletId, r.count]));
        const submissionMap = new Map(submissionCounts.map((r) => [r.outletId, r.count]));
        const signedUpEmails = new Set(outlets.map((u) => u.email));

        const result: {
            id: number | null;
            name: string | null;
            email: string;
            role: string | null;
            address: string | null;
            scanCount: number;
            submissionCount: number;
            createdAt: Date | null;
            status: 'active' | 'invited';
        }[] = outlets.map((u) => ({
            id: u.id,
            name: u.name,
            email: u.email,
            role: u.role,
            address: u.address,
            scanCount: scanMap.get(String(u.id)) ?? 0,
            submissionCount: submissionMap.get(String(u.id)) ?? 0,
            createdAt: u.createdAt,
            status: 'active' as const,
        }));

        for (const inv of invited) {
            if (!signedUpEmails.has(inv.email)) {
                result.push({
                    id: inv.id,
                    name: null,
                    email: inv.email,
                    role: null,
                    address: null,
                    scanCount: 0,
                    submissionCount: 0,
                    createdAt: inv.createdAt,
                    status: 'invited',
                });
            }
        }

        const [totalSubmissionsRow] = await tiltDb
            .select({ count: count() })
            .from(lotteryEntriesTable);

        return NextResponse.json({
            users: result,
            totalSubmissions: totalSubmissionsRow?.count ?? 0,
        });
    } catch (err) {
        console.error('[tilt/admin/users]', err);
        return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const payload = await requireSuperadmin(req);
        if (!payload) {
            return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
        }

        const { email } = await req.json();

        if (!email?.trim()) {
            return NextResponse.json({ error: 'Email is required.' }, { status: 400 });
        }

        const normalizedEmail = email.toLowerCase().trim();

        // ── Check duplicate invite ─────────────────────────────────────────
        const [existing] = await tiltDb
            .select({ id: invitedOutletsTable.id })
            .from(invitedOutletsTable)
            .where(eq(invitedOutletsTable.email, normalizedEmail));

        if (existing) {
            return NextResponse.json({ error: 'This email is already invited.' }, { status: 409 });
        }

        // ── Check if already signed up ─────────────────────────────────────
        const [signedUp] = await tiltDb
            .select({ id: tiltUsersTable.id })
            .from(tiltUsersTable)
            .where(eq(tiltUsersTable.email, normalizedEmail));

        if (signedUp) {
            return NextResponse.json({ error: 'This email already has an account.' }, { status: 409 });
        }

        await tiltDb.insert(invitedOutletsTable).values({ email: normalizedEmail });

        const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
        const signupLink = `${baseUrl}/tilt/signup`;

        const emailSent = await sendEmail({
            to: normalizedEmail,
            subject: "You've been invited to Arbitrary",
            html: outletInviteHtml(signupLink),
        });

        if (!emailSent) {
            console.error(`[tilt/admin/users] Invite saved but email failed to send to ${normalizedEmail}`);
        }

        return NextResponse.json({ ok: true, emailSent }, { status: 201 });
    } catch (err) {
        console.error('[tilt/admin/users] POST', err);
        return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const payload = await requireSuperadmin(req);
        if (!payload) {
            return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
        }

        const { type, id } = await req.json();

        if (type === 'invite') {
            await tiltDb
                .delete(invitedOutletsTable)
                .where(eq(invitedOutletsTable.id, id));
        } else if (type === 'user') {
            await tiltDb
                .delete(tiltUsersTable)
                .where(eq(tiltUsersTable.id, id));
        } else {
            return NextResponse.json({ error: 'Invalid type.' }, { status: 400 });
        }

        return NextResponse.json({ ok: true });
    } catch (err) {
        console.error('[tilt/admin/users] DELETE', err);
        return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
    }
}
