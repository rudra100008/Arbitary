"use client";

import { PDFDownloadLink } from "@react-pdf/renderer";
import TicketPDF from "./TicketPDF";

interface TicketData {
  id: number;
  redemptionToken: string;
}

interface DownloadTicketButtonProps {
  tickets: TicketData[];
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
  label?: string;
}

export default function DownloadTicketButton({
  tickets,
  event,
  user,
  accessType,
  label,
}: DownloadTicketButtonProps) {
  if (tickets.length === 0) return null;

  const fileName =
    tickets.length === 1
      ? `ticket-${tickets[0].id}.pdf`
      : `tickets-${event.title.replace(/\s+/g, "-").toLowerCase()}.pdf`;

  return (
    <PDFDownloadLink
      document={
        <TicketPDF
          tickets={tickets}
          event={event}
          user={user}
          accessType={accessType}
        />
      }
      fileName={fileName}
      className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white rounded-full text-xs font-semibold hover:bg-slate-800 transition-colors"
    >
      {({ loading }) =>
        loading
          ? "Generating..."
          : label || (tickets.length > 1
              ? `Download All (${tickets.length})`
              : "Download PDF")
      }
    </PDFDownloadLink>
  );
}
