import { jwtVerify } from "jose";
import { NextRequest, NextResponse } from "next/server";

const TILT_JWT_SECRET = new TextEncoder().encode(
  process.env.TILT_JWT_SECRET ?? "tilt-fallback-secret-change-in-production",
);

export type TiltSuperadminPayload = {
  id: number;
  email: string;
  name: string;
  role: string;
};

export async function requireTiltSuperadmin(req: NextRequest): Promise<
  | { ok: true; payload: TiltSuperadminPayload }
  | { ok: false; response: NextResponse }
> {
  const token = req.cookies.get("tilt_token")?.value;
  if (!token) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized." }, { status: 401 }),
    };
  }

  try {
    const { payload } = await jwtVerify(token, TILT_JWT_SECRET);
    const session = payload as TiltSuperadminPayload;

    if (session.role !== "SUPERADMIN") {
      return {
        ok: false,
        response: NextResponse.json({ error: "Forbidden." }, { status: 403 }),
      };
    }

    return { ok: true, payload: session };
  } catch {
    return {
      ok: false,
      response: NextResponse.json({ error: "Session expired." }, { status: 401 }),
    };
  }
}
