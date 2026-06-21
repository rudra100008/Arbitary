"use client";

import React from "react";
import {
  motion,
  useInView,
  AnimatePresence,
} from "framer-motion";
import { MapPin, ArrowRight, Music2 } from "lucide-react";
import Link from "next/link";
import type { Event } from "@/src/types/db";
import "./events.css";

// ─── Animation Variants ───────────────────────────────────────────────────────

const heroContainerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.15, delayChildren: 0.1 } },
};

const heroItemVariants = {
  hidden: { opacity: 0, y: 28 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, ease: [0.23, 1, 0.32, 1] as const },
  },
};

// ─── Floating Music Note ──────────────────────────────────────────────────────

function FloatingNote({
  className,
  delay = 0,
}: {
  className: string;
  delay?: number;
}) {
  return (
    <motion.span
      aria-hidden="true"
      className={`absolute text-[#FACC15] pointer-events-none select-none ${className}`}
      initial={{ opacity: 0, y: 0 }}
      animate={{ opacity: [0, 0.55, 0.55, 0], y: [-8, 6, -2, -8] }}
      transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut", delay }}
    >
      <Music2 className="w-4 h-4 sm:w-5 sm:h-5" />
    </motion.span>
  );
}

// ─── EQ Bars (identical to records page hero) ────────────────────────────────

function EqBars({ className = "" }: { className?: string }) {
  return (
    <span className={`ev-eq ${className}`} aria-hidden="true">
      <span />
      <span />
      <span />
      <span />
      <span />
      <span />
      <span />
      <span />
      <span />
      <span />
      <span />
      <span />
      <span />
    </span>
  );
}

// Stagger container for card lists
const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12 } },
};

// Upcoming event card — slides up from below
const cardVariants = {
  hidden: { opacity: 0, y: 48 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.23, 1, 0.32, 1] as const },
  },
};

// Past event card — fades in with slight scale
const pastCardVariants = {
  hidden: { opacity: 0, scale: 0.96, y: 24 },
  show: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 0.55, ease: [0.23, 1, 0.32, 1] as const },
  },
};

// Section heading reveal
const headingVariants = {
  hidden: { opacity: 0, x: -24 },
  show: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.6, ease: [0.23, 1, 0.32, 1] as const },
  },
};

// Divider line expands from left
const dividerVariants = {
  hidden: { scaleX: 0, opacity: 0 },
  show: {
    scaleX: 1,
    opacity: 1,
    transition: {
      duration: 0.8,
      ease: [0.23, 1, 0.32, 1] as const,
      delay: 0.2,
    },
  },
};

// ─── Equalizer Bars ─────────────────────────────────────────────────────────

function EqualizerBars({ className = "" }: { className?: string }) {
  const bars = Array.from({ length: 14 });
  return (
    <div className={`flex items-end gap-[3px] ${className}`}>
      {bars.map((_, i) => (
        <motion.span
          key={i}
          className="w-[3px] sm:w-1 bg-[#FACC15] rounded-full"
          style={{ height: "100%", transformOrigin: "bottom" }}
          animate={{ scaleY: [0.25, 1, 0.45, 0.85, 0.25] }}
          transition={{
            duration: 1.1 + (i % 4) * 0.15,
            repeat: Infinity,
            ease: "easeInOut",
            delay: i * 0.06,
          }}
        />
      ))}
    </div>
  );
}

// ─── Scroll-triggered section wrapper ────────────────────────────────────────
// Fires once when the section enters the viewport — mirrors the hero stagger
// but is triggered by scroll, not page load.

function RevealSection({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <motion.div
      ref={ref}
      className={className}
      initial="hidden"
      animate={inView ? "show" : "hidden"}
      variants={containerVariants}
      transition={{ delayChildren: delay }}
    >
      {children}
    </motion.div>
  );
}

// ─── Hero Section ────────────────────────────────────────────────────────────

