import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/src/services/auth.service";
import { UserService } from "@/src/services/user.service";
import { updateJwtToken } from "@/src/lib/jwt-session";
import { z } from "zod";

const birthdaySchema = z.object({
    dateOfBirth: z
        .string()
        .refine((val) => !Number.isNaN(new Date(val).getTime()), "Enter a valid date of birth")
        .refine((val) => new Date(val).getTime() <= Date.now(), "Date of birth can't be in the future"),
});

// POST /api/user/birthday  { dateOfBirth }
// One-time backfill for existing users who signed up before the
// dateOfBirth field was introduced. This just records the birthday for
// every user — it does NOT gate general app access. The 21+ requirement
// is enforced separately, only for /participants (see
// requireEligibleParticipant in auth.service.ts). Saves the birthday and
// patches the session cookie in place so the (main) layout redirect clears
// immediately, without requiring the user to log out/in.
export async function POST(req: NextRequest) {
    const auth = await requireUser();
    if (!auth.success) {
        return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    let json: unknown;
    try {
        json = await req.json();
    } catch {
        return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = birthdaySchema.safeParse(json);
    if (!parsed.success) {
        return NextResponse.json(
            { error: parsed.error.issues[0]?.message ?? "Invalid date of birth" },
            { status: 400 },
        );
    }

    const result = await UserService.setDateOfBirth(auth.data.id, parsed.data.dateOfBirth);
    if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: result.status ?? 400 });
    }

    await updateJwtToken({ dateOfBirth: new Date(parsed.data.dateOfBirth).toISOString() });

    return NextResponse.json({ success: true });
}
