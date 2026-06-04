import { NextRequest } from "next/server";
import { TaskService } from "@/src/services/task.service";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ shareCode: string }> },
) {
  const { shareCode } = await params;

  const stream = new ReadableStream({
    async start(controller) {
      const interval = setInterval(async () => {
        try {
          const result = await TaskService.getShareProgress(shareCode);
          if (!result.success) {
            controller.enqueue(
              new TextEncoder().encode('data: {"error":"not_found"}\n\n'),
            );
            clearInterval(interval);
            controller.close();
            return;
          }

          const data = `data: ${JSON.stringify({
            clickCount: result.data.current,
            threshold: result.data.threshold,
            completed: result.data.current >= result.data.threshold,
          })}\n\n`;

          controller.enqueue(new TextEncoder().encode(data));

          if (result.data.current >= result.data.threshold) {
            clearInterval(interval);
            controller.close();
          }
        } catch {
          clearInterval(interval);
          controller.close();
        }
      }, 3000);

      req.signal.addEventListener("abort", () => {
        clearInterval(interval);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
