// src/app/api/tilt/signup/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { tiltDb } from '@/src/db/tilt-db';
import { tiltUsersTable, invitedOutletsTable } from '@/src/db/tilt-schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { checkRateLimit, getIp } from '@/src/lib/tilt/rate-limit';

export async function POST(req: NextRequest) {
    try {
        const ip = getIp(req);
        // Limit to 5 signup attempts per minute per IP to prevent spam bots
        if (!checkRateLimit(`signup_${ip}`, 5, 60000)) {
            return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
        }

        const { name, email, password, address } = await req.json();

        // ── Basic validation ───────────────────────────────────────────────
        if (!name?.trim() || !email?.trim() || !password) {
            return NextResponse.json({ error: 'Business name, email and password are required.' }, { status: 400 });
        }

        if (password.length < 8) {
            return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 });
        }

        const normalizedEmail = email.toLowerCase().trim();

        // ── Check invite ───────────────────────────────────────────────────
        const [invite] = await tiltDb
            .select({ id: invitedOutletsTable.id })
            .from(invitedOutletsTable)
            .where(eq(invitedOutletsTable.email, normalizedEmail));

        if (!invite) {
            return NextResponse.json({ error: 'This email has not been invited yet.' }, { status: 403 });
        }

        // ── Check duplicate email ──────────────────────────────────────────
        const [existing] = await tiltDb
            .select({ id: tiltUsersTable.id })
            .from(tiltUsersTable)
            .where(eq(tiltUsersTable.email, normalizedEmail));

        if (existing) {
            return NextResponse.json({ error: 'An account with this email already exists.' }, { status: 409 });
        }

        // ── Hash password & insert ─────────────────────────────────────────
        const passwordHash = await bcrypt.hash(password, 12);

        await tiltDb
            .insert(tiltUsersTable)
            .values({ name: name.trim(), email: normalizedEmail, passwordHash, address: address?.trim() || null })
            .returning({ id: tiltUsersTable.id });

        // ── Consume invite (one-time use) ───────────────────────────────────
        await tiltDb
            .delete(invitedOutletsTable)
            .where(eq(invitedOutletsTable.id, invite.id));

        const response = NextResponse.json({ ok: true }, { status: 201 });

        return response;
    } catch (err) {
        console.error('[tilt/signup]', err);
        return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
    }
}