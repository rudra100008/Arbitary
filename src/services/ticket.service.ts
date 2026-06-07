import { db } from "@/src/db";
import {
  usersTable,
  userTicketsTable,
  eventsTable,
  accessTypesTable,
} from "@/src/db/schema";
import { and, eq, desc, gte, sql } from "drizzle-orm";
import { sendEmail } from "@/src/lib/email";
import { ServiceResult, ok, fail } from "./result";
import type { UserTicket } from "@/src/types/db";

export type TicketWithDetails = {
  id: number;
  status: string;
  redemptionToken: string;
  event: { title: string; eventDate: string; venue: string | null } | null;
  user: { name: string | null; email: string };
  accessType: { title: string } | null;
};

function formatDate(d: Date | string | null | undefined): string {
  if (!d) return "";
  if (typeof d === "string") return d;
  return d.toISOString();
}

export const TicketService = {
  async getUserTickets(
    userId: number,
  ): Promise<ServiceResult<UserTicket[]>> {
    const tickets = await db.query.userTicketsTable.findMany({
      where: eq(userTicketsTable.userId, userId),
      with: { event: true, accessType: true },
      orderBy: [desc(userTicketsTable.id)],
    });
    return ok(tickets);
  },

  async redeemTicket(
    userId: number,
    eventId: number,
    accessTypeId: number,
    userEmail?: string,
    userName?: string,
    quantity: number = 1,
  ): Promise<
    ServiceResult<{
      success: true;
      message: string;
      newPoints: number;
      tickets: Array<{ id: number; redemptionToken: string }>;
    }>
  > {
    if (quantity < 1) return fail("Quantity must be at least 1", 400);
    if (quantity > 10) return fail("Maximum 10 tickets per purchase", 400);

    // 1. Fetch user
    const user = await db.query.usersTable.findFirst({
      where: eq(usersTable.id, userId),
    });
    if (!user) return fail("User not found", 404);

    // 2. Retrieve the specific access type
    const accessType = await db.query.accessTypesTable.findFirst({
      where: and(
        eq(accessTypesTable.id, accessTypeId),
        eq(accessTypesTable.eventId, eventId),
      ),
    });
    if (!accessType) {
      return fail("Selected access type does not belong to this event", 400);
    }

    const pointCost = accessType.pointCost;
    const totalCost = pointCost * quantity;

    if (user.points < totalCost) {
      return fail(
        `Insufficient points. You need ${totalCost} points to redeem ${quantity} ticket(s).`,
        400,
      );
    }

    // 3. Atomic points deduction and ticket inserts
    let updatedPoints: number;

    try {
      const transactionResult = await db.transaction(async (tx) => {
        const [updatedUser] = await tx
          .update(usersTable)
          .set({ points: sql`${usersTable.points} - ${totalCost}` })
          .where(
            and(
              eq(usersTable.id, user.id),
              gte(usersTable.points, totalCost),
            ),
          )
          .returning({ points: usersTable.points });

        if (!updatedUser) {
          throw new Error("Insufficient points");
        }

        const ticketsToInsert = Array.from({ length: quantity }, () => ({
          userId: user.id,
          eventId: eventId,
          accessTypeId: accessTypeId,
          status: "active" as const,
        }));

        const inserted = await tx
          .insert(userTicketsTable)
          .values(ticketsToInsert)
          .returning({
            id: userTicketsTable.id,
            redemptionToken: userTicketsTable.redemptionToken,
          });

        return {
          newPoints: updatedUser.points,
          tickets: inserted.map((t) => ({ id: t.id, redemptionToken: t.redemptionToken })),
        };
      });

      updatedPoints = transactionResult.newPoints;

      // 4. Send confirmation email (silent on failure)
      if (userEmail) {
        const event = await db.query.eventsTable.findFirst({
          where: eq(eventsTable.id, Number(eventId)),
        });

        if (event && transactionResult.tickets.length > 0) {
          sendEmail({
            to: userEmail,
            subject: `${quantity > 1 ? `${quantity}x Tickets` : "Ticket"} Confirmed for ${event.title} – Arbitary`,
            html: bookingConfirmationHtml(
              userName || "there",
              event.title,
              transactionResult.tickets.map((t) => t.id),
              event.eventDate,
              quantity,
            ),
          }).catch((err) => console.error("Silent error: Failed to send booking email:", err));
        }
      }

      return ok({
        success: true,
        message: quantity > 1
          ? `${quantity} tickets redeemed successfully!`
          : "Ticket redeemed successfully!",
        newPoints: updatedPoints,
        tickets: transactionResult.tickets,
      });
    } catch (error: any) {
      if (error.message === "Insufficient points") {
        return fail("Insufficient points to complete this transaction.", 400);
      }
      throw error;
    }
  },

  async lookupTicket(
    token: string,
  ): Promise<ServiceResult<TicketWithDetails>> {
    const ticket = await db.query.userTicketsTable.findFirst({
      where: eq(userTicketsTable.redemptionToken, token),
      with: { event: true, user: true, accessType: true },
    });

    if (!ticket) return fail("Ticket not found", 404);

    return ok({
      id: ticket.id,
      status: ticket.status,
      redemptionToken: ticket.redemptionToken,
      event: ticket.event
        ? {
          title: ticket.event.title,
          eventDate: formatDate(ticket.event.eventDate),
          venue: ticket.event.venue,
        }
        : null,
      user: {
        name: ticket.user?.name || null,
        email: ticket.user?.email ?? "",
      },
      accessType: ticket.accessType
        ? { title: ticket.accessType.title }
        : null,
    });
  },

  async verifyAndRedeemTicket(
    token: string,
    adminId: number,
  ): Promise<ServiceResult<{ message: string; alreadyRedeemed?: boolean; redeemedAt?: string }>> {
    const ticket = await db.query.userTicketsTable.findFirst({
      where: eq(userTicketsTable.redemptionToken, token),
      with: { event: true, user: true, accessType: true },
    });

    if (!ticket) return fail("Ticket not found", 404);
    if (ticket.status === "used") {
      return ok({
        message: "Ticket has already been redeemed",
        alreadyRedeemed: true,
        redeemedAt: ticket.redeemedAt ? ticket.redeemedAt.toISOString() : undefined,
      });
    }

    await db
      .update(userTicketsTable)
      .set({
        status: "used",
        redeemedBy: adminId,
        redeemedAt: new Date(),
      })
      .where(eq(userTicketsTable.id, ticket.id));

    return ok({ message: "Ticket redeemed successfully" });
  },

  async sendExpiredTicketEmail(
    ticketId: number,
    userEmail?: string,
    userName?: string,
  ): Promise<ServiceResult<{ success: boolean; message: string }>> {
    const ticket = await db.query.userTicketsTable.findFirst({
      where: eq(userTicketsTable.id, ticketId),
      with: { event: true },
    });

    if (!ticket || !ticket.event) {
      return fail("Ticket not found", 404);
    }

    if (!userEmail) return fail("User email is required", 400);

    const emailSent = await sendEmail({
      to: userEmail,
      subject: "Your Arbitary Event Ticket Has Expired",
      html: expiredTicketHtml(
        userName || "there",
        ticketId,
        ticket.event.title,
      ),
    });

    return ok({
      success: emailSent,
      message: emailSent
        ? "Email sent successfully"
        : "Failed to send email",
    });
  },
};

