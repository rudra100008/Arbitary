import { sql } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { tiltDb } from '@/src/db/tilt-db';

export async function GET() {
    const timestamp = new Date().toISOString();
    const appUrlConfigured = Boolean(process.env.NEXTAUTH_URL?.trim());
    const countryCode = (process.env.LOTTERY_COUNTRY_CODE ?? '977').trim() || '977';

    try {
        await tiltDb.execute(sql`select 1`);

        return NextResponse.json(
            {
                db: 'ok',
                app_url_configured: appUrlConfigured,
                country_code: countryCode,
                timestamp,
            },
            { status: 200 },
        );
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown database error';

        return NextResponse.json(
            {
                db: 'error',
                db_error: message,
                app_url_configured: appUrlConfigured,
                country_code: countryCode,
                timestamp,
            },
            { status: 200 },
        );
    }
}
