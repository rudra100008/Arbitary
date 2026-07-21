"use client";

import { useEffect, useState, useRef, useCallback, FormEvent } from "react";
import type { YTPlayerInstance } from "@/src/types/youtube";
import { useSession } from "next-auth/react";
import Link from "next/link";

export default function LivePage() {
  const { data: session } = useSession();
  const [youtubeId, setYoutubeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const playerRef = useRef<YTPlayerInstance | null>(null);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [chatError, setChatError] = useState("");
  const [chatSent, setChatSent] = useState(false);
  const [chatAvailable, setChatAvailable] = useState<boolean | null>(null);
  const [watchSeconds, setWatchSeconds] = useState(0);
  const [pointsEarned, setPointsEarned] = useState(0);
  const [heartbeatError, setHeartbeatError] = useState("");
  const watchStartRef = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hbStartedRef = useRef(false);
  const lastHeartbeatTimeRef = useRef<number | null>(null);

  const hasGoogleLinked = !!session?.user?.googleId;

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/live/status");
      const data = await res.json();
      if (data.live && data.youtubeId) {
        setYoutubeId(data.youtubeId);
        setChatAvailable(data.chatAvailable ?? null);
      } else {
        setYoutubeId(null);
        setChatAvailable(null);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- standard fetch-on-mount
    fetchStatus();
    const interval = setInterval(fetchStatus, 15000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  useEffect(() => {
    if (!youtubeId) return;

    const w = window;
    let destroyed = false;

    const initPlayer = () => {
      if (destroyed || playerRef.current) return;
      if (!w.YT?.Player) return;
      try {
        playerRef.current = new w.YT.Player("livePlayer", {
          width: "100%",
          height: "100%",
          videoId: youtubeId,
          playerVars: {
            autoplay: 1,
            controls: 1,
            modestbranding: 1,
            rel: 0,
            playsinline: 1,
          },
          events: {
            onStateChange: (e: { data: number }) => {
              if (e.data === w.YT?.PlayerState?.ENDED) {
                fetch("/api/admin/live", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ clear: true }),
                }).catch(() => {});
                setYoutubeId(null);
              }
            },
          },
        });
      } catch (err) {
        console.error("[live] Failed to create YouTube player:", err);
      }
    };

    if (w.YT?.Player) {
      initPlayer();
    } else {
      w.onYouTubeIframeAPIReady = initPlayer;
      if (!document.querySelector('script[src*="iframe_api"]')) {
        const script = document.createElement("script");
        script.src = "https://www.youtube.com/iframe_api";
        script.async = true;
        document.head.appendChild(script);
      }
    }

    return () => {
      destroyed = true;
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }
      w.onYouTubeIframeAPIReady = undefined;
    };
  }, [youtubeId]);

  // Watch timer
  useEffect(() => {
    if (!youtubeId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset watch state when video changes
      setWatchSeconds(0);
      setPointsEarned(0);
      watchStartRef.current = null;
      lastHeartbeatTimeRef.current = null;
      return;
    }

    watchStartRef.current = Date.now();
    lastHeartbeatTimeRef.current = null;

    intervalRef.current = setInterval(() => {
      if (watchStartRef.current) {
        setWatchSeconds(
          Math.floor((Date.now() - watchStartRef.current) / 1000),
        );
      }
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [youtubeId]);

  // Heartbeat — stable ref-based interval that doesn't reset on session refresh
  const sendHeartbeatRef = useRef(async () => {
    if (!watchStartRef.current) return;
    const now = Date.now();
    const lastHb = lastHeartbeatTimeRef.current;
    const delta = lastHb
      ? Math.floor((now - lastHb) / 1000)
      : Math.floor((now - watchStartRef.current) / 1000);
    if (typeof delta !== "number" || !Number.isFinite(delta) || delta < 10) {
      console.warn("[live] heartbeat skipped:", {
        delta,
        lastHb,
        watchStart: watchStartRef.current,
      });
      return;
    }

    try {
      const body = JSON.stringify({ deltaSeconds: delta, youtubeId });
      console.log("[live] heartbeat sending:", body);
      const res = await fetch("/api/live/watch-heartbeat", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body,
      });
      const data = await res.json();
      if (res.ok && data.pointsTotal !== undefined) {
        setPointsEarned(data.pointsTotal);
        lastHeartbeatTimeRef.current = now;
        setHeartbeatError("");
      } else {
        setHeartbeatError(data.error || "Failed to sync points");
        console.warn("[live] heartbeat error:", data);
      }
    } catch (err) {
      setHeartbeatError("Network error syncing watch time");
      console.warn("[live] heartbeat network error:", err);
    }
  });

  useEffect(() => {
    if (!youtubeId || !session?.user) {
      hbStartedRef.current = false;
      return;
    }
    if (hbStartedRef.current) return;
    hbStartedRef.current = true;

    const hb = setInterval(() => sendHeartbeatRef.current(), 60000);
    return () => {
      clearInterval(hb);
      hbStartedRef.current = false;
    };
  }, [youtubeId, session?.user]);

  const handleSend = async (e: FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    setSending(true);
    setChatError("");
    setChatSent(false);

    try {
      const res = await fetch("/api/live/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: message.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setChatError(data.error || "Failed to send message");
      } else {
        setMessage("");
        setChatSent(true);
        setTimeout(() => setChatSent(false), 3000);
      }
    } catch {
      setChatError("Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}m ${sec}s`;
  };

  return (
    <>
      <main className="bg-white text-black min-h-screen pt-32 pb-20 overflow-hidden selection:bg-[#FACC15] selection:text-black">
        <div className="container mx-auto px-6">
          {/* Hero */}
          <section className="animate-fade-in mb-24 md:mb-32 relative">
            <div className="max-w-4xl">
              <span className="inline-block text-[#FACC15] font-bold uppercase tracking-[0.4em] text-xs mb-6 px-4 py-2 bg-zinc-50 rounded-full border border-black/5">
                Live Stream
              </span>
              <h1 className="text-5xl sm:text-6xl md:text-8xl lg:text-9xl font-black tracking-tighter uppercase leading-[0.85] mb-10">
                {youtubeId ? "Now" : "Off"} <br />
                <span className="text-[#FACC15]">Air</span>
              </h1>
              <p className="text-xl md:text-2xl text-zinc-500 max-w-2xl leading-relaxed italic">
                &ldquo;
                {youtubeId
                  ? "Tune in live and join the conversation"
                  : "No broadcast at the moment — check back soon"}
                &rdquo;
              </p>
            </div>
            <div className="absolute -top-32 -right-32 w-96 h-96 bg-[#FACC15]/5 rounded-full blur-[120px] pointer-events-none" />
          </section>

          {loading ? (
            <div className="flex items-center justify-center py-32">
              <div className="w-8 h-8 border-4 border-black/10 border-t-black rounded-full animate-spin" />
            </div>
          ) : !youtubeId ? (
            <div className="flex flex-col items-center justify-center py-32 text-center relative">
              <div className="w-24 h-24 rounded-full bg-zinc-50 border border-black/5 flex items-center justify-center mb-8">
                <svg
                  className="w-12 h-12 text-zinc-300"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z"
                  />
                </svg>
              </div>
              <h2 className="text-3xl md:text-4xl font-black uppercase tracking-tighter mb-4">
                Nothing <br />
                <span className="text-[#FACC15]">Live Right Now</span>
              </h2>
              <p className="text-zinc-500 max-w-md">
                There is no live stream currently active. Check back later for
                upcoming broadcasts.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12 animate-fade-in">
              {/* Player */}
              <div className="lg:col-span-2 relative">
                <div className="aspect-video bg-black rounded-[2.5rem] overflow-hidden border border-black/5 shadow-xl">
                  <div id="livePlayer" className="w-full h-full" />
                </div>
                {session && (
                  <div className="mt-4">
                    <div className="flex items-center gap-4 text-xs font-medium text-zinc-500">
                      <span>
                        Watched:{" "}
                        <span className="text-black font-bold">
                          {formatTime(watchSeconds)}
                        </span>
                      </span>
                      <span className="w-px h-4 bg-black/10" />
                      <span>
                        Points earned:{" "}
                        <span className="text-[#FACC15] font-black">
                          {pointsEarned}
                        </span>
                      </span>
                    </div>
                    {heartbeatError && (
                      <p className="mt-1 text-[10px] font-medium text-red-500">
                        {heartbeatError}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Chat sidebar */}
              <div className="lg:col-span-1 relative">
                <div className="bg-white border border-black/5 rounded-[2.5rem] overflow-hidden shadow-sm h-full flex flex-col relative">
                  <div className="absolute -top-16 -right-16 w-40 h-40 bg-[#FACC15]/5 rounded-full blur-[60px] pointer-events-none" />
                  <div className="p-5 border-b border-black/5 flex items-center gap-3 relative z-10">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-xs font-black uppercase tracking-wider">
                      Live Chat
                    </span>
                  </div>
                  <div className="flex-1 min-h-[350px] relative z-10">
                    <iframe
                      key={youtubeId}
                      src={`https://www.youtube.com/live_chat?v=${youtubeId}&embed_domain=${typeof window !== "undefined" ? window.location.hostname : ""}`}
                      className="w-full h-full"
                      title="YouTube Live Chat"
                    />
                    <a
                      href={`https://www.youtube.com/live_chat?v=${youtubeId}&is_popout=1`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="absolute top-3 right-3 px-3 py-1.5 bg-black/70 hover:bg-black text-[10px] font-bold uppercase tracking-wider text-white rounded-xl transition-colors z-10"
                    >
                      Popout
                    </a>
                  </div>
                  <div className="p-4 border-t border-black/5 relative z-10">
                    {chatAvailable === null ? (
                      <div className="flex items-center justify-center gap-2 py-2">
                        <div className="w-3 h-3 border-2 border-black/10 border-t-black rounded-full animate-spin" />
                        <span className="text-xs font-medium text-zinc-400">
                          Checking chat...
                        </span>
                      </div>
                    ) : !chatAvailable ? (
                      <p className="text-xs font-medium text-zinc-400 text-center py-2">
                        Chat is not available for this stream.
                      </p>
                    ) : !session ? (
                      <Link
                        href="/login"
                        className="block w-full py-3 text-center text-xs font-bold uppercase tracking-wider text-white bg-black rounded-2xl hover:bg-[#FACC15] hover:text-black transition-all duration-500"
                      >
                        Sign in to chat
                      </Link>
                    ) : !hasGoogleLinked ? (
                      <Link
                        href="/profile?tab=settings"
                        className="block w-full py-3 text-center text-xs font-bold uppercase tracking-wider text-white bg-black rounded-2xl hover:bg-[#FACC15] hover:text-black transition-all duration-500"
                      >
                        Link YouTube account to chat
                      </Link>
                    ) : (
                      <form onSubmit={handleSend} className="flex gap-2">
                        <input
                          type="text"
                          value={message}
                          onChange={(e) => setMessage(e.target.value)}
                          placeholder="Type a message..."
                          maxLength={200}
                          disabled={sending}
                          className="flex-1 px-4 py-2.5 bg-zinc-50 border border-black/10 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#FACC15]/40 disabled:opacity-50"
                        />
                        <button
                          type="submit"
                          disabled={!message.trim() || sending}
                          className="px-5 py-2.5 bg-black text-white rounded-2xl text-xs font-bold uppercase tracking-wider hover:bg-[#FACC15] hover:text-black transition-all duration-500 disabled:opacity-50"
                        >
                          {sending ? "..." : "Send"}
                        </button>
                      </form>
                    )}
                    {chatError && (
                      <p className="mt-2 text-xs font-medium text-red-500">
                        {chatError}
                      </p>
                    )}
                    {chatSent && (
                      <p className="mt-2 text-xs font-medium text-green-600">
                        Message sent!
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
