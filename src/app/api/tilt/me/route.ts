// src/app/api/tilt/me/route.ts
//
// Returns the current authenticated Tilt user + any existing registration.
// Used by /tilt page to optionally pre-fill the form.
//
// Returns 200 with { user: null, registration: null } for unauthenticated visitors
// (rather than 401) because /tilt is now a public page.
// Still returns 401 only when a token is present but invalid/expired.

import { NextRequest, NextResponse } from 'next/server';
import { tiltDb } from '@/src/db/tilt-db';
import { tiltRegistrationsTable, tiltUsersTable } from '@/src/db/tilt-schema';
import { eq } from 'drizzle-orm';
import { jwtVerify } from 'jose';

const TILT_JWT_SECRET = new TextEncoder().encode(
    process.env.TILT_JWT_SECRET ?? 'tilt-fallback-secret-change-in-production'
);

export async function GET(req: NextRequest) {
    try {
        const token = req.cookies.get('tilt_token')?.value;

        // No token — guest visitor (public page, not an error)
        if (!token) {
            return NextResponse.json({ user: null, registration: null }, { status: 200 });
        }

        let payload: { id: number; email: string; name: string; role: string };
        try {
            const { payload: p } = await jwtVerify(token, TILT_JWT_SECRET);
            payload = p as typeof payload;
        } catch {
            // Token present but invalid/expired → tell the client
            return NextResponse.json({ error: 'Session expired. Please log in again.' }, { status: 401 });
        }

        const [dbUser] = await tiltDb
            .select({
                id: tiltUsersTable.id,
                name: tiltUsersTable.name,
                email: tiltUsersTable.email,
                role: tiltUsersTable.role,
                address: tiltUsersTable.address,
            })
            .from(tiltUsersTable)
            .where(eq(tiltUsersTable.id, payload.id));

        if (!dbUser) {
            return NextResponse.json({ error: 'Session no longer valid. Please log in again.' }, { status: 401 });
        }

        // Fetch existing registration if any
        const [registration] = await tiltDb
            .select()
            .from(tiltRegistrationsTable)
            .where(eq(tiltRegistrationsTable.userId, payload.id));

        return NextResponse.json({
            user: dbUser,
            registration: registration
                ? {
                    name: registration.name,
                    email: registration.email,
                    phone: registration.phone,
                    address: registration.address,
                }
                : null,
        });
    } catch (err) {
        console.error('[tilt/me]', err);
        return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
    }
}