function EventsHero({ children }: { children: React.ReactNode }) {
  const bgRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const el = bgRef.current;
    if (!el) return;
    let rafId: number;
    const onScroll = () => {
      rafId = requestAnimationFrame(() => {
        const scrollY = window.scrollY;
        const parent = el.parentElement;
        if (parent) {
          const heroBottom = parent.getBoundingClientRect().bottom;
          if (heroBottom > 0) {
            el.style.transform = `translateY(${scrollY * 0.35}px)`;
          }
        }
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <section className="relative h-screen flex items-center overflow-hidden">
      <div ref={bgRef} className="events-hero-bg" />
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-black/30" />
      <div className="absolute inset-0 opacity-10 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px]" />
      <div className="relative z-10 w-full">
        {children}
      </div>
    </section>
  );
}

// ─── Animated count badge ─────────────────────────────────────────────────────
// Counts up from 0 to target when it enters viewport

function CountBadge({ count, label }: { count: number; label: string }) {
  const ref = React.useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true });
  const [displayed, setDisplayed] = React.useState(0);

  React.useEffect(() => {
    if (!inView) return;
    let start = 0;
    const step = Math.ceil(count / 24);
    const id = setInterval(() => {
      start += step;
      if (start >= count) {
        setDisplayed(count);
        clearInterval(id);
      } else setDisplayed(start);
    }, 40);
    return () => clearInterval(id);
  }, [inView, count]);

  return (
    <div ref={ref} className="flex flex-col items-center">
      <span className="text-4xl sm:text-5xl font-black text-[#FACC15] tabular-nums leading-none">
        {displayed}
      </span>
      <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-400 mt-1">
        {label}
      </span>
    </div>
  );
}

// ─── Upcoming Event Card ──────────────────────────────────────────────────────

