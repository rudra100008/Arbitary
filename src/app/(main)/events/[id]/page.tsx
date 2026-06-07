"use client";

import Link from "next/link";
import Header from "@/src/components/ui/header";
import Footer from "@/src/components/ui/footer";
import { useSession } from "next-auth/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Calendar, MapPin, Minus, Plus, X } from "lucide-react";
import { useParams } from "next/navigation";
import { useState, useMemo, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import type {
  Event,
  AccessType,
  TimelineItem,
  ContentSection,
  MediaItem,
} from "@/src/types/db";

const DownloadTicketButton = dynamic(
  () => import("@/src/components/tickets/DownloadTicketButton"),
  { ssr: false },
);

interface EventWithRelations extends Event {
  accessTypes: AccessType[];
  timelineItems: TimelineItem[];
  contentSections: (ContentSection & { mediaItems: MediaItem[] })[];
}

interface TicketData {
  id: number;
  redemptionToken: string;
}

const EventContentPage = () => {
  const params = useParams();
  const eventId = params.id as string;
  const { data: session } = useSession();
  // Fetch user points
  const { data: pointsData } = useQuery<{ points: number }>({
    queryKey: ["user-points"],
    queryFn: async () => {
      const res = await fetch("/api/user/points");
      if (!res.ok) throw new Error("Failed to fetch points");
      return res.json();
    },
    enabled: !!session?.user,
  });
  const totalPoints = pointsData?.points ?? 0;
  const queryClient = useQueryClient();

  const { data: event, isLoading } = useQuery<EventWithRelations>({
    queryKey: ["event", eventId],
    queryFn: async () => {
      const res = await fetch(`/api/events/${eventId}`);
      const data = await res.json();
      if (!data.success) throw new Error("Event not found");
      return data.event;
    },
    enabled: !!eventId,
  });

  const [selection, setSelection] = useState<{ eventId: number; accessTypeId: number | null }>({ eventId: 0, accessTypeId: null });
  const selectedAccessTypeId = useMemo(() => {
    if (!event?.accessTypes?.length) return null;
    if (selection.eventId === event.id) return selection.accessTypeId;
    const general = event.accessTypes.find((at) =>
      at.title.toLowerCase().includes("general"),
    );
    return general ? general.id : event.accessTypes[0].id;
  }, [event, selection]);

  const [showQuantityModal, setShowQuantityModal] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [purchasedTickets, setPurchasedTickets] = useState<TicketData[] | null>(null);
  const modalOverlayRef = useRef<HTMLDivElement>(null);

  const selectedTier = useMemo(() => {
    if (!selectedAccessTypeId || !event?.accessTypes) return null;
    return event.accessTypes.find((t) => t.id === selectedAccessTypeId) || null;
  }, [event, selectedAccessTypeId]);

  const selectedCost = selectedTier?.pointCost ?? 0;
  const totalCost = selectedCost * quantity;
  const canAfford = totalPoints >= totalCost;
  const maxQuantity = selectedCost > 0 ? Math.min(10, Math.floor(totalPoints / selectedCost)) : 1;

  // Mutation for redeeming ticket
  const { mutate: redeemTicket, isPending: isRedeeming } = useMutation({
    mutationFn: async ({
      eventId,
      accessTypeId,
      quantity: qty,
    }: {
      eventId: number;
      accessTypeId: number;
      quantity: number;
    }) => {
      const res = await fetch("/api/tickets/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId: String(eventId), accessTypeId: String(accessTypeId), quantity: qty }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to redeem ticket");
      }
      return res.json();
    },
    onSuccess: (data) => {
      setShowQuantityModal(false);
      setPurchasedTickets(data.tickets);
      toast.success(
        data.tickets?.length > 1
          ? `${data.tickets.length} tickets added to your profile!`
          : "Ticket added to your profile!",
        { duration: 5000 },
      );
      queryClient.invalidateQueries({ queryKey: ["user-tickets"] });
      queryClient.invalidateQueries({ queryKey: ["user-points"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Redemption failed");
    },
  });

  const handleOpenModal = useCallback(() => {
    setQuantity(1);
    setShowQuantityModal(true);
  }, []);

  const handleModalBackdrop = useCallback((e: React.MouseEvent) => {
    if (e.target === modalOverlayRef.current) setShowQuantityModal(false);
  }, []);

  const handleConfirm = useCallback(() => {
    if (!selectedAccessTypeId || !event) return;
    redeemTicket({ eventId: event.id, accessTypeId: selectedAccessTypeId, quantity });
  }, [selectedAccessTypeId, event, quantity, redeemTicket]);

  if (isLoading) {
    return (
      <div className="bg-white min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#FACC15] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="bg-white min-h-screen flex flex-col items-center justify-center space-y-6">
        <h1 className="text-4xl font-black uppercase tracking-tighter">
          Event Not Found
        </h1>
        <Link
          href="/events"
          className="px-8 py-4 bg-black text-white font-black uppercase tracking-widest rounded-xl"
        >
          Back to Events
        </Link>
      </div>
    );
  }

  const formatDate = (dateStr: Date | string) => {
    if (!dateStr) return "---";
    return new Date(dateStr)
      .toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
      .toUpperCase();
  };

  return (
    <div className="bg-white text-black min-h-screen selection:bg-[#FACC15] selection:text-black">
      <Header />

      <main>
        {/* Full-Page Hero Image */}
        <section className="relative w-full h-[90vh] overflow-hidden bg-black">
          <img
            src={
              event.heroImageUrl ||
              "https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=2070&auto=format&fit=crop"
            }
            alt={event.title}
            className="w-full h-full object-cover opacity-80"
          />

          {/* Enhanced Bottom-to-Top Fade */}
          <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-black/40" />

          {/* Hero Content: Top-Center Aligned */}
          <div className="absolute inset-0 flex flex-col items-center pt-44">
            <div className="container mx-auto px-6 text-center animate-fade-in">
              <span className="bg-[#FACC15] text-black text-[10px] font-black px-6 py-2 rounded-full tracking-[0.3em] uppercase mb-8 inline-block shadow-2xl">
                {event.eventType}
              </span>
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-black tracking-tighter uppercase leading-[0.8] text-white drop-shadow-2xl max-w-6xl mx-auto">
                {event.title}
              </h1>
            </div>
          </div>

          {/* Back Button Floating */}
          <div className="absolute top-32 left-10 z-20">
            <Link
              href="/events"
              className="flex items-center gap-2 text-white/80 hover:text-[#FACC15] font-bold uppercase tracking-widest text-[10px] transition-all group px-4 py-2 bg-black/20 backdrop-blur-md rounded-full border border-white/10"
            >
              <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
              Back
            </Link>
          </div>
        </section>

        {/* Content Section Below Image */}
        <div className="container mx-auto px-6 py-24">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
            {/* Left Column: Description & Highlights */}
            <div className="lg:col-span-9 space-y-16">
              <div className="flex flex-wrap gap-12 border-b border-black/5 pb-12">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-zinc-50 border border-black/5 flex items-center justify-center text-[#FACC15]">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                      Date
                    </p>
                    <p className="font-black text-xl">
                      {formatDate(event.eventDate)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-zinc-50 border border-black/5 flex items-center justify-center text-[#FACC15]">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                      Location
                    </p>
                    <p className="font-black text-xl">{event.venue}</p>
                  </div>
                </div>
              </div>

              <div className="prose prose-2xl max-w-none">
                <p className="text-zinc-500 leading-relaxed whitespace-pre-line text-xl italic font-medium">
                  {event.description}
                </p>
              </div>
            </div>

            {/* Right Column: Sticky Sidebar / Action Area */}
            <div className="lg:col-span-3 lg:sticky lg:top-32 h-fit space-y-6">
              {event.accessTypes && event.accessTypes.length > 0 && (
                <div className="p-6 bg-black rounded-3xl text-white shadow-2xl">
                  <h3 className="text-lg font-black uppercase tracking-tighter mb-6">
                    SECURE YOUR ACCESS
                  </h3>
                  <div className="space-y-4 mb-8">
                    {event.accessTypes.map((type: AccessType) => {
                      const isSelected = selectedAccessTypeId === type.id;
                      const pointCost = type.pointCost;
                      return (
                        <button
                          key={type.id}
                          onClick={() => setSelection({ eventId: event.id, accessTypeId: type.id })}
                          className={`w-full flex justify-between items-center p-4 rounded-xl border transition-all duration-300 ${
                            isSelected
                              ? "border-[#FACC15] bg-[#FACC15]/10 text-white"
                              : "border-white/10 bg-white/5 text-zinc-400 hover:border-white/30"
                          }`}
                        >
                          <div className="flex flex-col text-left">
                            <span className="font-bold uppercase text-[11px] tracking-widest">
                              {type.title}
                            </span>
                            <span className="text-[9px] text-zinc-500 mt-1">
                              {type.price}
                            </span>
                          </div>
                          <span className="text-lg font-black text-[#FACC15]">
                            {pointCost} Pts
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Purchase / Download section */}
                  <div className="mt-4 p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest text-center">
                      Rewards Member
                    </p>

                    {purchasedTickets ? (
                      <div className="space-y-3">
                        <p className="text-xs text-emerald-400 font-bold text-center">
                          {purchasedTickets.length} ticket{purchasedTickets.length > 1 ? "s" : ""} purchased
                        </p>
                        <DownloadTicketButton
                          tickets={purchasedTickets}
                          event={{
                            title: event.title,
                            eventDate: event.eventDate instanceof Date ? event.eventDate.toISOString() : String(event.eventDate),
                            venue: event.venue,
                            description: event.description,
                            heroImageUrl: event.heroImageUrl,
                          }}
                          user={{
                            name: session?.user?.name || null,
                            email: session?.user?.email || "",
                          }}
                          accessType={selectedTier?.title || "General Admission"}
                          label={`Download ${purchasedTickets.length > 1 ? `All (${purchasedTickets.length})` : "PDF"}`}
                        />
                      </div>
                    ) : (
                      <button
                        onClick={handleOpenModal}
                        disabled={!selectedAccessTypeId}
                        className={`w-full py-3 rounded-xl font-black uppercase tracking-widest text-xs transition-all duration-300
                          ${
                            !selectedAccessTypeId
                              ? "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                              : "bg-white text-black hover:bg-[#FACC15] hover:scale-[1.02]"
                          }`}
                      >
                        {selectedCost > 0 ? `Redeem for ${selectedCost} Pts` : "Redeem"}
                      </button>
                    )}
                  </div>
                  <p className="text-[9px] text-zinc-500 text-center mt-4 uppercase tracking-widest font-bold">
                    Limited capacity
                  </p>
                </div>
              )}

              {/* ── Quantity Modal ── */}
              {showQuantityModal && (
                <div
                  ref={modalOverlayRef}
                  onClick={handleModalBackdrop}
                  className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
                >
                  <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl animate-fade-in">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-lg font-black uppercase tracking-tight text-slate-900">
                        Select Quantity
                      </h3>
                      <button
                        onClick={() => setShowQuantityModal(false)}
                        className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center hover:bg-zinc-200 transition-colors"
                      >
                        <X className="w-4 h-4 text-zinc-500" />
                      </button>
                    </div>

                    {selectedTier && (
                      <div className="mb-6 p-3 rounded-2xl bg-zinc-50 border border-zinc-100">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-bold text-zinc-600 uppercase tracking-wider">
                            {selectedTier.title}
                          </span>
                          <span className="text-sm font-black text-slate-900">
                            {selectedCost} pts each
                          </span>
                        </div>
                        <p className="text-[10px] text-zinc-400">
                          Your balance: <span className="font-bold text-slate-900">{totalPoints} pts</span>
                        </p>
                      </div>
                    )}

                    {/* Quantity selector */}
                    <div className="flex items-center justify-center gap-6 mb-6">
                      <button
                        onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                        disabled={quantity <= 1}
                        className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all
                          ${quantity <= 1
                            ? "border-zinc-100 text-zinc-300 cursor-not-allowed"
                            : "border-slate-900 text-slate-900 hover:bg-slate-900 hover:text-white"
                          }`}
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="text-4xl font-black text-slate-900 w-12 text-center">
                        {quantity}
                      </span>
                      <button
                        onClick={() => setQuantity((q) => Math.min(maxQuantity, q + 1))}
                        disabled={quantity >= maxQuantity}
                        className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all
                          ${quantity >= maxQuantity
                            ? "border-zinc-100 text-zinc-300 cursor-not-allowed"
                            : "border-slate-900 text-slate-900 hover:bg-slate-900 hover:text-white"
                          }`}
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Total */}
                    <div className="p-4 rounded-2xl bg-black text-white mb-6">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-bold">
                          Total
                        </span>
                        <span className="text-lg font-black text-[#FACC15]">
                          {totalCost} pts
                        </span>
                      </div>
                      <p className="text-[9px] text-zinc-500">
                        {quantity} × {selectedCost} pts
                      </p>
                      <div className={`mt-2 text-[9px] font-bold uppercase tracking-wider ${canAfford ? "text-emerald-400" : "text-red-400"}`}>
                        {canAfford ? "Sufficient points" : `Need ${totalCost - totalPoints} more points`}
                      </div>
                    </div>

                    <button
                      onClick={handleConfirm}
                      disabled={isRedeeming || !canAfford}
                      className={`w-full py-3 rounded-xl font-black uppercase tracking-widest text-xs transition-all duration-300
                        ${isRedeeming || !canAfford
                          ? "bg-zinc-200 text-zinc-400 cursor-not-allowed"
                          : "bg-black text-white hover:bg-slate-800 active:scale-[0.97]"
                        }`}
                    >
                      {isRedeeming
                        ? "Processing..."
                        : !canAfford
                          ? "Insufficient Points"
                          : `Confirm Purchase (${quantity})`}
                    </button>
                  </div>
                </div>
              )}

              {event.timelineItems && event.timelineItems.length > 0 && (
                <div className="p-6 bg-zinc-50 rounded-3xl border border-black/5">
                  <h3 className="text-sm font-black uppercase tracking-widest mb-6">
                    EVENT TIMELINE
                  </h3>
                  <div className="space-y-6">
                    {event.timelineItems.map(
                      (item: TimelineItem, i: number) => (
                        <div key={i} className="flex gap-4 items-start">
                          <span className="text-[10px] font-black text-[#FACC15] bg-black px-2 py-1 rounded-md min-w-[60px] text-center">
                            {item.time}
                          </span>
                          <p className="text-[11px] font-bold text-zinc-800 uppercase tracking-tight leading-tight">
                            {item.description}
                          </p>
                        </div>
                      ),
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default EventContentPage;
