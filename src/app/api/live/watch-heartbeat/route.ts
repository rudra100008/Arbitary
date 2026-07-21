import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/src/services/auth.service";
import { AboutService } from "@/src/services/about.service";
import { LiveWatchService } from "@/src/services/live-watch.service";
import { rateLimit } from "@/src/lib/rate-limit";
import { z } from "zod";

const heartbeatSchema = z.object({
  deltaSeconds: z.number().int().min(0),
});

export async function PATCH(req: NextRequest) {
  const auth = await requireUser();
  console.log("[watch-heartbeat] auth:", auth.success, auth.success ? auth.data.id : undefined);
  if (!auth.success) {
    return NextResponse.json({ error: "Sign in to earn points" }, { status: 401 });
  }

  const rl = await rateLimit(`livewatch:${auth.data.id}`, 1, 45_000);
  console.log("[watch-heartbeat] rl:", rl.allowed);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too fast" }, { status: 429 });
  }

  const streamResult = await AboutService.getLiveStreamId();
  console.log("[watch-heartbeat] streamResult:", streamResult.success, streamResult.success ? streamResult.data : undefined);
  if (!streamResult.success || !streamResult.data) {
    return NextResponse.json({ error: "No live stream active" }, { status: 400 });
  }

  const body = await req.json();
  console.log("[watch-heartbeat] body:", JSON.stringify(body));
  const parsed = heartbeatSchema.safeParse(body);
  if (!parsed.success) {
    console.warn("[watch-heartbeat] validation error:", parsed.error);
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const result = await LiveWatchService.heartbeat(
    auth.data.id,
    streamResult.data,
    parsed.data.deltaSeconds,
  );
  console.log("[watch-heartbeat] heartbeat result:", result.success, result.success ? undefined : result.error ?? "");

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(result.data, { status: 200 });
}
