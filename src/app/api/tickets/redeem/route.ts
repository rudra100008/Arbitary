import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/src/services/auth.service";
import { TicketService } from "@/src/services/ticket.service";
import { toNextResponse } from "@/src/lib/api-response";
import z from "zod";

const redeemBodySchema = z.object({
  eventId: z.union([z.number(), z.string().regex(/^\d+$/).transform(Number)]),
  accessTypeId: z.union([z.number(), z.string().regex(/^\d+$/).transform(Number)]),
  quantity: z.number().int().min(1).max(10).optional().default(1),
});

export async function POST(req: NextRequest) {
  const auth = await requireUser();
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  const parsed = redeemBodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid Event ID or Access Type ID format" },
      { status: 400 },
    );
  }

  const { eventId, accessTypeId, quantity } = parsed.data;

  const result = await TicketService.redeemTicket(
    auth.data.id,
    eventId,
    accessTypeId,
    auth.data.email ?? undefined,
    auth.data.name ?? undefined,
    quantity,
  );
  if (!result.success) return toNextResponse(result);

  return NextResponse.json(result.data);
}
