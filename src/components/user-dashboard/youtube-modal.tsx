"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
// Shared global typing for window.YT lives in src/types/youtube.d.ts
// (it must only be declared once across the app).
import type { YTPlayerInstance as YTPlayer } from "@/src/types/youtube";

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
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [localRequiredSeconds, setLocalRequiredSeconds] =
    useState(requiredSeconds);

  const playerRef = useRef<YTPlayer | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const completedRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const watchedSecondsRef = useRef(0);
  const isPausedByVisibilityRef = useRef(false);
  const sessionIdRef = useRef<number | null>(null);
  const reportingRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const startSession = useCallback(async () => {
    if (sessionIdRef.current) return sessionIdRef.current;

    const maxAttempts = 3;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const res = await fetch(`/api/tasks/${taskId}/watch-session`, {
          method: "POST",
          signal: AbortSignal.timeout(10000),
        });
        const data = await res.json();
        if (!res.ok)
          throw new Error(data.error ?? "Could not start watch session");
        sessionIdRef.current = data.sessionId;
        if (data.requiredSeconds) setLocalRequiredSeconds(data.requiredSeconds);
        return data.sessionId;
      } catch (err: any) {
        const isTransient =
          err.name === "AbortError" || err.name === "TimeoutError";
        if (isTransient) {
          if (attempt < maxAttempts - 1) {
            await new Promise((r) => setTimeout(r, 500 * Math.pow(2, attempt)));
            continue;
          }
          return null; // retried later by heartbeat/completion check
        }
        setSessionError(err.message || "Failed to start watch session");
        return null;
      }
    }
    return null;
  }, [taskId]);

  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const handleComplete = useCallback(async () => {
    if (completedRef.current) return;
    completedRef.current = true;

    const finalSeconds = watchedSecondsRef.current;
    let sessId = sessionIdRef.current;

    if (!sessId) {
      try {
        sessId = await startSession();
      } catch {
        completedRef.current = false;
        setSessionError("Failed to record watch session. Please try again.");
        return;
      }
    }

    if (!sessId) {
      completedRef.current = false;
      setSessionError("Watch session required. Please start video again.");
      return;
    }

    setIsCompleted(true);
    setWatchedSeconds(localRequiredSeconds);
    watchedSecondsRef.current = localRequiredSeconds;
    if (timerRef.current) clearInterval(timerRef.current);

    try {
      onCompleteRef.current(finalSeconds, sessId);
    } catch {
      // non-critical
    }
    setTimeout(() => {
      onCloseRef.current();
    }, 4000);
  }, [localRequiredSeconds, startSession]);

  const handleSessionPause = useCallback(async () => {
    const sessId = sessionIdRef.current;
    if (!sessId) return;
    // Clear the cached id BEFORE the await so that any heartbeat that races
    // in after close cannot re-use the stale id against a paused session.
    sessionIdRef.current = null;
    try {
      await fetch(`/api/tasks/${taskId}/watch-session/pause`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: sessId }),
      });
    } catch {
      // non-critical
    }
  }, [taskId]);

  const reportProgress = useCallback(
    async (isFinal = false) => {
      if (!playerRef.current || completedRef.current) return;
      if (!isFinal && reportingRef.current) return;

      const sessionId = sessionIdRef.current ?? (await startSession());
      if (!sessionId) return;

      reportingRef.current = true;

      const maxRetries = isFinal ? 3 : 1;
      let lastError: Error | null = null;

      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          const positionSeconds = Math.floor(
            playerRef.current?.getCurrentTime?.() ?? 0,
          );
          const res = await fetch(`/api/tasks/${taskId}/watch-session`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sessionId, positionSeconds }),
            signal: AbortSignal.timeout(8000),
          });
          const data = await res.json();
          if (!res.ok) {
            throw new Error(data.error || `${res.status} ${res.statusText}`);
          }
          if (data.completed) {
            handleComplete();
          }
          reportingRef.current = false;
          return;
        } catch (err) {
          lastError = err as Error;
          if (attempt < maxRetries - 1) {
            const delayMs = 200 * Math.pow(2, attempt);
            await new Promise((resolve) => setTimeout(resolve, delayMs));
          }
        }
      }

      if (isFinal && lastError) {
        console.error("Final heartbeat failed after retries:", lastError);
      }

      reportingRef.current = false;
    },
    [taskId, startSession, handleComplete],
  );

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

  // Session reset on modal open (preserve existing sessionId for resume)
  useEffect(() => {
    if (!isOpen) return;

    setWatchedSeconds(0);
    watchedSecondsRef.current = 0;
    setIsPlaying(false);
    setIsCompleted(false);
    setPlayerReady(false);
    completedRef.current = false;
    setSessionError(null);
    setLocalRequiredSeconds(requiredSeconds);
  }, [isOpen, requiredSeconds]);

  // Pause session and cancel in-flight requests on modal close
  useEffect(() => {
    if (isOpen) return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    handleSessionPause();
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, [isOpen, handleSessionPause]);

  // Page Visibility API
  useEffect(() => {
    function handleVisibilityChange() {
      if (document.hidden) {
        if (playerRef.current) {
          try {
            playerRef.current.pauseVideo();
          } catch (_) {}
        }
        isPausedByVisibilityRef.current = true;
        setIsPlaying(false);
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      isPausedByVisibilityRef.current = false;
    };
  }, []);

  // Init / destroy YouTube player
  useEffect(() => {
    if (!isOpen || !videoId) return;

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

      // initPlayer is only ever invoked after window.YT is confirmed loaded
      // (see the `window.YT && window.YT.Player` guard / onYouTubeIframeAPIReady below).
      playerRef.current = new window.YT!.Player("yt-player-container", {
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
          onStateChange: (event: { data: number }) => {
            if (event.data === window.YT!.PlayerState.PLAYING) {
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

    const t = setTimeout(tryInit, 80);

    return () => {
      clearTimeout(t);
      if (timerRef.current) clearInterval(timerRef.current);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch (_) {}
        playerRef.current = null;
      }
      setPlayerReady(false);
      setIsPlaying(false);
    };
  }, [isOpen, videoId, startSession]);

  // Countdown timer — pure counter, no side effects
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);

    if (isPlaying && !completedRef.current) {
      timerRef.current = setInterval(() => {
        setWatchedSeconds((prev) => {
          const next = prev + 1;
          watchedSecondsRef.current = next;
          return next;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying]);

  // Detect when the required watch time is reached and trigger completion
  useEffect(() => {
    if (completedRef.current) return;
    if (watchedSeconds < localRequiredSeconds) return;

    // Time threshold crossed — send a final heartbeat with retries.
    // The reportProgress function now handles retry and mutex bypass for isFinal=true.
    const complete = async () => {
      await reportProgress(true);
      if (!completedRef.current) {
        handleComplete();
      }
    };
    complete();
  }, [watchedSeconds, localRequiredSeconds, reportProgress, handleComplete]);

  // Report server progress every 15s while playing (periodic heartbeat)
  useEffect(() => {
    if (!isPlaying || completedRef.current) return;
    const interval = setInterval(() => {
      reportProgress(false);
    }, 15000);
    return () => clearInterval(interval);
  }, [isPlaying, reportProgress]);

  if (!isOpen || !mounted) return null;

  const progress = Math.min((watchedSeconds / localRequiredSeconds) * 100, 100);
  const timeLeft = Math.max(localRequiredSeconds - watchedSeconds, 0);
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
          <div
            id="yt-player-container"
            className="absolute inset-0 w-full h-full"
          />

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

          {/* Session error overlay */}
          {sessionError && (
            <div
              className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6"
              style={{
                background: "rgba(0,0,0,0.8)",
                backdropFilter: "blur(4px)",
              }}
            >
              <span className="text-red-400 text-sm text-center font-medium">
                {sessionError}
              </span>
              <button
                onClick={onClose}
                className="text-xs font-bold text-black bg-[#FACC15] hover:bg-[#eab308] px-4 py-2 rounded-full transition-all duration-200"
              >
                Close
              </button>
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
