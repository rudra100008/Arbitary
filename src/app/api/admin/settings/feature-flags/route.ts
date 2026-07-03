import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/src/services/auth.service";
import { FeatureFlagService, TOGGLEABLE_PLATFORMS } from "@/src/services/feature-flag.service";
import { z } from "zod";

const patchSchema = z.object({
    key: z.enum(TOGGLEABLE_PLATFORMS),
    enabled: z.boolean(),
});

// Admin-only read of the current flags (used by the /admin/dashboard/settings
// page). The public, unauthenticated read used by the rest of the app lives
// at /api/platform-flags — kept separate so this route can stay behind
// requireAdmin without breaking the public UI checks.
export async function GET() {
    const auth = await requireAdmin();
    if (!auth.success) {
        return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const result = await FeatureFlagService.getFlags();
    if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: result.status ?? 500 });
    }
    return NextResponse.json(result.data);
}

export async function PATCH(req: NextRequest) {
    const auth = await requireAdmin();
    if (!auth.success) {
        return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const parsed = patchSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
        return NextResponse.json(
            { error: "Validation failed", details: parsed.error.flatten() },
            { status: 400 },
        );
    }

    const result = await FeatureFlagService.setFlag(
        parsed.data.key,
        parsed.data.enabled,
        auth.data.id,
    );
    if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: result.status ?? 500 });
    }

    return NextResponse.json(result.data);
}
