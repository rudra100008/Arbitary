
//src\app\api\admin\activity-stream\route.ts
import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/src/auth";
import { db } from "@/src/db";
import { adminActivityLogsTable } from "@/src/db/schema";
import { gt, desc } from "drizzle-orm";
import { Pool } from "pg";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

let listenerPool: Pool | null = null;

function getListenerPool(): Pool {
  if (!listenerPool) {
    listenerPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_URL?.includes("localhost")
        ? false
        : { rejectUnauthorized: false },
      max: 2,
    });
  }
  return listenerPool;
}

function sseEvent(event: string, data: unknown): string {
  const id = data && typeof data === "object" && "id" in data ? (data as Record<string, unknown>).id : undefined;
  let msg = "";
  if (id != null) msg += `id: ${id}\n`;
  msg += `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  return msg;
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();

  const lastEventId =
    req.headers.get("last-event-id") ||
    req.nextUrl.searchParams.get("lastEventId");

  const stream = async () => {
    try {
      if (lastEventId) {
        const missedLogs = await db
          .select()
          .from(adminActivityLogsTable)
          .where(gt(adminActivityLogsTable.id, Number(lastEventId)))
          .orderBy(desc(adminActivityLogsTable.createdAt))
          .limit(50);

        for (const log of missedLogs.reverse()) {
          writer.write(
            encoder.encode(sseEvent("log", { ...log, __replay: true })),
          );
        }
      }

      const pool = getListenerPool();
      const client = await pool.connect();
      let released = false;

      try {
        await client.query("LISTEN admin_logs");

        client.on("notification", (msg) => {
          if (msg.payload) {
            try {
              const log = JSON.parse(msg.payload);
              writer.write(encoder.encode(sseEvent("log", log))).catch(() => { });
            } catch { }
          }
        });

        const keepAlive = setInterval(() => {
          writer
            .write(encoder.encode(sseEvent("keepalive", { ts: Date.now() })))
            .catch(() => clearInterval(keepAlive));
        }, 30000);

        await new Promise<void>((resolve) => {
          req.signal.addEventListener("abort", () => {
            clearInterval(keepAlive);
            resolve();
          });
        });
      } finally {
        try {
          await client.query("UNLISTEN admin_logs");
        } catch { }
        if (!released) { released = true; client.release(); }
      }
    } catch (err) {
      console.error("[SSE] stream error:", err);
    } finally {
      try {
        await writer.close();
      } catch { }
    }
  };

  stream();

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
