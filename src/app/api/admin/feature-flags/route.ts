import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/src/auth";
import { FeatureFlagsService } from "@/src/services/feature-flags.service";

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    key?: string;
    enabled?: boolean;
  };

  const { key, enabled } = body;

  if (!key || typeof enabled !== "boolean") {
    return NextResponse.json(
      { error: "key and enabled are required" },
      { status: 400 },
    );
  }

  await FeatureFlagsService.setEnabled(key, enabled);
  const flags = await FeatureFlagsService.getAll();

  return NextResponse.json({ flags });
}
