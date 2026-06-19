import { NextRequest, NextResponse } from "next/server";
import { db } from "@/src/db";
import { participantSubmissionsTable } from "@/src/db/schema";
import { eq, desc, and, like } from "drizzle-orm";
import { requireAdmin } from "@/src/services/auth.service";
import { NotificationService } from "@/src/services/notification.service";

// GET /api/admin/participants?category=song&status=pending&page=1
export async function GET(req: NextRequest) {
    const auth = await requireAdmin();
    if (!auth.success) {
        return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const status = searchParams.get("status");
    const search = searchParams.get("search");
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const pageSize = 20;

    const conditions = [];
    if (category && ["song", "dance"].includes(category)) {
        conditions.push(eq(participantSubmissionsTable.category, category));
    }
    if (status && ["pending", "approved", "rejected"].includes(status)) {
        conditions.push(eq(participantSubmissionsTable.status, status));
    }
    if (search?.trim()) {
        conditions.push(like(participantSubmissionsTable.name, `%${search.trim()}%`));
    }

    const rows = await db
        .select()
        .from(participantSubmissionsTable)
        .where(conditions.length ? and(...conditions) : undefined)
        .orderBy(desc(participantSubmissionsTable.createdAt))
        .limit(pageSize)
        .offset((page - 1) * pageSize);

    return NextResponse.json({ submissions: rows, page, pageSize });
}

// PATCH /api/admin/participants  { id, status, rejectedReason? }
export async function PATCH(req: NextRequest) {
    const auth = await requireAdmin();
    if (!auth.success) {
        return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    const body = await req.json();
    const { id, status, rejectedReason } = body as {
        id: number;
        status: "approved" | "rejected" | "pending";
        rejectedReason?: string;
    };

    if (!id || !["approved", "rejected", "pending"].includes(status)) {
        return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    // Fetch current submission — needed to get userId for notification
    // and to enforce the one-time approval/rejection rule.
    const [existing] = await db
        .select()
        .from(participantSubmissionsTable)
        .where(eq(participantSubmissionsTable.id, id));

    if (!existing) {
        return NextResponse.json({ error: "Submission not found" }, { status: 404 });
    }

    // A participant can only be approved or rejected once.
    if (
        (status === "approved" && existing.status === "approved") ||
        (status === "rejected" && existing.status === "rejected")
    ) {
        return NextResponse.json(
            { error: `Submission is already ${status}` },
            { status: 409 },
        );
    }

    // Sanitize rejection reason:
    //  - trim whitespace
    //  - treat empty string as null
    //  - hard-cap at 250 characters
    let sanitizedReason: string | null = null;
    if (status === "rejected" && rejectedReason !== undefined) {
        const trimmed = rejectedReason.trim().slice(0, 250);
        if (trimmed.length > 0) sanitizedReason = trimmed;
    }

    await db
        .update(participantSubmissionsTable)
        .set({
            status,
            rejectedReason: status === "rejected" ? sanitizedReason : null,
            updatedAt: new Date(),
        })
        .where(eq(participantSubmissionsTable.id, id));

    // Deliver notification to the participant.
    // NotificationService.deliver() persists the row AND pushes it via SSE
    // to any open connection the user has. If they're offline, the notification
    // will appear when they next open the app (loaded from DB by the bell).
    if (status === "approved") {
        await NotificationService.deliver({
            userId: existing.userId,
            type: "participant_approved",
            title: "Participation Approved",
            message: "Your participation request has been approved.",
            data: { type: "participant_approved" },
        });
    } else if (status === "rejected") {
        await NotificationService.deliver({
            userId: existing.userId,
            type: "participant_rejected",
            title: "Participation Rejected",
            message: "Your participation request has been rejected.",
            // Store reason in both the participant record (above) and the
            // notification payload so historical notifications always show
            // the exact reason that was sent, even if the record is later
            // modified.
            data: {
                type: "participant_rejected",
                reason: sanitizedReason,
            },
        });
    }

    return NextResponse.json({ success: true });
}