import { jwtVerify } from "jose";
import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { tiltDb } from "@/src/db/tilt-db";
import { tiltUsersTable } from "@/src/db/tilt-schema";

const TILT_JWT_SECRET = new TextEncoder().encode(
  process.env.TILT_JWT_SECRET ?? "tilt-fallback-secret-change-in-production",
);

export type TiltOutletPayload = {
  id: number;
  email: string;
  name: string;
  role: string;
};

export async function requireTiltOutlet(req: NextRequest): Promise<
  | { ok: true; payload: TiltOutletPayload; outletId: string }
  | { ok: false; response: NextResponse }
> {
  const token = req.cookies.get("tilt_token")?.value;
  if (!token) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  let payload: TiltOutletPayload;
  try {
    const { payload: p } = await jwtVerify(token, TILT_JWT_SECRET);
    payload = p as TiltOutletPayload;
  } catch {
    return {
      ok: false,
      response: NextResponse.json({ error: "Session expired" }, { status: 401 }),
    };
  }

  if (payload.role !== "outlet") {
    return {
      ok: false,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  const outletId = String(payload.id ?? "").trim();
  if (!outletId) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const [dbOutlet] = await tiltDb
    .select({ id: tiltUsersTable.id })
    .from(tiltUsersTable)
    .where(eq(tiltUsersTable.id, payload.id))
    .limit(1);

  if (!dbOutlet) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Session no longer valid. Please log in again." },
        { status: 401 },
      ),
    };
  }

  return { ok: true, payload, outletId };
}
