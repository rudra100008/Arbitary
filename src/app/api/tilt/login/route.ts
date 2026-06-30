// src/app/api/tilt/login/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { tiltDb } from '@/src/db/tilt-db';
import { tiltUsersTable } from '@/src/db/tilt-schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { SignJWT } from 'jose';
import { checkRateLimit, getIp } from '@/src/lib/tilt/rate-limit';

const TILT_JWT_SECRET = new TextEncoder().encode(
    process.env.TILT_JWT_SECRET ?? 'tilt-fallback-secret-change-in-production'
);

export async function POST(req: NextRequest) {
    try {
        const ip = getIp(req);
        // Limit to 10 login attempts per minute per IP
        if (!checkRateLimit(`login_${ip}`, 10, 60000)) {
            return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
        }

        const { email, password } = await req.json();

        if (!email?.trim() || !password) {
            return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
        }

        // ── Find user ──────────────────────────────────────────────────────
        const [user] = await tiltDb
            .select()
            .from(tiltUsersTable)
            .where(eq(tiltUsersTable.email, email.toLowerCase().trim()));

        if (!user) {
            return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
        }

        // ── Verify password ────────────────────────────────────────────────
        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) {
            return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
        }

        // ── Issue JWT ──────────────────────────────────────────────────────
        const token = await new SignJWT({ id: user.id, email: user.email, name: user.name ,role:user.role})
            .setProtectedHeader({ alg: 'HS256' })
            .setExpirationTime('7d')
            .sign(TILT_JWT_SECRET);

        const response = NextResponse.json({ ok: true, role: user.role }, { status: 200 });
        response.cookies.set('tilt_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7,
            path: '/',
        });

        return response;
    } catch (err) {
        console.error('[tilt/login]', err);
        return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
    }
}