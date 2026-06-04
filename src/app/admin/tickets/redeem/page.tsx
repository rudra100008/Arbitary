"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface TicketData {
  id: number;
  status: string;
  event: { title: string; eventDate: string; venue: string | null } | null;
  user: { name: string | null; email: string };
  accessType: { title: string } | null;
  redemptionToken: string;
}

export default function TicketRedeemPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [ticket, setTicket] = useState<TicketData | null>(null);
  const [loading, setLoading] = useState(true);
  const [redeeming, setRedeeming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError("No redemption token provided");
      setLoading(false);
      return;
    }
    fetch(`/api/admin/tickets/lookup?token=${encodeURIComponent(token)}`)
      .then((res) => {
        if (!res.ok) throw new Error("Ticket not found");
        return res.json();
      })
      .then((data) => {
        setTicket(data.ticket);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [token]);

  const handleRedeem = async () => {
    if (!token) return;
    setRedeeming(true);
    try {
      const res = await fetch("/api/admin/tickets/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to redeem");
        return;
      }
      toast.success("Ticket redeemed successfully!");
      setTicket((prev) => prev ? { ...prev, status: "used" } : null);
    } catch {
      toast.error("Failed to redeem ticket");
    } finally {
      setRedeeming(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gray-200 border-t-slate-900 rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-200 text-center max-w-md">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Invalid Ticket</h2>
          <p className="text-sm text-gray-500">{error || "Ticket not found"}</p>
        </div>
      </div>
    );
  }

  const isUsed = ticket.status === "used";

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-sm border border-gray-200 max-w-md w-full overflow-hidden">
        <div className={`p-6 ${isUsed ? "bg-gray-100" : "bg-[#FACC15]"} transition-colors`}>
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-black/60">
              Ticket #{ticket.id.toString().padStart(6, "0")}
            </span>
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                isUsed
                  ? "bg-gray-200 text-gray-600"
                  : "bg-black text-[#FACC15]"
              }`}
            >
              {isUsed ? "Used" : "Active"}
            </span>
          </div>
          <h1 className="text-2xl font-black text-black mb-1">{ticket.event?.title || "Unknown Event"}</h1>
          {ticket.event && (
            <p className="text-sm text-black/70">
              {new Date(ticket.event.eventDate).toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          )}
          {ticket.event?.venue && (
            <p className="text-sm text-black/70 mt-1">📍 {ticket.event.venue}</p>
          )}
        </div>

        <div className="p-6 space-y-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Attendee</p>
            <p className="font-bold text-slate-900">{ticket.user.name || "N/A"}</p>
            <p className="text-sm text-gray-500">{ticket.user.email}</p>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Ticket Type</p>
            <p className="font-semibold text-slate-900">{ticket.accessType?.title || "General Admission"}</p>
          </div>

          {isUsed ? (
            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 text-center">
              <p className="text-sm font-semibold text-gray-600">✓ Already Redeemed</p>
            </div>
          ) : (
            <button
              onClick={handleRedeem}
              disabled={redeeming}
              className="w-full py-3 bg-black text-white font-black text-sm uppercase tracking-wider rounded-2xl hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {redeeming ? "Redeeming..." : "Confirm Redemption"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
