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
      className={`flex-shrink-0 bg-[#001f6c] text-white font-black uppercase tracking-widest rounded-lg hover:bg-[#002a8a] transition-colors duration-150 ${className}`}
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
        style={{ background: "rgba(0,0,0,0.45)" }}
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
        @keyframes particleDrift {
          0%   { transform: translateY(-15px); opacity: 0; }
          8%   { opacity: 1; }
          85%  { opacity: 1; }
          100% { transform: translateY(80px); opacity: 0; }
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

  const PARTICLES = [
    { t: 3, l: 1, sz: 8, dr: 8.0, dy: 0.0 },
    { b: 4, l: 4, sz: 7, dr: 9.5, dy: 1.2 },
    { t: 5, l: 7, sz: 10, dr: 7.2, dy: 2.8 },
    { b: 2, l: 10, sz: 6, dr: 11.0, dy: 0.5 },
    { t: 2, l: 13, sz: 9, dr: 8.8, dy: 3.4 },
    { b: 5, l: 16, sz: 7, dr: 10.2, dy: 1.8 },
    { t: 4, l: 19, sz: 11, dr: 6.5, dy: 4.2 },
    { b: 3, l: 22, sz: 6, dr: 12.0, dy: 0.2 },
    { t: 3, l: 25, sz: 8, dr: 9.0, dy: 3.0 },
    { b: 4, l: 28, sz: 10, dr: 7.8, dy: 1.5 },
    { t: 5, l: 31, sz: 7, dr: 10.5, dy: 4.8 },
    { b: 2, l: 34, sz: 9, dr: 8.2, dy: 0.8 },
    { t: 2, l: 37, sz: 6, dr: 11.8, dy: 2.5 },
    { b: 5, l: 40, sz: 8, dr: 9.4, dy: 3.8 },
    { t: 4, l: 43, sz: 10, dr: 7.0, dy: 0.1 },
    { b: 3, l: 46, sz: 7, dr: 10.8, dy: 4.5 },
    { t: 3, l: 49, sz: 11, dr: 6.8, dy: 1.0 },
    { b: 4, l: 52, sz: 6, dr: 12.2, dy: 3.2 },
    { t: 5, l: 55, sz: 9, dr: 8.5, dy: 0.6 },
    { b: 2, l: 58, sz: 8, dr: 9.8, dy: 4.0 },
    { t: 2, l: 61, sz: 7, dr: 11.4, dy: 1.4 },
    { b: 5, l: 64, sz: 10, dr: 7.4, dy: 3.6 },
    { t: 4, l: 67, sz: 6, dr: 10.0, dy: 0.3 },
    { b: 3, l: 70, sz: 9, dr: 9.2, dy: 5.0 },
    { t: 3, l: 73, sz: 8, dr: 8.6, dy: 2.2 },
    { b: 4, l: 76, sz: 7, dr: 11.6, dy: 0.9 },
    { t: 5, l: 79, sz: 11, dr: 6.2, dy: 4.6 },
    { b: 2, l: 82, sz: 6, dr: 12.4, dy: 3.0 },
    { t: 2, l: 85, sz: 10, dr: 7.6, dy: 0.4 },
    { b: 5, l: 88, sz: 8, dr: 10.4, dy: 1.6 },
    { t: 4, l: 91, sz: 7, dr: 9.6, dy: 4.4 },
    { b: 3, l: 94, sz: 9, dr: 8.4, dy: 2.0 },
    { t: 5, l: 97, sz: 6, dr: 11.2, dy: 3.5 },
    { b: 4, l: 99, sz: 10, dr: 7.0, dy: 1.0 },
  ] as const;

  return (
    <div
      id="promo-banner"
      ref={bannerRef}
      role="banner"
      aria-label="Promotional announcement"
      className="fixed top-0 left-0 right-0 w-full overflow-hidden z-[10000]"
      style={{
        background:
          "linear-gradient(to right, #469930 0%, #35af0a 45%, #36b40d 100%)",
      }}
    >
      {PARTICLES.map((p, i) => {
        const top = "t" in p ? p.t : undefined;
        const bottom = "b" in p ? p.b : undefined;
        return (
          <Particle
            key={i}
            style={
              {
                [top !== undefined ? "top" : "bottom"]: `${top ?? bottom}px`,
                left: `${p.l}%`,
                fontSize: `${p.sz}px`,
                color: "white",
                animation: `particleDrift ${p.dr}s ${p.dy}s ease-in-out infinite backwards`,
              } as React.CSSProperties
            }
          />
        );
      })}

      {/* ── Mobile (< 640px): 3 rows ── */}
      <div className="sm:hidden relative px-3 pt-2 pb-1.5">
        <div className="flex items-center justify-between mb-1">
          <span className="text-white font-black text-[10px] tracking-widest uppercase px-2 py-1.5 rounded-full border border-white">
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
        <span className="flex-shrink-0 text-white font-black text-[11px] tracking-widest uppercase px-2.5 py-1 rounded-full border border-white">
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
      <div className="hidden lg:flex relative items-center justify-between gap-2 px-6 py-2.5">
        <div className="flex-shrink-0">
          <span className="text-white font-black text-[12px] tracking-widest uppercase px-3 py-1 rounded-full border border-white">
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
