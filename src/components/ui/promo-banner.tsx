"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { toast } from "sonner";

const BANNER_CONFIG = {
  eventDate: "2026-08-15T20:00:00",
  registerHref: "/participants",
} as const;

const TICKER_ITEMS = [
  "TILT YOUR MUSIC SESSION",
  "✦",
  "MEET YOUR FAVOURITE ARTIST",
  "✦",
  "TUBORG × ARBITARY",
  "✦",
];

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  expired: boolean;
}

function calcTimeLeft(targetDate: string): TimeLeft {
  const diff = new Date(targetDate).getTime() - Date.now();
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, expired: true };
  const totalMinutes = Math.floor(diff / 1000 / 60);
  const days = Math.floor(totalMinutes / 60 / 24);
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;
  return { days, hours, minutes, expired: false };
}

function Particle({ style }: { style: React.CSSProperties }) {
  return (
    <span
      aria-hidden="true"
      className="absolute pointer-events-none select-none"
      style={style}
    >
      ✦
    </span>
  );
}

function ClockIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="10"
      height="10"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function CloseBtn({
  size = 16,
  onDismiss,
}: {
  size?: number;
  onDismiss: () => void;
}) {
  return (
    <button
      onClick={onDismiss}
      aria-label="Dismiss promotional banner"
      className="flex-shrink-0 text-white/70 hover:text-white transition-colors duration-150 p-0.5 rounded"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    </button>
  );
}

function RegisterBtn({ className = "" }: { className?: string }) {
  return (
    <Link
      href={BANNER_CONFIG.registerHref}
      className={`flex-shrink-0 bg-white text-green-700 font-black uppercase tracking-widest rounded-md hover:bg-green-50 transition-colors duration-150 shadow-sm ${className}`}
    >
      PARTICIPATE
    </Link>
  );
}

