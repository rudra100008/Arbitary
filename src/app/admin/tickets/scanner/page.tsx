"use client";

import {
  Suspense,
  useEffect,
  useRef,
  useState,
  useCallback,
  useReducer,
} from "react";
import { Html5Qrcode } from "html5-qrcode";
import { useSearchParams, useRouter } from "next/navigation";
import type { Event } from "@/src/types/db";
import type { TicketWithDetails } from "@/src/services/ticket.service";
import ManualEntry from "./_components/ManualEntry";
import TicketPreview from "./_components/TicketPreview";
import ScanHistory from "./_components/ScanHistory";
import type { HistoryEntry } from "./_components/ScanHistory";

type ScanState =
  | { phase: "idle" }
  | { phase: "scanning" }
  | { phase: "ticket_found"; ticket: TicketWithDetails }
  | { phase: "confirming"; ticket: TicketWithDetails }
  | { phase: "feedback"; type: FeedbackType; message: string }
  | { phase: "manual_entry" };

type FeedbackType = "success" | "already_used" | "invalid" | "network_error";

type Action =
  | { type: "START_SCANNING" }
  | { type: "TICKET_FOUND"; ticket: TicketWithDetails }
  | { type: "CONFIRM" }
  | { type: "REDEEM_DONE"; feedbackType: FeedbackType; message: string }
  | { type: "DISMISS_FEEDBACK" }
  | { type: "OPEN_MANUAL_ENTRY" }
  | { type: "CANCEL_MANUAL_ENTRY" }
  | { type: "STOP" };

function scanReducer(state: ScanState, action: Action): ScanState {
  switch (action.type) {
    case "START_SCANNING":
      return { phase: "scanning" };
    case "TICKET_FOUND":
      return { phase: "ticket_found", ticket: action.ticket };
    case "CONFIRM":
      if (state.phase !== "ticket_found") return state;
      return { phase: "confirming", ticket: state.ticket };
    case "REDEEM_DONE":
      return {
        phase: "feedback",
        type: action.feedbackType,
        message: action.message,
      };
    case "DISMISS_FEEDBACK":
      return { phase: "scanning" };
    case "OPEN_MANUAL_ENTRY":
      return { phase: "manual_entry" };
    case "CANCEL_MANUAL_ENTRY":
      return { phase: "scanning" };
    case "STOP":
      return { phase: "idle" };
    default:
      return state;
  }
}

const SCANNER_ELEMENT_ID = "qr-scanner-element";
const COOLDOWN_MS = 5000;
const REDEEM_COOLDOWN_MS = 10000;
const REQUEST_TIMEOUT_MS = 5000;
const STATS_POLL_MS = 10000;
const FEEDBACK_DURATION_MS = 1500;

function extractToken(scanned: string): string | null {
  const s = scanned.trim();
  if (!s) return null;
  if (s.startsWith("http://") || s.startsWith("https://")) {
    try {
      const url = new URL(s);
      const token = url.searchParams.get("token");
      if (!token) return null;
      return token;
    } catch {
      return null;
    }
  }
  return s;
}

function playBeep(audioCtx: AudioContext | null) {
  if (!audioCtx || audioCtx.state === "closed") return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.type = "sine";
  osc.frequency.value = 1200;
  gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.2);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.2);
}

function playBuzz(audioCtx: AudioContext | null) {
  if (!audioCtx || audioCtx.state === "closed") return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.type = "sawtooth";
  osc.frequency.value = 150;
  gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.4);
}

function tryVibrate(pattern: number | number[]) {
  if (typeof navigator !== "undefined" && navigator.vibrate) {
    navigator.vibrate(pattern);
  }
}

async function supportsTorch(track: MediaStreamTrack): Promise<boolean> {
  try {
    const capabilities = track.getCapabilities();
    return !!(capabilities as MediaTrackCapabilities & { torch?: boolean })
      .torch;
  } catch {
    return false;
  }
}

