"use client";

import { PDFDownloadLink } from "@react-pdf/renderer";
import TicketPDF from "./TicketPDF";

interface DownloadTicketButtonProps {
  ticket: {
    id: number;
    redemptionToken: string;
  };
  event: {
    title: string;
    eventDate: string;
    venue: string | null;
    description: string | null;
    heroImageUrl: string | null;
  };
  user: {
    name: string | null;
    email: string;
  };
  accessType: string;
}

export default function DownloadTicketButton({ ticket, event, user, accessType }: DownloadTicketButtonProps) {
  return (
    <PDFDownloadLink
      document={
        <TicketPDF
          ticket={ticket}
          event={event}
          user={user}
          accessType={accessType}
        />
      }
      fileName={`ticket-${ticket.id}.pdf`}
      className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white rounded-full text-xs font-semibold hover:bg-slate-800 transition-colors"
    >
      {({ loading }) => (loading ? "Generating..." : "Download PDF")}
    </PDFDownloadLink>
  );
}
