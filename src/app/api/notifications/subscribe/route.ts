import { NextRequest } from "next/server";
import { requireUser } from "@/src/services/auth.service";
import { notificationBus, type NotificationEvent } from "@/src/lib/realtime/notification-bus";

export async function GET(req: NextRequest) {
  const auth = await requireUser();
  if (!auth.success) {
    return new Response("Unauthorized", { status: 401 });
  }

  const userId = auth.data.id;
  const encoder = new TextEncoder();

  let unsubscribe: (() => void) | null = null;
  let heartbeat: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(`:connected\n\n`));

      const listener = (event: NotificationEvent) => {
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "notification", notification: event })}\n\n`),
          );
        } catch {
          // controller may already be closed
        }
      };

      unsubscribe = notificationBus.subscribe(userId, listener);

      heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`:heartbeat\n\n`));
        } catch {
          // controller may already be closed
        }
      }, 25_000);

      req.signal.addEventListener("abort", () => {
        if (heartbeat) clearInterval(heartbeat);
        unsubscribe?.();
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      });
    },
    cancel() {
      if (heartbeat) clearInterval(heartbeat);
      unsubscribe?.();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
    },
  });
}
