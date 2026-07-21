import { useQuery, useMutation } from "@tanstack/react-query";
import React, { useEffect, useRef } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useSession } from "next-auth/react";

const DownloadTicketButton = dynamic(
  () => import("@/src/components/tickets/DownloadTicketButton"),
  { ssr: false },
);

interface Ticket {
  id: number;
  eventId: number;
  status: string;
  redeemedAt: string;
  redemptionToken: string;
  event: {
    id: number;
    title: string;
    eventDate: string;
    heroImageUrl: string | null;
    venue: string | null;
    description: string | null;
  };
  accessType?: {
    id: number;
    title: string;
  };
  user?: {
    id: number;
    name: string | null;
    email: string | null;
  };
}

export default function TicketsTab() {
  const { data: session } = useSession();
  const notifiedTickets = useRef<Set<number>>(new Set());

  const sendEmailMutation = useMutation({
    mutationFn: async (ticketId: number) => {
      const res = await fetch("/api/user/send-expired-ticket-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketId }),
      });
      if (!res.ok) throw new Error("Failed to send email");
      return res.json();
    },
    onSuccess: (_data, ticketId) => {
      notifiedTickets.current.add(ticketId);
    },
  });

  const { data, isLoading, error } = useQuery<{ tickets: Ticket[]; serverTime?: string }>({
    queryKey: ["user-tickets"],
    queryFn: async () => {
      const res = await fetch("/api/user/tickets");
      if (!res.ok) throw new Error("Failed to fetch tickets");
      return res.json();
    },
  });

  const sendEmailRef = useRef(sendEmailMutation);

  useEffect(() => {
    sendEmailRef.current = sendEmailMutation;
  });

  useEffect(() => {
    if (data?.tickets && session?.user?.email) {
      const serverTime = data.serverTime || new Date().toISOString();
      data.tickets
        .filter((ticket) => {
          return (
            ticket.event.eventDate < serverTime &&
            ticket.status === "active" &&
            !notifiedTickets.current.has(ticket.id)
          );
        })
        .forEach((ticket) => {
          sendEmailRef.current.mutate(ticket.id, {
            onError: () =>
              console.error("Failed to send email for ticket", ticket.id),
          });
        });
    }
  }, [data?.tickets, session?.user?.email, data?.serverTime]);

  if (isLoading) {
    return (
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 min-h-[400px] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gray-200 border-t-slate-900 rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 min-h-[400px] flex items-center justify-center">
        <p className="text-sm text-red-500 font-medium">
          Failed to load tickets.
        </p>
      </div>
    );
  }

  const tickets = data?.tickets || [];
  const serverTime = data?.serverTime || new Date().toISOString();
  const activeTickets = tickets.filter(
    (t) => t.event.eventDate >= serverTime,
  );
  const expiredCount = tickets.length - activeTickets.length;

  return (
    <div className="flex flex-col gap-4">
      {/* ── Header card ── */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-6 pt-5 pb-6">
          <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white/5" />
          <div className="relative z-10 flex items-center justify-between">
            <div>
              <p className="text-white/50 text-[10px] font-bold uppercase tracking-widest mb-1">
                My Account
              </p>
              <h2 className="text-white text-xl font-black">My Tickets</h2>
              <p className="text-white/40 text-xs mt-1 font-mono">
                {activeTickets.length} active
                {expiredCount > 0 && ` · ${expiredCount} past`}
              </p>
            </div>
            <Link
              href="/events"
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold
                         uppercase tracking-wider bg-[#FACC15] text-black
                         hover:bg-[#eab308] transition-all duration-200 hover:scale-[1.03] active:scale-[0.97]"
            >
              Browse Events
            </Link>
          </div>
        </div>
        <div className="h-3 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative">
          <div className="absolute inset-x-0 bottom-0 h-3 bg-white rounded-t-2xl" />
        </div>

        <div className="px-6 pb-6">
          {/* ── Archived notice ── */}
          {expiredCount > 0 && (
            <div className="mb-5 flex items-start gap-3 px-4 py-3 bg-amber-50 border border-amber-100 rounded-xl">
              <div className="w-5 h-5 rounded-full bg-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                <svg
                  className="w-3 h-3 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div>
                <p className="text-xs font-bold text-amber-900">
                  Past Events Archived
                </p>
                <p className="text-xs text-amber-700 mt-0.5">
                  {expiredCount} event{expiredCount !== 1 ? "s" : ""}{" "}
                  {expiredCount === 1 ? "has" : "have"} passed and been
                  archived. Email confirmation sent.
                </p>
              </div>
            </div>
          )}

          {/* ── Empty state ── */}
          {activeTickets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 gap-3">
              <div className="w-14 h-14 bg-slate-50 border border-gray-100 rounded-2xl flex items-center justify-center">
                <svg
                  className="w-7 h-7 text-gray-300"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"
                  />
                </svg>
              </div>
              <p className="text-sm font-bold text-slate-900">
                No active tickets
              </p>
              <p className="text-xs text-gray-400 text-center max-w-xs">
                {expiredCount > 0
                  ? "All tickets are from past events. Browse upcoming events to get new ones."
                  : "Complete tasks to earn points, then exchange them for event access."}
              </p>
            </div>
          ) : (
            /* ── Ticket grid ── */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeTickets.map((ticket) => (
                <TicketCard key={ticket.id} ticket={ticket} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TicketCard({ ticket }: { ticket: Ticket }) {
  const formattedDate = new Date(ticket.event.eventDate).toLocaleDateString(
    "en-US",
    {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    },
  );

  return (
    <div
      className="group flex flex-col rounded-2xl overflow-hidden border border-gray-100
                    hover:border-[#FACC15] hover:shadow-lg transition-all duration-300"
    >
      {/* ── Dark top: event info ── */}
      <div className="relative bg-slate-900 px-5 pt-5 pb-4 overflow-hidden">
        <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-white/5" />
        <div className="absolute right-10 bottom-0 w-14 h-14 rounded-full bg-[#FACC15]/5" />

        <div className="relative z-10">
          {/* Badges row */}
          <div className="flex items-center justify-between mb-3">
            <span
              className="text-[9px] font-bold tracking-[0.15em] uppercase font-mono
                             bg-white/10 text-white/60 px-2.5 py-1 rounded-full"
            >
              {ticket.accessType?.title || "General"}
            </span>
            <span
              className={`text-[9px] font-bold tracking-[0.15em] uppercase font-mono px-2.5 py-1 rounded-full
              ${
                ticket.status === "active"
                  ? "bg-emerald-500/20 text-emerald-300"
                  : "bg-white/10 text-white/40"
              }`}
            >
              {ticket.status}
            </span>
          </div>

          {/* Title */}
          <h3 className="text-white font-black text-base leading-tight line-clamp-2 mb-3">
            {ticket.event.title}
          </h3>

          {/* Date + Venue */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2 text-white/50 text-xs font-mono">
              <svg
                className="w-3.5 h-3.5 shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              {formattedDate}
            </div>
            {ticket.event.venue && (
              <div className="flex items-center gap-2 text-white/50 text-xs font-mono">
                <svg
                  className="w-3.5 h-3.5 shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                {ticket.event.venue}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Perforation ── */}
      <div className="relative flex items-center bg-slate-900 h-5">
        <div className="w-5 h-5 rounded-full bg-gray-50 border border-gray-100 -ml-2.5 shrink-0" />
        <div className="flex-1 border-t-2 border-dashed border-white/10 mx-1" />
        <div className="w-5 h-5 rounded-full bg-gray-50 border border-gray-100 -mr-2.5 shrink-0" />
      </div>

      {/* ── Yellow stub ── */}
      <div className="bg-[#FACC15] px-5 py-3 flex items-center justify-between">
        <span className="font-mono text-[10px] font-bold text-black/60 tracking-wider uppercase">
          #{ticket.id.toString().padStart(6, "0")}
        </span>
        <div className="flex items-center gap-2">
          {ticket.status === "active" && ticket.redemptionToken && (
            <DownloadTicketButton
              tickets={[{
                id: ticket.id,
                redemptionToken: ticket.redemptionToken,
              }]}
              event={{
                title: ticket.event.title,
                eventDate: ticket.event.eventDate,
                venue: ticket.event.venue,
                description: ticket.event.description,
                heroImageUrl: ticket.event.heroImageUrl,
              }}
              user={{
                name: ticket.user?.name || null,
                email: ticket.user?.email || "",
              }}
              accessType={ticket.accessType?.title || "General Admission"}
            />
          )}
          <Link
            href={`/events/${ticket.eventId}`}
            className="text-[10px] font-bold text-black/70 hover:text-black
                       underline underline-offset-2 transition-colors font-mono uppercase tracking-wider"
          >
            View →
          </Link>
        </div>
      </div>
    </div>
  );
}
