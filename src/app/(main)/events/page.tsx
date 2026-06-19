"use client";

import React from "react";
import { motion } from "framer-motion";
import { MapPin, ArrowRight } from "lucide-react";
import Link from "next/link";
import type { Event } from "@/src/types/db";

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 40 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" as const },
  },
};

export default function EventPage() {
  const [events, setEvents] = React.useState<Event[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchEvents = async () => {
      try {
        const res = await fetch("/api/events");
        const data = await res.json();
        if (data.success) {
          setEvents(data.events);
        }
      } catch (error) {
        console.error("Error fetching events:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchEvents();
  }, []);

  const upcomingEvents = events.filter((e) => e.status === "Upcoming");
  const pastEvents = events.filter((e) => e.status !== "Upcoming");

  const formatDate = (dateStr: Date | string) => {
    if (!dateStr) return { day: "--", month: "---", year: "----" };
    const d = new Date(dateStr);
    return {
      day: d.toLocaleDateString("en-US", { day: "2-digit" }),
      month: d.toLocaleDateString("en-US", { month: "short" }).toUpperCase(),
      year: d.getFullYear().toString(),
    };
  };

  return (
    <div className="bg-white text-black min-h-screen selection:bg-[#FACC15] selection:text-black">
      <main className="pt-20 sm:pt-28 lg:pt-32 pb-20 overflow-hidden">
        {/* Page Header */}
        <section className="container mx-auto px-4 sm:px-6 mb-14 sm:mb-20 lg:mb-32 animate-fade-in">
          <div className="max-w-4xl">
            <span className="inline-block text-[#FACC15] font-bold uppercase tracking-[0.4em] text-xs mb-4 sm:mb-6 px-4 py-2 bg-zinc-50 rounded-full border border-black/5">
              Our Experiences
            </span>
            <h1 className="text-4xl sm:text-6xl lg:text-9xl font-black tracking-tighter uppercase leading-[0.85] mb-6 sm:mb-10">
              Events <br />
              <span className="text-transparent bg-clip-text bg-linear-to-r from-[#FACC15] to-zinc-800">
                & EXPERIENCES
              </span>
            </h1>
            <p className="text-base sm:text-xl lg:text-2xl text-zinc-500 max-w-2xl leading-relaxed italic">
              &quot;Where design meets physical reality. We create moments that
              define the arbitrary.&quot;
            </p>
          </div>
        </section>

        {/* Upcoming Events Section */}
        <section className="container mx-auto px-4 sm:px-6 mb-20 sm:mb-32 lg:mb-40">
          <div className="flex items-center gap-4 sm:gap-8 mb-8 sm:mb-12 lg:mb-16">
            <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black uppercase tracking-tighter whitespace-nowrap">
              UPCOMING <span className="text-[#FACC15]">SHOWS</span>
            </h2>
            <div className="h-0.5 flex-1 bg-black/5" />
          </div>

          <motion.div
            className="grid grid-cols-1 gap-4 lg:gap-12"
            variants={containerVariants}
            initial="hidden"
            animate="show"
          >
            {upcomingEvents.map((event) => {
              const dateInfo = formatDate(event.eventDate);
              return (
                <motion.div
                  key={event.id}
                  variants={cardVariants}
                  whileHover={{ y: -4, transition: { duration: 0.3 } }}
                  className="group relative overflow-hidden border border-black/5 rounded-2xl lg:rounded-[2.5rem] hover:border-black/10 transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]"
                >
                  {/* ── MOBILE CARD (hidden on lg+) ── */}
                  <div className="lg:hidden">
                    {/* Hero image strip */}
                    <div className="relative h-44 sm:h-52 w-full overflow-hidden">
                      <img
                        src={
                          event.heroImageUrl ||
                          "https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=2070&auto=format&fit=crop"
                        }
                        alt={event.title}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                      {/* dark gradient overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

                      {/* Date badge — bottom-left over image */}
                      <div className="absolute bottom-3 left-4 flex items-end gap-1">
                        <span className="text-5xl font-black text-white leading-none tracking-tighter">
                          {dateInfo.day}
                        </span>
                        <div className="flex flex-col mb-1">
                          <span className="text-[11px] font-black uppercase tracking-widest text-[#FACC15] leading-tight">
                            {dateInfo.month}
                          </span>
                          <span className="text-[10px] font-bold text-white/50 leading-tight">
                            {dateInfo.year}
                          </span>
                        </div>
                      </div>

                      {/* Type badge — top-right */}
                      <span className="absolute top-3 right-3 bg-white text-black text-[9px] font-black px-3 py-1 rounded-full tracking-[0.2em] uppercase shadow-lg">
                        {event.eventType}
                      </span>
                    </div>

                    {/* Card body */}
                    <div className="p-4 sm:p-5 bg-white">
                      {/* Venue */}
                      <span className="text-zinc-400 text-[11px] flex items-center gap-1.5 uppercase font-bold tracking-widest mb-2">
                        <MapPin className="w-3 h-3 text-[#FACC15] flex-shrink-0" />
                        {event.venue}
                      </span>

                      {/* Title */}
                      <h3 className="text-xl sm:text-2xl font-black tracking-tighter uppercase leading-tight mb-2">
                        {event.title}
                      </h3>

                      {/* Description */}
                      {event.description && (
                        <p className="text-zinc-400 text-sm leading-relaxed line-clamp-2 mb-4">
                          {event.description}
                        </p>
                      )}

                      {/* CTA */}
                      <Link
                        href={`/events/${event.id}`}
                        className="flex items-center justify-between w-full px-5 py-3.5 bg-black text-white font-black uppercase tracking-[0.15em] rounded-xl hover:bg-[#FACC15] hover:text-black active:scale-95 transition-all duration-300 text-xs group/btn"
                      >
                        View Details
                        <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                      </Link>
                    </div>
                  </div>

                  {/* ── DESKTOP CARD (hidden below lg) ── */}
                  <div className="hidden lg:flex items-center gap-10 p-10 hover:bg-zinc-50 transition-all duration-700">
                    {/* Background Decorative Circle */}
                    <div className="absolute -top-24 -right-24 w-64 h-64 bg-[#FACC15]/5 rounded-full blur-[80px] group-hover:bg-[#FACC15]/10 transition-all duration-700 pointer-events-none" />

                    {/* Image */}
                    <div className="w-56 h-56 bg-zinc-100 rounded-3xl overflow-hidden border border-black/5 flex-shrink-0 relative">
                      <img
                        src={
                          event.heroImageUrl ||
                          "https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=2070&auto=format&fit=crop"
                        }
                        alt={event.title}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-all duration-700" />
                    </div>

                    {/* Date */}
                    <div className="flex flex-col items-center justify-center text-center min-w-[120px] py-4 border-r border-black/5 group-hover:border-[#FACC15]/20 transition-colors pr-8">
                      <span className="text-6xl font-black tracking-tighter leading-none group-hover:scale-110 transition-transform duration-700">
                        {dateInfo.day}
                      </span>
                      <span className="text-sm font-black uppercase tracking-widest text-[#FACC15] mt-3">
                        {dateInfo.month}
                      </span>
                      <span className="text-xs font-bold text-zinc-300 mt-1">
                        {dateInfo.year}
                      </span>
                    </div>

                    {/* Content */}
                    <div className="flex-1 space-y-4">
                      <div className="flex flex-wrap items-center gap-4">
                        <span className="bg-black text-white text-[10px] font-black px-4 py-1.5 rounded-full tracking-[0.2em] uppercase shadow-lg">
                          {event.eventType}
                        </span>
                        <span className="text-zinc-400 text-xs flex items-center gap-2 uppercase font-bold tracking-widest border border-black/5 px-3 py-1.5 rounded-full bg-white">
                          <MapPin className="w-3.5 h-3.5 text-[#FACC15]" />
                          {event.venue}
                        </span>
                      </div>
                      <h3 className="text-4xl font-black tracking-tighter uppercase leading-none">
                        {event.title}
                      </h3>
                      <p className="text-zinc-500 text-base max-w-2xl leading-relaxed font-medium">
                        {event.description}
                      </p>
                    </div>

                    {/* Action */}
                    <div className="flex flex-col items-center justify-center min-w-[180px]">
                      <div className="flex flex-col items-center gap-2 w-full">
                        <Link
                          href={`/events/${event.id}`}
                          className="w-full px-8 py-5 bg-black text-white font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-[#FACC15] hover:text-black hover:scale-[1.02] active:scale-95 transition-all duration-500 shadow-[0_20px_50px_rgba(0,0,0,0.1)] hover:shadow-[0_20px_50px_rgba(250,204,21,0.2)] text-sm text-center"
                        >
                          View Details
                        </Link>
                        <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">
                          Limited spots
                        </p>
                      </div>
                      <Link
                        href={`/events/${event.id}`}
                        className="mt-6 self-end text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 hover:text-black transition-colors flex items-center gap-2 group/details"
                      >
                        View Details
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="group-hover/details:translate-x-1 transition-transform"
                        >
                          <path d="M5 12h14" />
                          <path d="m12 5 7 7-7 7" />
                        </svg>
                      </Link>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </section>

        {/* Completed Events Section */}
        <section className="bg-zinc-50 py-16 sm:py-28 lg:py-40 rounded-t-[2.5rem] sm:rounded-t-[4rem] lg:rounded-t-[5rem]">
          <div className="container mx-auto px-4 sm:px-6">
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 sm:gap-8 mb-12 sm:mb-16 lg:mb-24">
              <div>
                <h2 className="text-3xl sm:text-4xl lg:text-6xl font-black uppercase tracking-tighter leading-none mb-3 sm:mb-4">
                  PAST <span className="text-[#FACC15]">RECAPS</span>
                </h2>
                <p className="text-zinc-400 font-bold uppercase tracking-widest text-xs sm:text-sm">
                  Archived Moments from the Arbitrary Journey
                </p>
              </div>
              <div className="h-[2px] flex-1 bg-black/5 hidden lg:block" />
            </div>

            <motion.div
              className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-8 lg:gap-10"
              variants={containerVariants}
              initial="hidden"
              animate="show"
            >
              {pastEvents.map((event) => {
                const dateInfo = formatDate(event.eventDate);
                return (
                  <motion.div
                    key={event.id}
                    variants={cardVariants}
                    whileHover={{ y: -8, transition: { duration: 0.3 } }}
                    className="relative group p-6 sm:p-8 lg:p-10 bg-white border border-black/5 rounded-[1.5rem] sm:rounded-[2rem] transition-all duration-700 hover:shadow-2xl flex flex-col justify-between min-h-[200px] sm:min-h-[260px] lg:min-h-[280px] overflow-hidden"
                  >
                    <div className="absolute -bottom-10 -right-10 text-[8rem] sm:text-[13rem] lg:text-[15rem] font-black text-black/[0.02] select-none group-hover:text-[#FACC15]/5 transition-colors pointer-events-none">
                      {event.title[0]}
                    </div>

                    <div className="relative z-10">
                      <div className="flex justify-between items-start mb-5 sm:mb-8 lg:mb-10">
                        <div className="bg-zinc-50 p-3 sm:p-4 rounded-2xl border border-black/5 text-center min-w-[64px] sm:min-w-[80px]">
                          <p className="text-2xl sm:text-3xl font-black text-black leading-none">
                            {dateInfo.day}
                          </p>
                          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-1">
                            {dateInfo.month}
                          </p>
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1.5 border border-black/5 rounded-full text-zinc-500 bg-white group-hover:bg-black group-hover:text-white transition-all">
                          {event.status}
                        </span>
                      </div>

                      <h4 className="text-xl sm:text-3xl font-black tracking-tight uppercase group-hover:text-[#FACC15] transition-colors mb-1 sm:mb-2">
                        {event.title}
                      </h4>
                      <p className="text-zinc-400 text-xs uppercase tracking-[0.2em] font-bold">
                        {event.venue}
                      </p>
                    </div>

                    <div className="relative z-10 pt-5 sm:pt-8 lg:pt-10">
                      <Link
                        href={`/events/${event.id}`}
                        className="text-black font-black uppercase tracking-widest text-xs flex items-center gap-3 group/btn"
                      >
                        View Recap
                        <span className="w-8 h-[2px] bg-black group-hover/btn:w-12 group-hover/btn:bg-[#FACC15] transition-all" />
                      </Link>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          </div>
        </section>
      </main>
    </div>
  );
}