function UpcomingCard({ event }: { event: Event }) {
  const formatDate = (dateStr: Date | string) => {
    if (!dateStr) return { day: "--", month: "---", year: "----" };
    const d = new Date(dateStr);
    return {
      day: d.toLocaleDateString("en-US", { day: "2-digit" }),
      month: d.toLocaleDateString("en-US", { month: "short" }).toUpperCase(),
      year: d.getFullYear().toString(),
    };
  };

  const dateInfo = formatDate(event.eventDate);

  return (
    <motion.div
      variants={cardVariants}
      whileHover={{ y: -4, transition: { duration: 0.3 } }}
      className="group relative overflow-hidden border border-black/5 lg:border-0 rounded-2xl lg:rounded-[2.5rem] hover:border-black/10 transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]"
    >
      {/* ── MOBILE CARD ── */}
      <div className="lg:hidden">
        <div className="relative h-44 sm:h-52 w-full overflow-hidden">
          <motion.img
            src={
              event.heroImageUrl ||
              "https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=2070&auto=format&fit=crop"
            }
            alt={event.title}
            className="w-full h-full object-cover"
            whileHover={{ scale: 1.05 }}
            transition={{ duration: 0.7, ease: [0.23, 1, 0.32, 1] }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

          {/* Animated date badge */}
          <motion.div
            className="absolute bottom-3 left-4 flex items-end gap-1"
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
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
          </motion.div>

          <span className="absolute top-3 right-3 bg-white text-black text-[9px] font-black px-3 py-1 rounded-full tracking-[0.2em] uppercase shadow-lg">
            {event.eventType}
          </span>
        </div>

        <div className="p-4 sm:p-5 bg-white">
          <span className="text-zinc-400 text-[11px] flex items-center gap-1.5 uppercase font-bold tracking-widest mb-2">
            <MapPin className="w-3 h-3 text-[#FACC15] flex-shrink-0" />
            {event.venue}
          </span>
          <h3 className="text-xl sm:text-2xl font-black tracking-tighter uppercase leading-tight mb-2">
            {event.title}
          </h3>
          {event.description && (
            <p className="text-zinc-400 text-sm leading-relaxed line-clamp-2 mb-4">
              {event.description}
            </p>
          )}
          <Link
            href={`/events/${event.id}`}
            className="flex items-center justify-between w-full px-5 py-3.5 bg-black text-white font-black uppercase tracking-[0.15em] rounded-xl hover:bg-[#FACC15] hover:text-black active:scale-95 transition-all duration-300 text-xs group/btn"
          >
            View Details
            <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>

      {/* ── DESKTOP CARD ── */}
      <div className="hidden lg:block relative h-[320px] xl:h-[360px] rounded-[2.5rem] overflow-hidden">
        {/* Image with zoom on hover */}
        <motion.img
          src={
            event.heroImageUrl ||
            "https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=2070&auto=format&fit=crop"
          }
          alt={event.title}
          className="absolute inset-0 w-full h-full object-cover"
          whileHover={{ scale: 1.06 }}
          transition={{ duration: 0.8, ease: [0.23, 1, 0.32, 1] }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/50 to-black/70" />

        {/* Gold left-edge accent that grows on hover */}
        <motion.div
          className="absolute left-0 top-0 bottom-0 w-1 bg-[#FACC15] origin-top"
          initial={{ scaleY: 0 }}
          whileInView={{ scaleY: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2, ease: [0.23, 1, 0.32, 1] }}
        />

        <div className="relative z-10 h-full flex items-center justify-between gap-8 px-10 xl:px-16 py-10">
          {/* Date — slides in from left */}
          <motion.div
            className="flex flex-col items-start flex-shrink-0"
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{
              duration: 0.6,
              delay: 0.15,
              ease: [0.23, 1, 0.32, 1],
            }}
          >
            <span className="text-6xl xl:text-7xl font-black text-white leading-none tracking-tighter">
              {dateInfo.day}
            </span>
            <span className="text-sm font-bold text-[#FACC15] uppercase tracking-widest mt-3">
              {dateInfo.month} {dateInfo.year}
            </span>
          </motion.div>

          {/* Center title — fades up */}
          <motion.div
            className="flex-1 flex flex-col items-center text-center min-w-0"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{
              duration: 0.6,
              delay: 0.25,
              ease: [0.23, 1, 0.32, 1],
            }}
          >
            <span className="inline-block border border-[#FACC15] text-[#FACC15] text-xs font-bold uppercase tracking-[0.2em] px-5 py-1.5 rounded-full mb-4">
              {event.eventType}
            </span>
            <h3 className="text-4xl xl:text-6xl font-black text-white tracking-tight truncate max-w-full group-hover:text-[#FACC15] transition-colors duration-500">
              {event.title}
            </h3>
          </motion.div>

          {/* Right — slides in from right */}
          <motion.div
            className="flex flex-col items-end gap-3 flex-shrink-0"
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{
              duration: 0.6,
              delay: 0.35,
              ease: [0.23, 1, 0.32, 1],
            }}
          >
            <span className="flex items-center gap-2 text-white font-bold text-lg">
              <MapPin className="w-5 h-5 text-[#FACC15] flex-shrink-0" />
              {event.venue}
            </span>
            <Link
              href={`/events/${event.id}`}
              className="text-[#FACC15] font-bold text-sm flex items-center gap-1.5 hover:gap-3 transition-all duration-300"
            >
              View Details
              <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Past Event Card ──────────────────────────────────────────────────────────

function PastCard({ event }: { event: Event }) {
  const formatDate = (dateStr: Date | string) => {
    if (!dateStr) return { day: "--", month: "---", year: "----" };
    const d = new Date(dateStr);
    return {
      day: d.toLocaleDateString("en-US", { day: "2-digit" }),
      month: d.toLocaleDateString("en-US", { month: "short" }).toUpperCase(),
      year: d.getFullYear().toString(),
    };
  };

  const dateInfo = formatDate(event.eventDate);

  return (
    <motion.div
      variants={pastCardVariants}
      whileHover={{ y: -8, transition: { duration: 0.3 } }}
      className="relative group p-6 sm:p-8 lg:p-10 bg-white border border-black/5 rounded-[1.5rem] sm:rounded-[2rem] transition-all duration-700 hover:shadow-2xl flex flex-col justify-between min-h-[200px] sm:min-h-[260px] lg:min-h-[280px] overflow-hidden"
    >
      {/* Giant background initial — animates colour on hover */}
      <div className="absolute -bottom-10 -right-10 text-[8rem] sm:text-[13rem] lg:text-[15rem] font-black text-black/[0.02] select-none group-hover:text-[#FACC15]/5 transition-colors duration-500 pointer-events-none">
        {event.title[0]}
      </div>

      {/* Gold bottom bar that grows on hover */}
      <motion.div
        className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#FACC15] origin-left"
        initial={{ scaleX: 0 }}
        whileHover={{ scaleX: 1 }}
        transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
      />

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
          <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1.5 border border-black/5 rounded-full text-zinc-500 bg-white group-hover:bg-black group-hover:text-white transition-all duration-300">
            {event.status}
          </span>
        </div>

        <h4 className="text-xl sm:text-3xl font-black tracking-tight uppercase group-hover:text-[#FACC15] transition-colors duration-300 mb-1 sm:mb-2">
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
          <motion.span
            className="h-[2px] bg-black group-hover/btn:bg-[#FACC15] transition-colors duration-300"
            initial={{ width: 32 }}
            whileHover={{ width: 48 }}
            transition={{ duration: 0.3 }}
          />
        </Link>
      </div>
    </motion.div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({ message }: { message: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="flex flex-col items-center justify-center py-24 text-center"
    >
      <EqualizerBars className="h-12 mb-6 opacity-30" />
      <p className="text-zinc-400 font-bold uppercase tracking-widest text-sm">
        {message}
      </p>
    </motion.div>
  );
}

// ─── Loading Skeleton ─────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="space-y-4">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="h-[200px] rounded-[2rem] bg-zinc-100"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
        />
      ))}
    </div>
  );
}