function bookingConfirmationHtml(
  name: string,
  eventTitle: string,
  ticketIds: number[],
  eventDate: Date | string,
  quantity: number,
): string {
  const ticketList = ticketIds
    .map((id) => `<li>Ticket #${id.toString().padStart(6, "0")}</li>`)
    .join("");
  return `
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #000; color: #FACC15; padding: 20px; border-radius: 8px; text-align: center; }
          .content { background: #f9f9f9; padding: 20px; margin: 20px 0; border-radius: 8px; }
          .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
          .button { background: #000; color: #FACC15; padding: 10px 20px; border-radius: 5px; text-decoration: none; display: inline-block; margin: 10px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>ARBITARY</h1>
            <p>Ticket${quantity > 1 ? "s" : ""} Confirmed</p>
          </div>
          <div class="content">
            <p>Hi ${name},</p>
            <p>Your ticket${quantity > 1 ? "s" : ""} for <strong>${eventTitle}</strong> ${quantity > 1 ? "are" : "is"} confirmed!</p>
            <p><strong>Quantity:</strong> ${quantity}</p>
            <ul>${ticketList}</ul>
            <p><strong>Date:</strong> ${new Date(eventDate).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
            <p>You can view your tickets anytime in your profile.</p>
            <p><a href="${process.env.NEXTAUTH_URL}/profile" class="button">View My Tickets</a></p>
          </div>
          <div class="footer">
            <p>© 2026 Arbitary. All rights reserved.</p>
            <p>This is an automated email. Please do not reply directly.</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

function expiredTicketHtml(
  name: string,
  ticketId: number,
  eventTitle: string,
): string {
  return `
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #000; color: #FACC15; padding: 20px; border-radius: 8px; text-align: center; }
          .content { background: #f9f9f9; padding: 20px; margin: 20px 0; border-radius: 8px; }
          .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
          .button { background: #000; color: #FACC15; padding: 10px 20px; border-radius: 5px; text-decoration: none; display: inline-block; margin: 10px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>ARBITARY</h1>
            <p>Event Ticket Notification</p>
          </div>
          <div class="content">
            <p>Hi ${name},</p>
            <p>Your ticket for <strong>${eventTitle}</strong> (Ticket #${ticketId.toString().padStart(6, "0")}) has expired and has been archived.</p>
            <p><strong>What happens next:</strong></p>
            <ul>
              <li>This ticket is no longer valid for event entry</li>
              <li>You can view your ticket history in your profile</li>
              <li>Earn more points to redeem tickets for upcoming events!</li>
            </ul>
            <p><a href="${process.env.NEXTAUTH_URL}/profile" class="button">View My Tickets</a></p>
          </div>
          <div class="footer">
            <p>© 2026 Arbitary. All rights reserved.</p>
            <p>This is an automated email. Please do not reply directly.</p>
          </div>
        </div>
      </body>
    </html>
  `;
}
