import { NextRequest, NextResponse } from "next/server";
import { db } from "@/src/db";
import { participantSubmissionsTable } from "@/src/db/schema";
import { eq } from "drizzle-orm";
import { requireUser } from "@/src/services/auth.service";

// GET /api/participants/status
// Returns whether the logged-in user has already submitted for song/dance
export async function GET(_req: NextRequest) {
    const auth = await requireUser();
    if (!auth.success) {
        return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    const rows = await db
        .select({
            category: participantSubmissionsTable.category,
            status: participantSubmissionsTable.status,
            createdAt: participantSubmissionsTable.createdAt,
        })
        .from(participantSubmissionsTable)
        .where(eq(participantSubmissionsTable.userId, auth.data.id));

    // Build a map { song?: {status, createdAt}, dance?: {status, createdAt} }
    const result: Record<string, { status: string; createdAt: string }> = {};
    for (const row of rows) {
        result[row.category] = {
            status: row.status,
            createdAt: row.createdAt.toISOString(),
        };
    }

    return NextResponse.json(result);
}