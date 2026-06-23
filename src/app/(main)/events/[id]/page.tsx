"use client";

import Link from "next/link";
import { ArrowLeft, Calendar, Clock, MapPin } from "lucide-react";
import { useParams } from "next/navigation";
import { useMemo, useRef, useState, useEffect } from "react";
import type { CSSProperties } from "react";
import "../events.css";
import type {
  Event,
  TimelineItem,
  ContentSection,
  MediaItem,
} from "@/src/types/db";
import { extractYouTubeId } from "@/src/lib/youtube-url";
// Shared global typing for window.YT lives in src/types/youtube.d.ts
// (it must only be declared once across the app).
import type { YTNamespace, YTPlayerInstance } from "@/src/types/youtube";
import Image from "next/image";

interface EventDetail extends Event {
  timelineItems: TimelineItem[];
  contentSections: (ContentSection & { mediaItems: MediaItem[] })[];
}

const YT_PLAYER_STATE_PLAYING = 1;

const YT_API_SRC = "https://www.youtube.com/iframe_api";

/** Loads the YouTube IFrame Player API script at most once per page, and
 *  resolves every caller's promise once `window.YT.Player` is ready — the
 *  official, reliable way to get real play/pause state, unlike hand-rolled
 *  postMessage handshakes against the embed (which can silently never fire). */
function loadYouTubeIframeApi(): Promise<NonNullable<Window['YT']>> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("No window"));
  }
  if (window.YT?.Player) {
    return Promise.resolve(window.YT);
  }

  return new Promise((resolve) => {
    const previousCallback = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previousCallback?.();
      resolve(window.YT as NonNullable<Window['YT']>);
    };

    if (!document.querySelector(`script[src="${YT_API_SRC}"]`)) {
      const tag = document.createElement("script");
      tag.src = YT_API_SRC;
      document.head.appendChild(tag);
    }
  });
}