type StatsHistoryState = { stats: { totalTickets: number; redeemedCount: number }; historyEntry: HistoryEntry | null };
type StatsHistoryAction =
  | { type: "SET_STATS"; stats: { totalTickets: number; redeemedCount: number } }
  | { type: "SET_HISTORY_ENTRY"; entry: HistoryEntry | null }
  | { type: "RESET" };

function statsHistoryReducer(state: StatsHistoryState, action: StatsHistoryAction): StatsHistoryState {
  switch (action.type) {
    case "SET_STATS": return { ...state, stats: action.stats };
    case "SET_HISTORY_ENTRY": return { ...state, historyEntry: action.entry };
    case "RESET": return { stats: { totalTickets: 0, redeemedCount: 0 }, historyEntry: null };
  }
}

type EventsState = { events: Event[]; eventsLoading: boolean };
type EventsAction =
  | { type: "SET_EVENTS"; events: Event[] }
  | { type: "SET_LOADING"; loading: boolean };

function eventsReducer(state: EventsState, action: EventsAction): EventsState {
  switch (action.type) {
    case "SET_EVENTS": return { ...state, events: action.events };
    case "SET_LOADING": return { ...state, eventsLoading: action.loading };
  }
}

function ScannerPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const eventId = searchParams.get("eventId");

  const [state, dispatch] = useReducer(scanReducer, { phase: "idle" });

  const [eventsState, eventsDispatch] = useReducer(eventsReducer, { events: [], eventsLoading: !eventId });

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const lastScanRef = useRef<{ token: string; time: number } | null>(null);
  const lastRedeemRef = useRef<number>(0);
  const feedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const statsIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const videoTrackRef = useRef<MediaStreamTrack | null>(null);

  const [cameraActive, setCameraActive] = useState(false);
  const [cameraDenied, setCameraDenied] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [statsHistState, statsHistDispatch] = useReducer(statsHistoryReducer, { stats: { totalTickets: 0, redeemedCount: 0 }, historyEntry: null });
  const [torchOn, setTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    if (state.phase === "feedback") {
      feedbackTimeoutRef.current = setTimeout(() => {
        dispatch({ type: "DISMISS_FEEDBACK" });
      }, FEEDBACK_DURATION_MS);
      return () => {
        if (feedbackTimeoutRef.current)
          clearTimeout(feedbackTimeoutRef.current);
      };
    }
  }, [state.phase]);

  useEffect(() => {
    if (torchSupported && videoTrackRef.current) {
      try {
        (
          videoTrackRef.current as MediaStreamTrack & {
            applyConstraints: (c: Record<string, unknown>) => Promise<void>;
          }
        ).applyConstraints({
          torch: torchOn,
        });
      } catch {}
    }
  }, [torchOn, torchSupported]);

  useEffect(() => {
    if (videoTrackRef.current) {
      try {
        (
          videoTrackRef.current as MediaStreamTrack & {
            applyConstraints: (c: Record<string, unknown>) => Promise<void>;
          }
        ).applyConstraints({
          zoom: zoom,
        });
      } catch {}
    }
  }, [zoom]);

  const lookupTicket = useCallback(
    async (
      token: string,
    ): Promise<{ ticket?: TicketWithDetails; error?: string }> => {
      const params = new URLSearchParams({ token });
      if (eventId) params.set("eventId", eventId);
      const controller = new AbortController();
      abortRef.current = controller;
      const timeoutId = setTimeout(
        () => controller.abort(),
        REQUEST_TIMEOUT_MS,
      );
      try {
        const res = await fetch(
          `/api/admin/tickets/lookup?${params.toString()}`,
          {
            signal: controller.signal,
          },
        );
        clearTimeout(timeoutId);
        const data = await res.json();
        if (!res.ok) return { error: data.error || "Lookup failed" };
        return { ticket: data.ticket };
      } catch (err: unknown) {
        clearTimeout(timeoutId);
        if (err instanceof DOMException && err.name === "AbortError") {
          return { error: "Request timed out" };
        }
        return { error: "Network error" };
      } finally {
        abortRef.current = null;
      }
    },
    [eventId],
  );

  const redeemTicket = useCallback(
    async (
      token: string,
    ): Promise<{
      feedbackType: FeedbackType;
      message: string;
      redeemedAt?: string;
    }> => {
      const controller = new AbortController();
      abortRef.current = controller;
      const timeoutId = setTimeout(
        () => controller.abort(),
        REQUEST_TIMEOUT_MS,
      );
      try {
        const res = await fetch("/api/admin/tickets/redeem", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
          signal: controller.signal,
        });
        const data = await res.json();
        clearTimeout(timeoutId);
        if (!res.ok) {
          if (res.status === 404)
            return { feedbackType: "invalid", message: "Ticket not found" };
          return {
            feedbackType: "invalid",
            message: data.error || "Unknown error",
          };
        }
        if (data.alreadyRedeemed) {
          const ts = data.redeemedAt
            ? new Date(data.redeemedAt).toLocaleString()
            : "unknown";
          return {
            feedbackType: "already_used",
            message: `Already used: ${ts}`,
            redeemedAt: data.redeemedAt,
          };
        }
        lastRedeemRef.current = Date.now();
        return {
          feedbackType: "success",
          message: "Entry confirmed — Welcome!",
        };
      } catch (err: unknown) {
        clearTimeout(timeoutId);
        if (err instanceof DOMException && err.name === "AbortError") {
          return {
            feedbackType: "network_error",
            message: "Connection timeout. Verify manually.",
          };
        }
        return {
          feedbackType: "network_error",
          message: "Request failed. Verify manually.",
        };
      } finally {
        abortRef.current = null;
      }
    },
    [],
  );

  const handleScanResult = useCallback(
    async (token: string) => {
      const now = Date.now();
      const last = lastScanRef.current;
      if (last && last.token === token && now - last.time < COOLDOWN_MS) return;
      if (now - lastRedeemRef.current < REDEEM_COOLDOWN_MS) return;
      lastScanRef.current = { token, time: now };

      const result = await lookupTicket(token);
      if (result.error) {
        if (soundEnabled) playBuzz(audioCtxRef.current);
        tryVibrate(200);
        dispatch({
          type: "REDEEM_DONE",
          feedbackType: "invalid",
          message: result.error,
        });
        statsHistDispatch({ type: "SET_HISTORY_ENTRY", entry: {
          token,
          status: "invalid",
          attendeeName: null,
          timestamp: Date.now(),
          ticketId: null,
        } });
        return;
      }

      if (result.ticket) {
        if (result.ticket.status === "used") {
          if (soundEnabled) playBuzz(audioCtxRef.current);
          tryVibrate([100, 100, 100]);
          dispatch({ type: "TICKET_FOUND", ticket: result.ticket });
        } else {
          if (soundEnabled) playBeep(audioCtxRef.current);
          tryVibrate(100);
          dispatch({ type: "TICKET_FOUND", ticket: result.ticket });
        }
      }
    },
    [lookupTicket, soundEnabled],
  );

  const handleConfirmRedeem = useCallback(async () => {
    if (state.phase !== "ticket_found") return;
    dispatch({ type: "CONFIRM" });
    const token = state.ticket.redemptionToken;
    const result = await redeemTicket(token);
    if (soundEnabled) {
      if (result.feedbackType === "success") playBeep(audioCtxRef.current);
      else playBuzz(audioCtxRef.current);
    }
    if (result.feedbackType === "success") {
      tryVibrate([50, 50, 50]);
    } else {
      tryVibrate(200);
    }

    const historyStatus: HistoryEntry["status"] =
      result.feedbackType === "success"
        ? "success"
        : result.feedbackType === "already_used"
          ? "already_used"
          : result.feedbackType === "invalid"
            ? "invalid"
            : "error";

    statsHistDispatch({ type: "SET_HISTORY_ENTRY", entry: {
      token,
      status: historyStatus,
      attendeeName: state.ticket.user.name,
      timestamp: Date.now(),
      ticketId: state.ticket.id,
    } });

    dispatch({
      type: "REDEEM_DONE",
      feedbackType: result.feedbackType,
      message: result.message,
    });
  }, [state, redeemTicket, soundEnabled]);

  const handleManualToken = useCallback(
    (token: string) => {
      handleScanResult(token);
    },
    [handleScanResult],
  );

  const onQrCodeSuccessRef = useRef<(text: string) => void>(() => {});
  const onQrCodeSuccess = useCallback(
    (decodedText: string) => {
      const token = extractToken(decodedText);
      if (!token) {
        if (soundEnabled) playBuzz(audioCtxRef.current);
        tryVibrate(200);
        dispatch({
          type: "REDEEM_DONE",
          feedbackType: "invalid",
          message: "Unrecognized format",
        });
        statsHistDispatch({ type: "SET_HISTORY_ENTRY", entry: {
          token: decodedText.slice(0, 20),
          status: "invalid",
          attendeeName: null,
          timestamp: Date.now(),
          ticketId: null,
        } });
        return;
      }
      handleScanResult(token);
    },
    [handleScanResult, soundEnabled],
  );

  useEffect(() => {
    onQrCodeSuccessRef.current = onQrCodeSuccess;
  }, [onQrCodeSuccess]);

  const startCamera = useCallback(async () => {
    try {
      setCameraDenied(false);
      setCameraError(null);

      // Check if mediaDevices is available (requires HTTPS or localhost)
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError(
          "Camera access not supported. Ensure:\n1. Using HTTPS (or localhost)\n2. Browser supports getUserMedia\n3. Device has a camera"
        );
        return;
      }

      // Step 1: Explicitly request permission first — this triggers the browser popup
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
      } catch (err: unknown) {
        if (
          err instanceof DOMException &&
          (err.name === "NotAllowedError" ||
            err.name === "PermissionDeniedError")
        ) {
          setCameraDenied(true);
        } else {
          setCameraError(err instanceof Error ? err.message : "Camera error");
        }
        return;
      }

      // Step 2: Stop the test stream — Html5Qrcode will open its own
      stream.getTracks().forEach((t) => t.stop());

      // Step 3: Now enumerate cameras (permission is already granted)
      const cameras = await Html5Qrcode.getCameras();
      if (cameras.length === 0) {
        setCameraError("No camera found on this device");
        return;
      }

      const backCamera =
        cameras.find(
          (c) =>
            c.label.toLowerCase().includes("back") ||
            c.label.toLowerCase().includes("environment"),
        ) || cameras[0];

      const scanner = new Html5Qrcode(SCANNER_ELEMENT_ID);
      scannerRef.current = scanner;
      setCameraActive(true);

      await scanner.start(
        backCamera.id,
        { fps: 10 },
        (text) => onQrCodeSuccessRef.current(text),
        () => {},
      );

      const cameraVideo = document
        .getElementById(SCANNER_ELEMENT_ID)
        ?.querySelector("video") as HTMLVideoElement | null;
      if (cameraVideo && cameraVideo.srcObject) {
        const mediaStream = cameraVideo.srcObject as MediaStream;
        videoTrackRef.current = mediaStream.getVideoTracks()[0];
        const cap = await supportsTorch(videoTrackRef.current);
        setTorchSupported(cap);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[Scanner] Camera start failed:", msg);
      setCameraActive(false);
      const isPermissionError =
        msg.toLowerCase().includes("permission") ||
        msg.toLowerCase().includes("denied") ||
        (err instanceof DOMException && err.name === "NotAllowedError");
      if (isPermissionError) {
        setCameraDenied(true);
      } else {
        setCameraError(msg || "Failed to start camera");
      }
      scannerRef.current = null;
    }
  }, []);

  const stopCamera = useCallback(async () => {
    videoTrackRef.current = null;
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch {}
      scannerRef.current = null;
    }
    setCameraActive(false);
  }, []);

  const handleStartScanning = useCallback(async () => {
    audioCtxRef.current = new AudioContext();
    await startCamera();
    if (scannerRef.current) {
      dispatch({ type: "START_SCANNING" });
    }
  }, [startCamera]);

  const fetchStats = useCallback(async () => {
    if (!eventId) return;
    try {
      const res = await fetch(
        `/api/admin/tickets/stats?eventId=${encodeURIComponent(eventId)}`,
      );
      if (res.ok) {
        const data = await res.json();
        statsHistDispatch({ type: "SET_STATS", stats: data });
      }
    } catch {}
  }, [eventId]);

  useEffect(() => {
    if (!eventId) return;
    const immediate = setTimeout(() => fetchStats(), 0);
    statsIntervalRef.current = setInterval(fetchStats, STATS_POLL_MS);
    return () => {
      clearTimeout(immediate);
      if (statsIntervalRef.current) clearInterval(statsIntervalRef.current);
    };
  }, [eventId, fetchStats]);

  useEffect(() => {
    // Reset entire scanner state when the event changes
    statsHistDispatch({ type: "RESET" });
  }, [eventId]);

  useEffect(() => {
    dispatch({ type: "STOP" });
    // eslint-disable-next-line react-hooks/set-state-in-effect -- stop camera when event changes
    stopCamera();
  }, [eventId, stopCamera]);

  useEffect(() => {
    if (!eventId) {
      fetch(`/api/events?t=${Date.now()}`)
        .then((r) => r.json())
        .then((d) => {
          if (d.success) eventsDispatch({ type: "SET_EVENTS", events: d.events });
        })
        .catch(() => {})
        .finally(() => eventsDispatch({ type: "SET_LOADING", loading: false }));
      eventsDispatch({ type: "SET_LOADING", loading: true });
    }
  }, [eventId]);

  useEffect(() => {
    return () => {
      stopCamera();
      if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
        audioCtxRef.current.close().catch(() => {});
      }
      if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, [stopCamera]);

  if (!eventId) {
    return (
      <div className="min-h-screen bg-zinc-50">
        <div className="max-w-4xl mx-auto px-6 py-16">
          <div className="mb-10">
            <h1 className="text-3xl font-black uppercase tracking-tighter mb-2">
              Ticket Scanner
            </h1>
            <p className="text-sm font-bold text-zinc-400 uppercase tracking-widest">
              Select an event to start scanning tickets
            </p>
          </div>

          {eventsState.eventsLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="bg-white rounded-[2rem] border border-black/5 shadow-sm p-8 animate-pulse"
                >
                  <div className="h-4 bg-zinc-100 rounded-full w-3/4 mb-4" />
                  <div className="h-3 bg-zinc-50 rounded-full w-1/2 mb-3" />
                  <div className="h-3 bg-zinc-50 rounded-full w-1/3" />
                </div>
              ))}
            </div>
          ) : eventsState.events.length === 0 ? (
            <div className="bg-white rounded-[2rem] border border-black/5 shadow-sm p-12 text-center">
              <div className="w-16 h-16 bg-zinc-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-zinc-300"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M15 5h2a2 2 0 012 2v2M5 15H3m12 0h2m-2 0a2 2 0 012 2v2M5 9H3m2 0a2 2 0 01-2-2V5m12 4V5a2 2 0 00-2-2H7a2 2 0 00-2 2v2m4 10h4"
                  />
                </svg>
              </div>
              <h2 className="text-lg font-bold text-slate-900 mb-2">
                No Events Found
              </h2>
              <p className="text-sm text-zinc-400">
                Create an event first before scanning tickets.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {eventsState.events.map((event) => (
                <button
                  key={event.id}
                  onClick={() =>
                    router.push(`/admin/tickets/scanner?eventId=${event.id}`)
                  }
                  className="bg-white rounded-[2rem] border border-black/5 shadow-sm p-8 text-left hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group cursor-pointer"
                >
                  <h3 className="font-black text-lg uppercase tracking-tight mb-3 group-hover:text-[#FACC15] transition-colors">
                    {event.title}
                  </h3>
                  <div className="space-y-2 text-sm text-zinc-400 font-medium">
                    <p>
                      {event.eventDate
                        ? new Date(event.eventDate).toLocaleDateString(
                            "en-US",
                            {
                              weekday: "short",
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            },
                          )
                        : "Date TBD"}
                    </p>
                    {event.venue && <p className="truncate">{event.venue}</p>}
                  </div>
                  <div className="mt-4 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#FACC15]">
                    <span>Scan Tickets</span>
                    <svg
                      className="w-4 h-4 transition-transform group-hover:translate-x-1"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 8l4 4m0 0l-4 4m4-4H3"
                      />
                    </svg>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (cameraError) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-200 text-center max-w-md">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-red-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">
            Camera Error
          </h2>
          <p className="text-sm text-gray-500 mb-4 break-words">
            {cameraError}
          </p>
          <button
            onClick={() => {
              setCameraError(null);
              dispatch({ type: "STOP" });
            }}
            className="px-6 py-2 bg-black text-white font-semibold text-sm rounded-xl hover:bg-slate-800 transition-colors"
          >
            Try Again
          </button>
          <button
            onClick={() => dispatch({ type: "OPEN_MANUAL_ENTRY" })}
            className="px-6 py-2 mt-2 bg-zinc-100 text-black font-semibold text-sm rounded-xl hover:bg-zinc-200 transition-colors w-full"
          >
            Enter Token Manually
          </button>
        </div>
      </div>
    );
  }

  if (cameraDenied) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-200 text-center max-w-md">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-red-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">
            Camera Access Required
          </h2>
          <p className="text-sm text-gray-500 mb-2">
            Camera permission was denied by the browser.
          </p>
          <p className="text-xs text-gray-400 mb-6">
            Click the lock/info icon in the address bar → Site settings → Camera
            → Allow, then reload.
          </p>
          <button
            onClick={() => dispatch({ type: "OPEN_MANUAL_ENTRY" })}
            className="px-6 py-2 bg-black text-white font-semibold text-sm rounded-xl hover:bg-slate-800 transition-colors w-full"
          >
            Enter Token Manually
          </button>
        </div>
      </div>
    );
  }

  const isScanning = state.phase === "scanning";

  return (
    <div className="h-screen bg-black flex flex-col relative overflow-hidden">
      {/* Manual entry overlay */}
      {state.phase === "manual_entry" && (
        <ManualEntry
          onTokenResolved={handleManualToken}
          onClose={() => dispatch({ type: "CANCEL_MANUAL_ENTRY" })}
        />
      )}

      {/* Ticket preview overlay */}
      {state.phase === "ticket_found" && (
        <TicketPreview
          ticket={state.ticket}
          onConfirm={handleConfirmRedeem}
          onCancel={() => dispatch({ type: "DISMISS_FEEDBACK" })}
          confirming={false}
        />
      )}

      {state.phase === "confirming" && (
        <TicketPreview
          ticket={state.ticket}
          onConfirm={handleConfirmRedeem}
          onCancel={() => dispatch({ type: "DISMISS_FEEDBACK" })}
          confirming={true}
        />
      )}

      {/* Feedback toast (non-blocking, slides up from bottom) */}
      {state.phase === "feedback" && (
        <div
          className="absolute bottom-44 left-4 right-4 z-50 animate-slide-up"
          onClick={() => dispatch({ type: "DISMISS_FEEDBACK" })}
        >
          <div
            className={`rounded-2xl px-5 py-3.5 text-center cursor-pointer shadow-lg backdrop-blur-sm ${
              state.type === "success"
                ? "bg-emerald-500/90 text-white"
                : state.type === "network_error"
                  ? "bg-yellow-500/90 text-black"
                  : "bg-red-500/90 text-white"
            }`}
          >
            <p className="text-sm font-bold">{state.message}</p>
          </div>
        </div>
      )}

      {/* Start scanning overlay */}
      {!isScanning &&
        state.phase !== "ticket_found" &&
        state.phase !== "confirming" &&
        state.phase !== "manual_entry" && (
          <div className="absolute inset-0 z-40 bg-black flex items-center justify-center">
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-white/10 flex items-center justify-center">
                <svg
                  className="w-10 h-10 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
                  />
                </svg>
              </div>
              <h1 className="text-white text-2xl font-black mb-2">
                Ticket Scanner
              </h1>
              <p className="text-white/60 text-sm mb-8 max-w-xs mx-auto">
                Point your camera at the QR code on the ticket to scan and
                validate entry.
              </p>
              <button
                onClick={handleStartScanning}
                className="px-8 py-3 bg-white text-black font-black text-sm uppercase tracking-wider rounded-2xl hover:bg-white/90 transition-all active:scale-95"
              >
                Start Scanning
              </button>
            </div>
          </div>
        )}

      {/* Header with controls */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/80 border-b border-white/10 z-10 shrink-0">
        <div className="flex items-center gap-3">
          <div
            className={`w-2.5 h-2.5 rounded-full ${cameraActive ? "bg-emerald-400 animate-pulse" : "bg-red-400"}`}
          />
          <span className="text-white text-sm font-semibold">
            {cameraActive ? "Scanning..." : "Camera Off"}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {torchSupported && (
            <button
              onClick={() => setTorchOn((p) => !p)}
              className={`text-xs font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full transition-colors ${
                torchOn
                  ? "bg-yellow-500/20 text-yellow-400"
                  : "bg-white/5 text-white/50 hover:text-white/80"
              }`}
            >
              {torchOn ? "Flash On" : "Flash"}
            </button>
          )}
          <button
            onClick={() => setSoundEnabled((p) => !p)}
            className={`text-xs font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full transition-colors ${
              soundEnabled
                ? "bg-white/10 text-white"
                : "bg-white/5 text-white/40"
            }`}
          >
            {soundEnabled ? "Sound On" : "Muted"}
          </button>
          <button
            onClick={() => dispatch({ type: "OPEN_MANUAL_ENTRY" })}
            className="text-xs font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full bg-white/5 text-white/50 hover:text-white/80 transition-colors"
          >
            Manual
          </button>
          <div className="text-right">
            <span className="text-white text-sm font-bold">
              {statsHistState.stats.redeemedCount} / {statsHistState.stats.totalTickets}
            </span>
            <span className="text-white/40 text-xs ml-2">Redeemed</span>
          </div>
        </div>
      </div>

      {/* Zoom slider */}
      <div className="absolute bottom-48 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 bg-black/60 rounded-full px-3 py-1.5">
        <svg
          className="w-3.5 h-3.5 text-white/50"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"
          />
        </svg>
        <input
          type="range"
          min="1"
          max="3"
          step="0.1"
          value={zoom}
          onChange={(e) => setZoom(parseFloat(e.target.value))}
          className="w-24 h-1 accent-white cursor-pointer"
        />
        <span className="text-white/50 text-[10px] font-mono w-6 text-right">
          {zoom.toFixed(1)}x
        </span>
      </div>

      {/* Scanner viewfinder */}
      <div className="flex-1 relative min-h-0">
        <div id={SCANNER_ELEMENT_ID} className="absolute inset-0" />

        {/* Scanning area overlay guide */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div
            className={`w-64 h-64 border-[3px] rounded-2xl transition-colors duration-300 ${
              state.phase === "feedback"
                ? state.type === "success"
                  ? "border-emerald-400 shadow-[0_0_30px_-5px_rgba(52,211,153,0.6)]"
                  : state.type === "network_error"
                    ? "border-yellow-400 shadow-[0_0_30px_-5px_rgba(234,179,8,0.6)]"
                    : "border-red-400 shadow-[0_0_30px_-5px_rgba(248,113,113,0.6)]"
                : "border-white/30"
            }`}
          />
        </div>
      </div>

      {/* Scan history */}
      <ScanHistory eventId={eventId} newEntry={statsHistState.historyEntry} />
    </div>
  );
}

import DashboardShell from "@/src/app/admin/dashboard/_components/dashboard-shell";

export default function ScannerPage() {
  return (
    <DashboardShell>
      <Suspense
        fallback={
          <div className="h-screen bg-black flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
          </div>
        }
      >
        <ScannerPageInner />
      </Suspense>
    </DashboardShell>
  );
}