// ─── Section Heading ─────────────────────────────────────────────────────────

function SectionHeading({
  eyebrow,
  title,
}: {
  eyebrow: string;
  title: string;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <div
      ref={ref}
      className="flex items-center gap-6 sm:gap-8 mb-8 sm:mb-12 lg:mb-16"
    >
      <motion.div
        initial="hidden"
        animate={inView ? "show" : "hidden"}
        variants={headingVariants}
      >
        <span className="block text-[#FACC15] font-black uppercase tracking-[0.3em] text-xs sm:text-sm mb-2">
          {eyebrow}
        </span>
        <h2 className="relative inline-block text-2xl sm:text-4xl lg:text-5xl font-black uppercase tracking-tighter whitespace-nowrap">
          {title}
          {/* Underline bar grows in */}
          <motion.span
            className="absolute -bottom-2 left-0 h-1 bg-[#FACC15] rounded-full"
            initial={{ width: 0 }}
            animate={inView ? { width: "5rem" } : { width: 0 }}
            transition={{ duration: 0.6, delay: 0.3, ease: [0.23, 1, 0.32, 1] }}
          />
        </h2>
      </motion.div>
      <motion.div
        className="h-px flex-1 bg-black/10 mt-6 sm:mt-8 origin-left"
        initial="hidden"
        animate={inView ? "show" : "hidden"}
        variants={dividerVariants}
      />
    </div>
  );
}

// ─── Stats Bar ────────────────────────────────────────────────────────────────