const EventContentPage = () => {
  const params = useParams();
  const eventId = params.id as string;
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [videoFailed, setVideoFailed] = useState(false);
  // Whether the YouTube video is actively playing — drives the title/badge
  // overlay fade so it doesn't sit on top of the video while it's running.
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const playerHostRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayerInstance | null>(null);

  useEffect(() => {
    if (!eventId) return;
    fetch(`/api/events/${eventId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setEvent(data.event);
        else setEvent(null);
      })
      .catch(() => setEvent(null))
      .finally(() => setIsLoading(false));
  }, [eventId]);

  // Only ever attempt the embed if the stored URL parses to a real video ID.
  // Anything empty/malformed falls straight through to the image — the page
  // can never break on this. Hooks must run unconditionally (before any
  // early return) to satisfy the Rules of Hooks.
  const youtubeVideoId = useMemo(
    () => extractYouTubeId(event?.youtubeUrl),
    [event?.youtubeUrl],
  );

  useEffect(() => {
    setVideoFailed(false);
    setIsVideoPlaying(false);
  }, [youtubeVideoId]);

  // Construct a real YT.Player against the host div once we have a video ID
  // and the player host element is mounted. This is the official, reliable
  // way to track play/pause state — hand-rolled postMessage handshakes
  // against a manually-written <iframe src="...embed/..."> can silently
  // never fire onStateChange, which is why this replaced that approach.
  useEffect(() => {
    if (!youtubeVideoId) return;
    let cancelled = false;

    loadYouTubeIframeApi()
      .then((YT) => {
        if (cancelled || !playerHostRef.current) return;
        playerRef.current = new YT.Player(playerHostRef.current, {
          videoId: youtubeVideoId,
          host: "https://www.youtube-nocookie.com",
          playerVars: { rel: 0, modestbranding: 1 },
          events: {
            onStateChange: (e) => {
              setIsVideoPlaying(e.data === YT_PLAYER_STATE_PLAYING);
            },
            onError: () => setVideoFailed(true),
          },
        });
      })
      .catch(() => setVideoFailed(true));

    return () => {
      cancelled = true;
      playerRef.current?.destroy();
      playerRef.current = null;
    };
  }, [youtubeVideoId]);

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

  const showVideo = Boolean(youtubeVideoId) && !videoFailed;

  const heroImageSrc =
    event.heroImageUrl ||
    "https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=2070&auto=format&fit=crop";

  // Base64 data-URLs must bypass Next.js image optimization entirely —
  // the optimizer re-encodes them and causes visible blur.
  // We also skip Next.js re-processing for Cloudinary (already optimized by CDN).
  const isDataUrl =
    heroImageSrc.startsWith("data:") ||
    heroImageSrc.includes("res.cloudinary.com");

  const accentColor = event.accentColor || "#FACC15";
  const isPoster = false; // "poster" mode deprecated, always use photo layout
  const hasTimeline = event.timelineItems && event.timelineItems.length > 0;

  return (
    <div
      className="bg-white text-black min-h-screen selection:text-black"
      style={
        {
          "--accent-color": accentColor,
          "--tw-selection-bg": accentColor,
        } as CSSProperties
      }
    >
      <style
        dangerouslySetInnerHTML={{
          __html: `::selection { background-color: ${accentColor}; }`,
        }}
      />
      <main>
        {/* Full-Page Hero: YouTube video, poster image, or photo image */}
        <section
          className={`relative w-full overflow-hidden bg-black ${
            isPoster ? "" : "h-[50vh] md:h-[90vh]"
          }`}
        >
          {showVideo && youtubeVideoId ? (
            <div className="absolute inset-0 flex items-center justify-center bg-black">
              <div className="relative w-full h-full">
                {/* YT.Player replaces this div with its own iframe at
                    construction time — see the player-construction effect
                    above. Keyed on videoId so switching videos gets a clean
                    remount instead of trying to reuse a stale player. */}
                <div
                  key={youtubeVideoId}
                  ref={playerHostRef}
                  className="absolute inset-0 w-full h-full [&>iframe]:w-full [&>iframe]:h-full"
                />
              </div>
              <div
                className={`absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,transparent_40%,black_100%)] transition-opacity duration-500 ${
                  isVideoPlaying ? "opacity-0" : "opacity-70"
                }`}
              />
            </div>
          ) : isPoster ? (
            <>
              {/* Blurred background fill */}
              <div className="absolute inset-0 bg-zinc-900">
                <Image
                  src={heroImageSrc}
                  alt=""
                  aria-hidden="true"
                  width={800}
                  height={600}
                  unoptimized={isDataUrl}
                  className="w-full h-full object-cover blur-xl opacity-30"
                />
              </div>

              {/* Compact back button — small pill, no min-height forcing */}
              <div className="relative z-10 container mx-auto px-4 pt-3 md:pt-8">
                <Link
                  href="/events"
                  className="inline-flex items-center gap-1.5 text-white/70 hover:text-[var(--accent-color)] font-bold uppercase tracking-widest text-[9px] transition-all group px-3 py-1.5 bg-black/30 backdrop-blur-md rounded-full border border-white/10"
                >
                  <ArrowLeft className="w-3 h-3 group-hover:-translate-x-0.5 transition-transform" />
                  Back
                </Link>
              </div>

              {/* Poster image — narrower on mobile, deep drop shadow */}
              <div className="relative z-10 container mx-auto px-6 pb-6 md:pb-12 flex justify-center mt-3 md:mt-0">
                <div className="w-full max-w-[220px] sm:max-w-xs md:max-w-sm lg:max-w-md aspect-[3/4] relative drop-shadow-[0_32px_48px_rgba(0,0,0,0.6)]">
                  <Image
                    src={heroImageSrc}
                    alt={event.title}
                    fill
                    sizes="(max-width: 640px) 220px, (max-width: 768px) 320px, (max-width: 1024px) 384px, 448px"
                    quality={100}
                    unoptimized={isDataUrl}
                    className="object-contain rounded-2xl"
                  />
                </div>
              </div>
            </>
          ) : (
            <Image
              src={heroImageSrc}
              alt={event.title}
              fill
              sizes="100vw"
              priority
              quality={100}
              unoptimized={isDataUrl}
              className="object-cover"
            />
          )}

          {/* Enhanced Bottom-to-Top Fade — only for photo-style heroes; poster
              heroes are shown at full clarity since the poster's own text
              would otherwise get washed out, and hidden while video plays */}
          {!isPoster && (
            <div
              className={`absolute inset-0 pointer-events-none transition-opacity duration-500 ${
                showVideo && isVideoPlaying ? "opacity-0" : "opacity-100"
              }`}
              style={{
                background:
                  "linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 40%), " +
                  "linear-gradient(to bottom, rgba(0,0,0,0.30) 0%, transparent 35%)",
              }}
            />
          )}

          {/* Hero Content: Top-Center Aligned — only rendered for photo-style
              heroes, since poster-style heroes already contain their own
              title/branding and would otherwise have two competing titles.
              Fades out while the video is playing. */}
          {!isPoster && (
            <div
              className={`absolute inset-0 flex flex-col items-center pt-24 md:pt-44 pointer-events-none transition-opacity duration-500 ${
                showVideo && isVideoPlaying ? "opacity-0" : "opacity-100"
              }`}
            >
              <div className="container mx-auto px-6 text-center animate-fade-in">
                <span
                  className="text-black text-[10px] font-black px-6 py-2 rounded-full tracking-[0.3em] uppercase mb-8 inline-block shadow-2xl"
                  style={{ backgroundColor: accentColor }}
                >
                  {event.eventType}
                </span>
                <h1 className="text-3xl md:text-6xl lg:text-7xl font-black tracking-tighter uppercase leading-[0.8] text-white drop-shadow-2xl max-w-6xl mx-auto">
                  {event.title}
                </h1>
              </div>
            </div>
          )}

          {/* Back Button Floating — only for non-poster; poster has its own back button above the poster */}
          {!isPoster && (
            <div className="absolute top-20 md:top-32 left-4 md:left-10 z-20">
              <Link
                href="/events"
                className="flex items-center gap-2 text-white/80 hover:text-[var(--accent-color)] font-bold uppercase tracking-widest text-[10px] transition-all group px-4 py-2 bg-black/20 backdrop-blur-md rounded-full border border-white/10 min-h-[44px]"
              >
                <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
                Back
              </Link>
            </div>
          )}
        </section>

        {/* Poster meta: event type badge → title → divider → meta pills */}
        {isPoster && (
          <div className="container mx-auto px-5 pt-6 md:pt-10 pb-6">
            {/* Event type badge */}
            <div className="flex justify-center mb-4">
              <span
                className="text-black text-[9px] font-black px-4 py-1.5 rounded-full tracking-[0.3em] uppercase"
                style={{ backgroundColor: accentColor }}
              >
                {event.eventType}
              </span>
            </div>

            {/* Title */}
            <h1 className="text-2xl md:text-4xl lg:text-5xl font-black tracking-tighter uppercase text-center leading-tight">
              {event.title}
            </h1>

            {/* Accent divider */}
            <div
              className="mx-auto mt-5 mb-5 h-px w-16 opacity-40"
              style={{ backgroundColor: accentColor }}
            />

            {/* Meta pills row */}
            <div className="flex flex-wrap items-center justify-center gap-3">
              <div className="flex items-center gap-1.5 bg-zinc-50 border border-black/8 rounded-full px-3 py-1.5">
                <Calendar
                  className="w-3.5 h-3.5 shrink-0"
                  style={{ color: accentColor }}
                />
                <span className="font-black text-[11px] tracking-wide">
                  {formatDate(event.eventDate)}
                </span>
              </div>
              {event.eventTime && (
                <div className="flex items-center gap-1.5 bg-zinc-50 border border-black/8 rounded-full px-3 py-1.5">
                  <Clock
                    className="w-3.5 h-3.5 shrink-0"
                    style={{ color: accentColor }}
                  />
                  <span className="font-black text-[11px] tracking-wide">
                    {event.eventTime}
                  </span>
                </div>
              )}
              {event.venue && (
                <div className="flex items-center gap-1.5 bg-zinc-50 border border-black/8 rounded-full px-3 py-1.5">
                  <MapPin
                    className="w-3.5 h-3.5 shrink-0"
                    style={{ color: accentColor }}
                  />
                  <span className="font-black text-[11px] tracking-wide">
                    {event.venue}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Quick-Info Bar: date / time / venue at a glance, right below the
            hero so visitors don't have to scroll to confirm logistics.
            Poster-type events already show this info in the block above
            (grouped with the title), so this bar only renders for
            photo-type events to avoid showing the same info twice. */}
        {!isPoster && (
          <div className="container mx-auto px-6 pt-8">
            <div className="flex flex-wrap justify-center gap-4 md:gap-6 bg-zinc-50 border border-black/5 rounded-3xl px-6 py-5">
              <div className="flex items-center gap-3 min-h-[44px]">
                <Calendar
                  className="w-5 h-5 shrink-0"
                  style={{ color: accentColor }}
                />
                <span className="font-black text-sm md:text-base">
                  {formatDate(event.eventDate)}
                </span>
              </div>
              {event.eventTime && (
                <div className="flex items-center gap-3 min-h-[44px]">
                  <Clock
                    className="w-5 h-5 shrink-0"
                    style={{ color: accentColor }}
                  />
                  <span className="font-black text-sm md:text-base">
                    {event.eventTime}
                  </span>
                </div>
              )}
              {event.venue && (
                <div className="flex items-center gap-3 min-h-[44px]">
                  <MapPin
                    className="w-5 h-5 shrink-0"
                    style={{ color: accentColor }}
                  />
                  <span className="font-black text-sm md:text-base">
                    {event.venue}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Sticky Anchor Nav — lets visitors jump straight to a section
            instead of scrolling and hunting */}
        <div className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-black/5 mt-10">
          <div className="container mx-auto px-6">
            <div className="flex gap-8 overflow-x-auto no-scrollbar">
              <a
                href="#overview"
                className="py-4 text-[11px] font-black uppercase tracking-widest text-zinc-500 hover:text-black whitespace-nowrap min-h-[44px] flex items-center"
              >
                Overview
              </a>
              {hasTimeline && (
                <a
                  href="#agenda"
                  className="py-4 text-[11px] font-black uppercase tracking-widest text-zinc-500 hover:text-black whitespace-nowrap min-h-[44px] flex items-center"
                >
                  Agenda
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Content Section Below Image */}
        <div className="container mx-auto px-6 py-16 md:py-24">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
            {/* Mobile-only Agenda: shown right after the quick-info bar in the
                stacking order, ahead of the description, since lg:hidden
                hides it on desktop where it instead renders sticky on the
                right (below). */}
            {hasTimeline && (
              <div id="agenda-mobile" className="lg:hidden order-1">
                <TimelineCard
                  items={event.timelineItems}
                  accentColor={accentColor}
                />
              </div>
            )}

            {/* Left Column: Description & Highlights */}
            <div
              id="overview"
              className="lg:col-span-9 space-y-16 order-2 lg:order-1"
            >
              <div className="prose prose-2xl max-w-none">
                <p className="text-zinc-500 leading-relaxed whitespace-pre-line text-lg md:text-xl italic font-medium">
                  {event.description}
                </p>
              </div>
            </div>

            {/* Right Column: Timeline (desktop only — mobile copy renders
                above, right after the quick-info bar) */}
            <div
              id="agenda"
              className="hidden lg:block lg:col-span-3 lg:sticky lg:top-32 h-fit space-y-6 order-3 lg:order-2"
            >
              {hasTimeline && (
                <TimelineCard
                  items={event.timelineItems}
                  accentColor={accentColor}
                />
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

/** Shared timeline card, rendered once in the mobile stacking order (right
 *  after the quick-info bar) and once sticky in the desktop right rail —
 *  kept as one component so the two stay visually identical. */
const TimelineCard = ({
  items,
  accentColor,
}: {
  items: TimelineItem[];
  accentColor: string;
}) => (
  <div className="p-6 bg-zinc-50 rounded-3xl border border-black/5">
    <h3 className="text-sm font-black uppercase tracking-widest mb-6">
      EVENT TIMELINE
    </h3>
    <div className="space-y-6">
      {items.map((item: TimelineItem, i: number) => (
        <div key={i} className="flex gap-4 items-start">
          <span
            className="text-[10px] font-black text-white px-2 py-1 rounded-md min-w-[60px] text-center"
            style={{ backgroundColor: accentColor }}
          >
            {item.time}
          </span>
          <p className="text-[11px] font-bold text-zinc-800 uppercase tracking-tight leading-tight">
            {item.description}
          </p>
        </div>
      ))}
    </div>
  </div>
);

export default EventContentPage;
