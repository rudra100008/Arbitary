import { NextRequest, NextResponse } from "next/server";
import { db } from "@/src/db";
import { participantSubmissionsTable } from "@/src/db/schema";
import { eq, desc, and, like } from "drizzle-orm";
import { requireAdmin, requireEligibleParticipant } from "@/src/services/auth.service";
import { NotificationService } from "@/src/services/notification.service";
import { participantSubmissionSchema } from "@/src/lib/validations/participant";
import { parseSocialUrl } from "@/src/lib/social-url";

// POST /api/participants  { category, name, email, phone?, mediaUrl }
// mediaUrl must be a public YouTube, Instagram, or Facebook link.
// Restricted to participants 21+ (see requireEligibleParticipant).
export async function POST(req: NextRequest) {
    const auth = await requireEligibleParticipant();
    if (!auth.success) {
        return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    let json: unknown;
    try {
        json = await req.json();
    } catch {
        return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsedBody = participantSubmissionSchema.safeParse(json);
    if (!parsedBody.success) {
        return NextResponse.json(
            { error: parsedBody.error.issues[0]?.message ?? "Invalid submission" },
            { status: 400 },
        );
    }
    const { category, name, email, phone, mediaUrl } = parsedBody.data;

    // Authoritative re-parse — never trust that client-side detection
    // (which uses the same util) wasn't bypassed or tampered with.
    const parsed = parseSocialUrl(mediaUrl);
    if (!parsed) {
        return NextResponse.json({ error: "Unsupported or malformed URL" }, { status: 400 });
    }

    // Prevent duplicate submissions for the same category
    const [existing] = await db
        .select({ id: participantSubmissionsTable.id })
        .from(participantSubmissionsTable)
        .where(
            and(
                eq(participantSubmissionsTable.userId, auth.data.id),
                eq(participantSubmissionsTable.category, category),
            ),
        );

    if (existing) {
        return NextResponse.json(
            { error: "You have already submitted for this category" },
            { status: 409 },
        );
    }

    await db.insert(participantSubmissionsTable).values({
        userId: auth.data.id,
        category,
        name: name.trim(),
        email: email.trim(),
        phone: phone?.trim() ?? null,
        mediaUrl: parsed.normalizedUrl,
        mediaPlatform: parsed.platform,
        status: "pending",
        createdAt: new Date(),
        updatedAt: new Date(),
    });

    return NextResponse.json({ success: true }, { status: 201 });
}

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

    // Fetch the current submission to enforce one-time approval/rejection rule
    const [existing] = await db
        .select()
        .from(participantSubmissionsTable)
        .where(eq(participantSubmissionsTable.id, id));

    if (!existing) {
        return NextResponse.json({ error: "Submission not found" }, { status: 404 });
    }

    // Enforce: a participant can only be approved or rejected once
    if (
        (status === "approved" && existing.status === "approved") ||
        (status === "rejected" && existing.status === "rejected")
    ) {
        return NextResponse.json(
            { error: `Submission is already ${status}` },
            { status: 409 },
        );
    }

    // Sanitize and validate rejection reason:
    // - Trim leading/trailing whitespace
    // - Treat empty string as null
    // - Enforce 250-character max
    let sanitizedReason: string | null = null;
    if (status === "rejected" && rejectedReason !== undefined) {
        const trimmed = rejectedReason.trim();
        if (trimmed.length > 0) {
            sanitizedReason = trimmed.slice(0, 250);
        }
    }

    await db
        .update(participantSubmissionsTable)
        .set({
            status,
            rejectedReason: status === "rejected" ? sanitizedReason : null,
            updatedAt: new Date(),
        })
        .where(eq(participantSubmissionsTable.id, id));

    // Send notification to the participant
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
            data: {
                type: "participant_rejected",
                reason: sanitizedReason,
            },
        });
    }

    return NextResponse.json({ success: true });
}