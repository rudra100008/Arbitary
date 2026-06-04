import { db } from "@/src/db";
import {
  usersTable,
  userTicketsTable,
  eventsTable,
  accessTypesTable,
} from "@/src/db/schema";
import { eq, desc, and } from "drizzle-orm";
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
    userEmail?: string,
    userName?: string,
  ): Promise<
    ServiceResult<{
      success: true;
      message: string;
      newPoints: number;
    }>
  > {
    const user = await db.query.usersTable.findFirst({
      where: eq(usersTable.id, userId),
    });
    if (!user) return fail("User not found", 404);

    if (user.points < 100) {
      return fail(
        "Insufficient points. You need 100 points to redeem a ticket.",
        400,
      );
    }

    const allAccessTypes = await db.query.accessTypesTable.findMany({
      where: eq(accessTypesTable.eventId, eventId),
    });
    const generalType = allAccessTypes.find((at) =>
      at.title.toLowerCase().includes("general"),
    );
    const accessTypeId = generalType?.id || allAccessTypes[0]?.id;

    if (!accessTypeId) {
      return fail("No available access types for this event", 400);
    }

    let newTicketId: number;

    await db.transaction(async (tx) => {
      await tx
        .update(usersTable)
        .set({ points: user.points - 100 })
        .where(eq(usersTable.id, user.id));

      const [ticket] = await tx
        .insert(userTicketsTable)
        .values({
          userId: user.id,
          eventId: eventId,
          accessTypeId: accessTypeId,
          status: "active",
        })
        .returning();

      newTicketId = ticket.id;
    });

    if (userEmail) {
      const event = await db.query.eventsTable.findFirst({
        where: eq(eventsTable.id, Number(eventId)),
      });

      if (event) {
        sendEmail({
          to: userEmail,
          subject: `Ticket Confirmed for ${event.title} – Arbitary`,
          html: bookingConfirmationHtml(
            userName || "there",
            event.title,
            newTicketId!,
            event.eventDate,
          ),
        }).catch((err) => console.error("Failed to send booking email:", err));
      }
    }

    return ok({
      success: true,
      message: "Ticket redeemed successfully!",
      newPoints: user.points - 100,
    });
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
  ): Promise<ServiceResult<{ message: string }>> {
    const ticket = await db.query.userTicketsTable.findFirst({
      where: eq(userTicketsTable.redemptionToken, token),
      with: { event: true, user: true, accessType: true },
    });

    if (!ticket) return fail("Ticket not found", 404);
    if (ticket.status === "used") {
      return fail("Ticket has already been redeemed", 409);
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
  ticketId: number,
  eventDate: Date | string,
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
            <p>Ticket Confirmed</p>
          </div>
          <div class="content">
            <p>Hi ${name},</p>
            <p>Your ticket for <strong>${eventTitle}</strong> is confirmed!</p>
            <p><strong>Ticket #${ticketId.toString().padStart(6, "0")}</strong></p>
            <p><strong>Date:</strong> ${new Date(eventDate).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
            <p>You can view your ticket anytime in your profile.</p>
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
            <p><a href="${process.env.NEXTAUTH_URL}/profile/tickets" class="button">View My Tickets</a></p>
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