function Countdown({
  timeLeft,
  className = "",
}: {
  timeLeft: TimeLeft;
  className?: string;
}) {
  const pad = (n: number) => String(n).padStart(2, "0");
  if (!timeLeft.expired) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 text-white font-medium tracking-widest uppercase px-3 py-1 rounded-full ${className}`}
        style={{ background: "rgba(0,0,0,0.3)" }}
        aria-live="polite"
      >
        <ClockIcon />
        CLOSES IN {pad(timeLeft.days)}D {pad(timeLeft.hours)}H
      </span>
    );
  }
  return (
    <span
      className={`text-white/70 font-black uppercase tracking-widest ${className}`}
    >
      EVENT CLOSED
    </span>
  );
}

/**
 * Pure-CSS marquee ticker.
 *
 * How it works:
 * - The outer div clips with overflow-hidden.
 * - Inside, two identical copies of the content sit side by side (inline-flex).
 * - A CSS keyframe translates the whole track from 0 to -50% (exactly one copy width),
 *   then loops — no JS measurement needed, works immediately on paint.
 * - `animation-play-state: paused` on hover lets users read if they want.
 */
function Ticker() {
  const tickerContent = (
    <span className="inline-flex items-center gap-8 pr-8 shrink-0">
      {TICKER_ITEMS.map((item, i) =>
        item === "✦" ? (
          <span key={i} className="text-white/50 text-[8px]" aria-hidden="true">
            ✦
          </span>
        ) : (
          <span
            key={i}
            className="whitespace-nowrap font-medium uppercase tracking-widest text-white text-[10px]"
          >
            {item}
          </span>
        ),
      )}
    </span>
  );

  return (
    <>
      {/* Keyframe injected once — scoped name avoids collisions */}
      <style>{`
        @keyframes promo-marquee {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .promo-ticker-track {
          animation: promo-marquee 18s linear infinite;
          will-change: transform;
        }
        .promo-ticker-track:hover {
          animation-play-state: paused;
        }
      `}</style>

      <div className="overflow-hidden w-full" aria-hidden="true">
        {/* Track = two copies side by side → 200% wide → slide left by 50% = one copy */}
        <div className="promo-ticker-track inline-flex">
          {tickerContent}
          {tickerContent}
        </div>
      </div>
    </>
  );
}

function updateBannerHeight(el: HTMLElement | null) {
  const h = el ? el.getBoundingClientRect().height : 0;
  document.documentElement.style.setProperty("--banner-h", `${h}px`);
}

export default function PromoBanner() {
  const [dismissed, setDismissed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(
    calcTimeLeft(BANNER_CONFIG.eventDate),
  );
  const bannerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || dismissed) return;
    const id = requestAnimationFrame(() =>
      updateBannerHeight(bannerRef.current),
    );
    const onResize = () => updateBannerHeight(bannerRef.current);
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener("resize", onResize);
    };
  }, [mounted, dismissed]);

  useEffect(() => {
    if (dismissed) return;
    const id = setInterval(
      () => setTimeLeft(calcTimeLeft(BANNER_CONFIG.eventDate)),
      30_000,
    );
    return () => clearInterval(id);
  }, [dismissed]);

  const handleDismiss = () => {
    document.documentElement.style.setProperty("--banner-h", "0px");
    setDismissed(true);
    toast.info("Reload the page to see the banner again.", { duration: 4000 });
  };

  if (!mounted || dismissed) return null;

  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <div
      id="promo-banner"
      ref={bannerRef}
      role="banner"
      aria-label="Promotional announcement"
      className="fixed top-0 left-0 right-0 w-full overflow-hidden z-[10000]"
      style={{
        background:
          "linear-gradient(90deg, #15803d 0%, #16a34a 30%, #22c55e 60%, #15803d 100%)",
      }}
    >
      <Particle
        style={{
          top: "4px",
          left: "3%",
          fontSize: "8px",
          color: "rgba(255,255,255,0.5)",
        }}
      />
      <Particle
        style={{
          top: "2px",
          left: "12%",
          fontSize: "6px",
          color: "rgba(255,255,255,0.35)",
        }}
      />
      <Particle
        style={{
          bottom: "4px",
          left: "22%",
          fontSize: "7px",
          color: "rgba(255,255,255,0.4)",
        }}
      />
      <Particle
        style={{
          top: "3px",
          left: "42%",
          fontSize: "5px",
          color: "rgba(255,255,255,0.3)",
        }}
      />
      <Particle
        style={{
          bottom: "3px",
          left: "55%",
          fontSize: "9px",
          color: "rgba(255,255,255,0.45)",
        }}
      />
      <Particle
        style={{
          top: "5px",
          right: "32%",
          fontSize: "6px",
          color: "rgba(255,255,255,0.35)",
        }}
      />
      <Particle
        style={{
          bottom: "3px",
          right: "18%",
          fontSize: "8px",
          color: "rgba(255,255,255,0.4)",
        }}
      />
      <Particle
        style={{
          top: "2px",
          right: "8%",
          fontSize: "5px",
          color: "rgba(255,255,255,0.3)",
        }}
      />

      {/* ── Mobile (< 640px): 3 rows ── */}
      <div className="sm:hidden relative px-3 pt-2 pb-1.5">
        <div className="flex items-center justify-between mb-1">
          <span
            className="text-white font-black text-[10px] tracking-widest uppercase px-2 py-1.5 rounded-full border border-white/40"
            style={{ background: "rgba(0,0,0,0.25)" }}
          >
            TUBORG × ARBITRARY
          </span>
          <CloseBtn size={14} onDismiss={handleDismiss} />
        </div>

        <Ticker />

        <div className="flex items-center justify-between gap-2 mt-1.5">
          {!timeLeft.expired ? (
            <span
              className="inline-flex items-center gap-1 text-white font-bold text-[9px] tracking-wider uppercase opacity-90"
              aria-live="polite"
            >
              <ClockIcon />
              CLOSES IN {pad(timeLeft.days)}D {pad(timeLeft.hours)}H{" "}
              {pad(timeLeft.minutes)}M
            </span>
          ) : (
            <span className="text-white/70 text-[9px] font-black uppercase tracking-widest">
              EVENT CLOSED
            </span>
          )}
          <RegisterBtn className="text-[10px] px-3 py-1.5" />
        </div>
      </div>

      {/* ── Tablet (640px–1023px): badge | ticker | countdown + CTA + close ── */}
      <div className="hidden sm:flex lg:hidden relative items-center gap-3 px-4 py-2">
        <span
          className="flex-shrink-0 text-white font-black text-[11px] tracking-widest uppercase px-2.5 py-1 rounded-full border border-white/40"
          style={{ background: "rgba(0,0,0,0.25)" }}
        >
          TUBORG × ARBITRARY
        </span>

        <div className="flex-1 min-w-0">
          <Ticker />
        </div>

        <div className="flex-shrink-0 flex items-center gap-2">
          <Countdown timeLeft={timeLeft} className="text-[10px]" />
          <RegisterBtn className="text-[10px] px-3 py-1.5" />
          <CloseBtn size={14} onDismiss={handleDismiss} />
        </div>
      </div>

      {/* ── Desktop (≥ 1024px): original static layout ── */}
      <div className="hidden lg:flex relative items-center justify-between gap-2 px-6 py-5">
        <div className="flex-shrink-0">
          <span
            className="text-white font-black text-[12px] tracking-widest uppercase px-3 py-1 rounded-full border border-white/40"
            style={{ background: "rgba(0,0,0,0.25)" }}
          >
            TUBORG × ARBITRARY
          </span>
        </div>
        <div className="flex-1 flex justify-center">
          <p className="text-white font-black text-sm uppercase md:font-semibold tracking-wider text-center leading-tight">
            <span className="font-black">TILT YOUR MUSIC SESSION</span>
            <span className="mx-2 opacity-60">—</span>
            <span className="font-medium opacity-90">
              Meet your favourite artist
            </span>
          </p>
        </div>
        <div className="flex-shrink-0 flex items-center gap-2">
          <Countdown timeLeft={timeLeft} className="text-[10px]" />
          <RegisterBtn className="text-xs px-4 py-1.5" />
          <CloseBtn size={16} onDismiss={handleDismiss} />
        </div>
      </div>
    </div>
  );
}
