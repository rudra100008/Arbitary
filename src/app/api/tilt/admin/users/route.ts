import { NextRequest, NextResponse } from 'next/server';
import { tiltDb } from '@/src/db/tilt-db';
import {
    tiltUsersTable,
    invitedOutletsTable,
    tiltOutletRewardTargetsTable,
    qrTokensTable,
    lotterySessionsTable,
    lotteryEntriesTable,
} from '@/src/db/tilt-schema';
import { eq, count, isNotNull } from 'drizzle-orm';
import { jwtVerify } from 'jose';
import { sendEmail } from '@/src/lib/email';
import { outletInviteHtml } from '@/src/lib/emails/outlet-invite';
import {
    getDailyRewardTarget,
    setOutletDailyRewardTarget,
    MIN_DAILY_REWARD_TARGET,
    MAX_DAILY_REWARD_TARGET,
} from '@/src/lib/tilt/reward-target';

function normalizeTimeInput(value: string): string | null {
    const trimmed = value.trim();
    const match = /^(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(trimmed);
    if (!match) return null;

    const hour = Number(match[1]);
    const minute = Number(match[2]);
    const second = match[3] ? Number(match[3]) : 0;

    if (!Number.isInteger(hour) || hour < 0 || hour > 23) return null;
    if (!Number.isInteger(minute) || minute < 0 || minute > 59) return null;
    if (!Number.isInteger(second) || second < 0 || second > 59) return null;

    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}`;
}

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
                operatingHoursStart: tiltUsersTable.operatingHoursStart,
                operatingHoursEnd: tiltUsersTable.operatingHoursEnd,
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

        const outletTargets = await tiltDb
            .select({
                outletId: tiltOutletRewardTargetsTable.outletId,
                dailyRewardTarget: tiltOutletRewardTargetsTable.dailyRewardTarget,
            })
            .from(tiltOutletRewardTargetsTable);

        // ── Merge ──────────────────────────────────────────────────────────
        const scanMap = new Map(scanCounts.map((r) => [r.outletId, r.count]));
        const submissionMap = new Map(submissionCounts.map((r) => [r.outletId, r.count]));
        const outletTargetMap = new Map(outletTargets.map((r) => [r.outletId, r.dailyRewardTarget]));
        const signedUpEmails = new Set(outlets.map((u) => u.email));
        const globalDailyRewardTarget = await getDailyRewardTarget();

        const result: {
            id: number | null;
            name: string | null;
            email: string;
            role: string | null;
            address: string | null;
            scanCount: number;
            submissionCount: number;
            dailyRewardTarget: number | null;
            operatingHoursStart: string | null;
            operatingHoursEnd: string | null;
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
            dailyRewardTarget: outletTargetMap.get(String(u.id)) ?? globalDailyRewardTarget,
            operatingHoursStart: u.operatingHoursStart,
            operatingHoursEnd: u.operatingHoursEnd,
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
                    dailyRewardTarget: null,
                    operatingHoursStart: null,
                    operatingHoursEnd: null,
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
            globalDailyRewardTarget,
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
            subject: "You're invited to Tilt Your Music",
            html: outletInviteHtml(signupLink),
        });

        if (!emailSent) {
            console.error(`[tilt/admin/users] Invite saved but email failed to send to ${normalizedEmail}`);
            await tiltDb
                .delete(invitedOutletsTable)
                .where(eq(invitedOutletsTable.email, normalizedEmail));
            return NextResponse.json(
                { error: 'Failed to send invite email. Please check email config and try again.' },
                { status: 502 },
            );
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

export async function PATCH(req: NextRequest) {
    try {
        const payload = await requireSuperadmin(req);
        if (!payload) {
            return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
        }

        const body = (await req.json().catch(() => ({}))) as {
            outletId?: string;
            target?: number;
            operatingHoursStart?: string;
            operatingHoursEnd?: string;
        };

        const outletId = typeof body.outletId === 'string' ? body.outletId.trim() : '';
        const hasTarget = typeof body.target !== 'undefined';
        const target = Number(body.target);
        const hasHours =
            typeof body.operatingHoursStart === 'string' &&
            typeof body.operatingHoursEnd === 'string';

        if (!outletId) {
            return NextResponse.json({ error: 'Outlet is required.' }, { status: 400 });
        }

        if (!hasTarget && !hasHours) {
            return NextResponse.json(
                { error: 'Provide a reward target and/or operating hours.' },
                { status: 400 },
            );
        }

        if (hasTarget && !Number.isInteger(target)) {
            return NextResponse.json({ error: 'Target must be an integer.' }, { status: 400 });
        }
        if (
            hasTarget &&
            (target < MIN_DAILY_REWARD_TARGET || target > MAX_DAILY_REWARD_TARGET)
        ) {
            return NextResponse.json(
                { error: `Target must be between ${MIN_DAILY_REWARD_TARGET} and ${MAX_DAILY_REWARD_TARGET}.` },
                { status: 400 },
            );
        }

        const normalizedStart = hasHours ? normalizeTimeInput(body.operatingHoursStart!) : null;
        const normalizedEnd = hasHours ? normalizeTimeInput(body.operatingHoursEnd!) : null;

        if (hasHours && (!normalizedStart || !normalizedEnd)) {
            return NextResponse.json(
                { error: 'Operating hours must use HH:MM format.' },
                { status: 400 },
            );
        }

        if (normalizedStart && normalizedEnd && normalizedEnd <= normalizedStart) {
            return NextResponse.json(
                { error: 'Operating end time must be after start time.' },
                { status: 400 },
            );
        }

        const [outlet] = await tiltDb
            .select({ id: tiltUsersTable.id })
            .from(tiltUsersTable)
            .where(eq(tiltUsersTable.id, Number(outletId)));

        if (!outlet) {
            return NextResponse.json({ error: 'Outlet not found.' }, { status: 404 });
        }

        let dailyRewardTarget: number | null = null;
        if (hasTarget) {
            dailyRewardTarget = await setOutletDailyRewardTarget(outletId, target, Number(payload.id));
        }

        if (normalizedStart && normalizedEnd) {
            await tiltDb
                .update(tiltUsersTable)
                .set({
                    operatingHoursStart: normalizedStart,
                    operatingHoursEnd: normalizedEnd,
                })
                .where(eq(tiltUsersTable.id, Number(outletId)));
        }

        const [updatedOutlet] = await tiltDb
            .select({
                operatingHoursStart: tiltUsersTable.operatingHoursStart,
                operatingHoursEnd: tiltUsersTable.operatingHoursEnd,
            })
            .from(tiltUsersTable)
            .where(eq(tiltUsersTable.id, Number(outletId)))
            .limit(1);

        return NextResponse.json(
            {
                outletId,
                dailyRewardTarget,
                operatingHoursStart: updatedOutlet?.operatingHoursStart ?? null,
                operatingHoursEnd: updatedOutlet?.operatingHoursEnd ?? null,
            },
            { status: 200 },
        );
    } catch (err) {
        console.error('[tilt/admin/users] PATCH', err);
        return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
    }
}
