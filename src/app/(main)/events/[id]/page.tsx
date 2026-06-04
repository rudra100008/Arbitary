"use client";

import React from "react";
import Link from "next/link";
import Header from "@/src/components/ui/header";
import Footer from "@/src/components/ui/footer";
import { useSession } from "next-auth/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Calendar, MapPin } from "lucide-react";
import { useParams } from "next/navigation";
import type { Event, AccessType, TimelineItem, ContentSection, MediaItem } from "@/src/types/db";

interface EventWithRelations extends Event {
  accessTypes: AccessType[];
  timelineItems: TimelineItem[];
  contentSections: (ContentSection & { mediaItems: MediaItem[] })[];
}

const EventContentPage = () => {
  const params = useParams();
  const eventId = params.id as string;
  const { data: session } = useSession();
  const [event, setEvent] = React.useState<EventWithRelations | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

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

  // Mutation for redeeming ticket
  const { mutate: redeemTicket, isPending: isRedeeming } = useMutation({
    mutationFn: async (eventId: number) => {
      const res = await fetch("/api/tickets/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId: String(eventId) }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to redeem ticket");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Ticket added to your profile! Check My Tickets.", {
        duration: 5000,
      });
      queryClient.invalidateQueries({ queryKey: ["user-tickets"] });
      queryClient.invalidateQueries({ queryKey: ["user-points"] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Redemption failed");
    },
  });

  React.useEffect(() => {
    if (eventId) {
      fetchEvent(eventId);
    } else {
      setIsLoading(false);
    }
  }, [eventId]);

  const fetchEvent = async (id: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/events/${id}`);
      const data = await res.json();
      if (data.success) {
        setEvent(data.event);
      }
    } catch (error) {
      console.error("Error fetching event details:", error);
    } finally {
      setIsLoading(false);
    }
  };

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
                    {event.accessTypes.map((type: any, i: number) => (
                      <div
                        key={i}
                        className="flex justify-between items-center border-b border-white/10 pb-3"
                      >
                        <span className="text-zinc-400 font-bold uppercase text-[10px] tracking-widest">
                          {type.title}
                        </span>
                        <span className="text-xl font-black text-[#FACC15]">
                          {type.price}
                        </span>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => {
                      if (totalPoints >= 100) {
                        redeemTicket(event.id);
                      } else {
                        toast.error("You need 100 points to redeem a free ticket!");
                      }
                    }}
                    disabled={isRedeeming}
                    className="w-full py-4 bg-[#FACC15] text-black font-black uppercase tracking-[0.2em] rounded-xl hover:bg-white transition-all duration-500 hover:scale-[1.02] text-sm"
                  >
                    {isRedeeming ? "Processing..." : "Book Now / Redeem"}
                  </button>
                  <div className="mt-4 p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest text-center">
                      Rewards Member
                    </p>
                    <button
                      onClick={() => redeemTicket(event.id)}
                      disabled={isRedeeming || totalPoints < 100}
                      className={`w-full py-3 rounded-xl font-black uppercase tracking-widest text-xs transition-all duration-300
                        ${
                          isRedeeming || totalPoints < 100
                            ? "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                            : "bg-white text-black hover:bg-[#FACC15] hover:scale-[1.02]"
                        }`}
                    >
                      {isRedeeming
                        ? "Processing..."
                        : totalPoints < 100
                          ? "Insufficient Points (100 Req.)"
                          : "Redeem for 100 Pts"}
                    </button>
                  </div>
                  <p className="text-[9px] text-zinc-500 text-center mt-4 uppercase tracking-widest font-bold">
                    Limited capacity
                  </p>
                </div>
              )}

              {event.timelineItems && event.timelineItems.length > 0 && (
                <div className="p-6 bg-zinc-50 rounded-3xl border border-black/5">
                  <h3 className="text-sm font-black uppercase tracking-widest mb-6">
                    EVENT TIMELINE
                  </h3>
                  <div className="space-y-6">
                    {event.timelineItems.map((item: any, i: number) => (
                      <div key={i} className="flex gap-4 items-start">
                        <span className="text-[10px] font-black text-[#FACC15] bg-black px-2 py-1 rounded-md min-w-[60px] text-center">
                          {item.time}
                        </span>
                        <p className="text-[11px] font-bold text-zinc-800 uppercase tracking-tight leading-tight">
                          {item.description}
                        </p>
                      </div>
                    ))}
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
