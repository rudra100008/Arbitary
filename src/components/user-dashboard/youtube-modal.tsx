"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";

type YoutubeModalProps = {
  url: string;
  taskId: number;
  isOpen: boolean;
  onClose: () => void;
  onComplete: (watchedSeconds: number, sessionId?: number) => void;
  requiredSeconds?: number;
};

function getYoutubeId(url: string): string | null {
  const regExp =
    /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return match && match[2].length === 11 ? match[2] : null;
}

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

export function YoutubeModal({
  url,
  taskId,
  isOpen,
  onClose,
  onComplete,
  requiredSeconds = 60,
}: YoutubeModalProps) {
  const [watchedSeconds, setWatchedSeconds] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [playerReady, setPlayerReady] = useState(false);
  const [mounted, setMounted] = useState(false);

  const playerRef = useRef<any>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const completedRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const watchedSecondsRef = useRef(0);
  const sessionIdRef = useRef<number | null>(null);
  const reportingRef = useRef(false);

  const startSession = useCallback(async () => {
    if (sessionIdRef.current) return sessionIdRef.current;
    try {
      const res = await fetch(`/api/tasks/${taskId}/watch-session`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not start watch session");
      sessionIdRef.current = data.sessionId;
      return data.sessionId;
    } catch {
      return null;
    }
  }, [taskId]);

  const reportProgress = useCallback(async () => {
    if (!playerRef.current || reportingRef.current) return;
    const sessionId = sessionIdRef.current ?? (await startSession());
    if (!sessionId) return;
    reportingRef.current = true;
    try {
      const positionSeconds = Math.floor(playerRef.current.getCurrentTime?.() ?? 0);
      await fetch(`/api/tasks/${taskId}/watch-session`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, positionSeconds }),
      });
    } catch {
      // silent — non-critical
    } finally {
      reportingRef.current = false;
    }
  }, [taskId, startSession]);

  const videoId = getYoutubeId(url);

  // Portal mount
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const handleComplete = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    setIsCompleted(true);
    if (timerRef.current) clearInterval(timerRef.current);
    // Final progress report before completing
    reportProgress();
    const finalSeconds = watchedSecondsRef.current;
    const sessId = sessionIdRef.current ?? undefined;
    setTimeout(() => {
      onComplete(finalSeconds, sessId);
    }, 1200);
  }, [onComplete, reportProgress]);

  // Init / destroy YouTube player
  useEffect(() => {
    if (!isOpen || !videoId) return;

    // Reset state
    setWatchedSeconds(0);
    watchedSecondsRef.current = 0;
    setIsPlaying(false);
    setIsCompleted(false);
    setPlayerReady(false);
    completedRef.current = false;

    function initPlayer() {
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }

      playerRef.current = new window.YT.Player("yt-player-container", {
        height: "100%",
        width: "100%",
        videoId,
        playerVars: {
          playsinline: 1,
          autoplay: 1,
          controls: 1,
          disablekb: 0,
          rel: 0,
          modestbranding: 1,
        },
        events: {
          onReady: () => setPlayerReady(true),
          onStateChange: (event: any) => {
            if (event.data === window.YT.PlayerState.PLAYING) {
              setIsPlaying(true);
              startSession();
            } else {
              setIsPlaying(false);
            }
          },
        },
      });
    }

    const tryInit = () => {
      if (window.YT && window.YT.Player) {
        initPlayer();
      } else {
        // Script not yet loaded — attach to the global callback
        const prev = window.onYouTubeIframeAPIReady;
        window.onYouTubeIframeAPIReady = () => {
          if (prev) prev();
          initPlayer();
        };

        if (!document.getElementById("yt-api-script")) {
          const tag = document.createElement("script");
          tag.id = "yt-api-script";
          tag.src = "https://www.youtube.com/iframe_api";
          document.head.appendChild(tag);
        }
      }
    };

    // Small timeout to let the DOM node render inside the portal
    const t = setTimeout(tryInit, 80);

    return () => {
      clearTimeout(t);
      if (timerRef.current) clearInterval(timerRef.current);
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch (_) {}
        playerRef.current = null;
      }
      setPlayerReady(false);
      setIsPlaying(false);
    };
  }, [isOpen, videoId]);

  // Countdown timer — only runs while playing & not yet completed
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);

    if (isPlaying && !completedRef.current) {
      timerRef.current = setInterval(() => {
        setWatchedSeconds((prev) => {
          const next = prev + 1;
          watchedSecondsRef.current = next;
          if (next >= requiredSeconds) {
            handleComplete();
            return requiredSeconds;
          }
          return next;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, requiredSeconds, handleComplete]);

  // Report server progress every 5s while playing
  useEffect(() => {
    if (!isPlaying || completedRef.current) return;
    const interval = setInterval(reportProgress, 5000);
    return () => clearInterval(interval);
  }, [isPlaying, reportProgress]);

  if (!isOpen || !mounted) return null;

  const progress = Math.min((watchedSeconds / requiredSeconds) * 100, 100);
  const timeLeft = Math.max(requiredSeconds - watchedSeconds, 0);
  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;
  const timeStr =
    mins > 0 ? `${mins}:${secs.toString().padStart(2, "0")}` : `${secs}s`;

  const modalContent = (
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ zIndex: 99999 }}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/85 backdrop-blur-md"
        onClick={() => !isCompleted && onClose()}
        style={{ zIndex: 0 }}
      />

      {/* Modal panel */}
      <div
        ref={containerRef}
        className="relative w-full flex flex-col rounded-2xl overflow-hidden shadow-2xl"
        style={{
          zIndex: 1,
          maxWidth: "780px",
          background: "#0f0f13",
          boxShadow:
            "0 0 0 1px rgba(255,255,255,0.07), 0 32px 80px rgba(0,0,0,0.7)",
          animation: "ytModalIn 0.28s cubic-bezier(0.34,1.56,0.64,1) forwards",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Top bar ── */}
        <div
          className="flex items-center justify-between px-5 py-3.5"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
        >
          <div className="flex items-center gap-2.5">
            {/* YouTube red dot */}
            <span
              className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0"
              style={{ boxShadow: "0 0 6px rgba(239,68,68,0.7)" }}
            />
            <span
              className="text-sm font-semibold text-white/90 tracking-wide"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              Watch &amp; Earn
            </span>
            <span
              className="text-xs px-2 py-0.5 rounded-full font-medium"
              style={{
                background: "rgba(255,255,255,0.07)",
                color: "rgba(255,255,255,0.45)",
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              Keep video playing
            </span>
          </div>

          {/* X button — always visible */}
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full transition-all duration-200"
            style={{
              background: "rgba(255,255,255,0.06)",
              color: "rgba(255,255,255,0.5)",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background =
                "rgba(255,255,255,0.12)";
              (e.currentTarget as HTMLElement).style.color =
                "rgba(255,255,255,0.9)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background =
                "rgba(255,255,255,0.06)";
              (e.currentTarget as HTMLElement).style.color =
                "rgba(255,255,255,0.5)";
            }}
            aria-label="Close"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M1 1l12 12M13 1L1 13" />
            </svg>
          </button>
        </div>

        {/* ── Video ── */}
        <div
          className="w-full relative bg-black"
          style={{ aspectRatio: "16/9" }}
        >
          {/* The div that YT replaces with an iframe */}
          <div
            id="yt-player-container"
            className="absolute inset-0 w-full h-full"
          />

          {/* Loading shimmer until player is ready */}
          {!playerReady && (
            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{ background: "#0a0a0e" }}
            >
              <div className="flex flex-col items-center gap-3">
                <div className="w-10 h-10 rounded-full border-2 border-red-500/30 border-t-red-500 animate-spin" />
                <span
                  className="text-xs text-white/30"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                >
                  Loading video…
                </span>
              </div>
            </div>
          )}

          {/* Completed overlay */}
          {isCompleted && (
            <div
              className="absolute inset-0 flex flex-col items-center justify-center gap-3"
              style={{
                background: "rgba(0,0,0,0.75)",
                backdropFilter: "blur(4px)",
                animation: "fadeIn 0.3s ease forwards",
              }}
            >
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center"
                style={{
                  background: "linear-gradient(135deg,#10b981,#059669)",
                  boxShadow: "0 0 32px rgba(16,185,129,0.5)",
                  animation:
                    "popIn 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards",
                }}
              >
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <p
                className="text-white font-bold text-lg tracking-wide"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                Task Completed!
              </p>
              <p
                className="text-white/50 text-xs"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                Points have been added to your account
              </p>
            </div>
          )}
        </div>

        {/* ── Footer / Progress ── */}
        <div className="px-5 py-4 flex flex-col gap-3">
          {/* Status row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isCompleted ? (
                <span
                  className="flex items-center gap-1.5 text-sm font-semibold"
                  style={{
                    color: "#10b981",
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                >
                  <span
                    className="w-2 h-2 rounded-full bg-emerald-400"
                    style={{ boxShadow: "0 0 6px rgba(52,211,153,0.8)" }}
                  />
                  Completed
                </span>
              ) : isPlaying ? (
                <span
                  className="flex items-center gap-1.5 text-sm font-semibold"
                  style={{
                    color: "rgba(255,255,255,0.7)",
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                >
                  <span
                    className="w-2 h-2 rounded-full bg-red-500"
                    style={{
                      boxShadow: "0 0 6px rgba(239,68,68,0.7)",
                      animation: "pulse 1.4s infinite",
                    }}
                  />
                  Watching…
                </span>
              ) : (
                <span
                  className="flex items-center gap-1.5 text-sm font-medium"
                  style={{
                    color: "rgba(255,255,255,0.35)",
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                >
                  <span className="w-2 h-2 rounded-full bg-white/20" />
                  Paused — timer stopped
                </span>
              )}
            </div>

            {/* Countdown */}
            {!isCompleted && (
              <span
                className="text-sm font-bold tabular-nums"
                style={{
                  color: isPlaying
                    ? "rgba(255,255,255,0.85)"
                    : "rgba(255,255,255,0.3)",
                  fontFamily: "'DM Sans', sans-serif",
                  letterSpacing: "0.03em",
                }}
              >
                {timeStr} left
              </span>
            )}
          </div>

          {/* Progress bar */}
          <div
            className="w-full rounded-full overflow-hidden"
            style={{ height: "5px", background: "rgba(255,255,255,0.08)" }}
          >
            <div
              className="h-full rounded-full"
              style={{
                width: `${progress}%`,
                background: isCompleted
                  ? "linear-gradient(90deg,#10b981,#34d399)"
                  : "linear-gradient(90deg,#ef4444,#f97316)",
                transition: "width 1s linear",
                boxShadow: isCompleted
                  ? "0 0 8px rgba(16,185,129,0.6)"
                  : isPlaying
                    ? "0 0 8px rgba(239,68,68,0.5)"
                    : "none",
              }}
            />
          </div>

          {/* Hint */}
          {!isCompleted && (
            <p
              className="text-center text-xs"
              style={{
                color: "rgba(255,255,255,0.22)",
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              Pausing the video will pause the timer
            </p>
          )}
        </div>
      </div>

      <style>{`
        @keyframes ytModalIn {
          from { opacity: 0; transform: scale(0.94) translateY(12px); }
          to   { opacity: 1; transform: scale(1)    translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes popIn {
          from { opacity: 0; transform: scale(0.5); }
          to   { opacity: 1; transform: scale(1);   }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.35; }
        }
      `}</style>
    </div>
  );

  return createPortal(modalContent, document.body);
}