function StatsBar({
  upcomingCount,
  pastCount,
}: {
  upcomingCount: number;
  pastCount: number;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });

  return (
    <motion.div
      ref={ref}
      className="flex items-center justify-center gap-12 sm:gap-20 py-10 sm:py-14 border-y border-black/5"
      initial={{ opacity: 0, y: 20 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
    >
      <CountBadge count={upcomingCount} label="Upcoming" />
      <div className="w-px h-10 bg-black/10" />
      <CountBadge count={pastCount} label="Past Events" />
      <div className="w-px h-10 bg-black/10" />
      <CountBadge count={upcomingCount + pastCount} label="Total" />
    </motion.div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function EventPage() {
  const [events, setEvents] = React.useState<Event[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchEvents = async () => {
      try {
        const res = await fetch("/api/events");
        const data = await res.json();
        if (data.success) setEvents(data.events);
      } catch (error) {
        console.error("Error fetching events:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchEvents();
  }, []);

  const now = new Date();
  const upcomingEvents = events.filter((e) => new Date(e.eventDate) >= now);
  const pastEvents = events.filter((e) => new Date(e.eventDate) < now);

  return (
    <div className="bg-white text-black min-h-screen selection:bg-[#FACC15] selection:text-black">
      <main className="pb-20">
        {/* ── Hero with parallax ── */}
        <EventsHero>
          <FloatingNote className="top-16 left-[8%] z-20" delay={0.5} />
          <FloatingNote className="top-24 left-[18%] z-20" delay={1.2} />
          <FloatingNote className="top-12 right-[22%] z-20" delay={2.1} />
          <FloatingNote className="bottom-28 right-[10%] z-20" delay={0.8} />

          <motion.div
            className="container mx-auto px-4 sm:px-6 pb-12 sm:pb-16 lg:pb-20"
            variants={heroContainerVariants}
            initial="hidden"
            animate="show"
          >
            <div className="max-w-4xl">
              <motion.span
                variants={heroItemVariants}
                className="inline-block text-[#FACC15] font-bold uppercase tracking-[0.4em] text-xs mb-4 sm:mb-5 px-5 py-2 bg-black/20 backdrop-blur-sm rounded-full border-2 border-[#FACC15]"
              >
                Our Experiences
              </motion.span>

              <h1 className="text-4xl sm:text-6xl lg:text-7xl xl:text-8xl font-black tracking-tighter uppercase leading-[0.85] mb-5 sm:mb-7 text-white">
                <motion.span variants={heroItemVariants} className="block">
                  Events &amp;
                </motion.span>
                <motion.span
                  variants={heroItemVariants}
                  className="flex items-center gap-4 sm:gap-6"
                >
                  <span className="text-[#FACC15]">EXPERIENCES</span>
                  <span className="hidden sm:inline-flex">
                    <EqBars />
                  </span>
                </motion.span>
              </h1>

              <motion.p
                variants={heroItemVariants}
                className="text-sm sm:text-base lg:text-lg text-zinc-200 max-w-2xl leading-relaxed uppercase font-bold tracking-wide"
              >
                &quot;Where design meets physical reality. We create moments
                that define the arbitrary.&quot;
              </motion.p>
            </div>
          </motion.div>
        </EventsHero>

        {/* ── Stats bar — count-up on scroll ── */}
        {!isLoading && (
          <StatsBar
            upcomingCount={upcomingEvents.length}
            pastCount={pastEvents.length}
          />
        )}

        {/* ── Upcoming Events ── */}
        <section className="container mx-auto px-4 sm:px-6 mb-20 sm:mb-32 lg:mb-40 mt-16 sm:mt-20">
          <SectionHeading eyebrow="Upcoming" title="Events & Shows" />

          <AnimatePresence mode="wait">
            {isLoading ? (
              <motion.div key="loading-upcoming" exit={{ opacity: 0 }}>
                <Skeleton />
              </motion.div>
            ) : upcomingEvents.length === 0 ? (
              <motion.div
                key="empty-upcoming"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <EmptyState message="No upcoming events right now — check back soon." />
              </motion.div>
            ) : (
              <RevealSection
                key="upcoming-list"
                className="grid grid-cols-1 gap-4 lg:gap-12"
              >
                {upcomingEvents.map((event) => (
                  <UpcomingCard key={event.id} event={event} />
                ))}
              </RevealSection>
            )}
          </AnimatePresence>
        </section>

        {/* ── Past Events ── */}
        <section className="bg-zinc-50 py-16 sm:py-28 lg:py-40 rounded-t-[2.5rem] sm:rounded-t-[4rem] lg:rounded-t-[5rem]">
          <div className="container mx-auto px-4 sm:px-6">
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 sm:gap-8 mb-12 sm:mb-16 lg:mb-24">
              <SectionHeading eyebrow="Past" title="Events & Shows" />
              <div className="h-[2px] flex-1 bg-black/5 hidden lg:block" />
            </div>

            <AnimatePresence mode="wait">
              {isLoading ? (
                <motion.div
                  key="loading-past"
                  className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-8 lg:gap-10"
                  exit={{ opacity: 0 }}
                >
                  {[0, 1, 2, 3].map((i) => (
                    <motion.div
                      key={i}
                      className="h-[240px] rounded-[2rem] bg-white border border-black/5"
                      animate={{ opacity: [0.5, 1, 0.5] }}
                      transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        delay: i * 0.15,
                      }}
                    />
                  ))}
                </motion.div>
              ) : pastEvents.length === 0 ? (
                <motion.div
                  key="empty-past"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <EmptyState message="No past events yet." />
                </motion.div>
              ) : (
                <RevealSection
                  key="past-list"
                  className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-8 lg:gap-10"
                >
                  {pastEvents.map((event) => (
                    <PastCard key={event.id} event={event} />
                  ))}
                </RevealSection>
              )}
            </AnimatePresence>
          </div>
        </section>
      </main>
    </div>
  );
}
