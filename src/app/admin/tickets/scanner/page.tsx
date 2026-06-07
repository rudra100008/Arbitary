"use client";

import { Suspense, useEffect, useRef, useState, useCallback } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { useSearchParams, useRouter } from "next/navigation";
import type { Event } from "@/src/types/db";

type FeedbackType = "success" | "already_used" | "invalid" | "network_error" | null;

type AuditEntry = {
  token: string;
  status: "success" | "already_used" | "invalid" | "error";
  message: string;
  timestamp: Date;
};

const SCANNER_ELEMENT_ID = "qr-scanner-element";
const COOLDOWN_MS = 3000;
const REQUEST_TIMEOUT_MS = 5000;
const STATS_POLL_MS = 10000;
const MAX_AUDIT_ENTRIES = 15;

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
  if (!audioCtx || audioCtx.state === 'closed') return;
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
  if (!audioCtx || audioCtx.state === 'closed') return;
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

function ScannerPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const eventId = searchParams.get("eventId");

  const [events, setEvents] = useState<Event[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const lastScanRef = useRef<{ token: string; time: number } | null>(null);
  const feedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const statsIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const [started, setStarted] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraDenied, setCameraDenied] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<FeedbackType>(null);
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [stats, setStats] = useState({ totalTickets: 0, redeemedCount: 0 });
  const [auditFeed, setAuditFeed] = useState<AuditEntry[]>([]);

  const showFeedback = useCallback((type: FeedbackType, message: string) => {
    if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    setFeedback(type);
    setFeedbackMessage(message);
    feedbackTimeoutRef.current = setTimeout(() => {
      setFeedback(null);
      setFeedbackMessage("");
    }, 1500);
  }, []);

  const addAuditEntry = useCallback((entry: Omit<AuditEntry, "timestamp">) => {
    setAuditFeed((prev) => {
      const next = [{ ...entry, timestamp: new Date() }, ...prev];
      return next.slice(0, MAX_AUDIT_ENTRIES);
    });
  }, []);

  const redeemTicket = useCallback(async (token: string) => {
    const controller = new AbortController();
    abortRef.current = controller;
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
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
        if (res.status === 404) {
          showFeedback("invalid", "❌ INVALID TICKET: Not found");
          addAuditEntry({ token, status: "invalid", message: "Ticket not found" });
          playBuzz(audioCtxRef.current);
        } else {
          showFeedback("invalid", `❌ ERROR: ${data.error || "Unknown error"}`);
          addAuditEntry({ token, status: "error", message: data.error || "Unknown error" });
          playBuzz(audioCtxRef.current);
        }
        return;
      }
      if (data.alreadyRedeemed) {
        const ts = data.redeemedAt ? new Date(data.redeemedAt).toLocaleString() : "unknown";
        showFeedback("already_used", `❌ ALREADY USED: ${ts}`);
        addAuditEntry({ token, status: "already_used", message: `Already used at ${ts}` });
        playBuzz(audioCtxRef.current);
      } else {
        showFeedback("success", "✅ TICKET VALID — Welcome!");
        addAuditEntry({ token, status: "success", message: "Redeemed successfully" });
        playBeep(audioCtxRef.current);
      }
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      if (err instanceof DOMException && err.name === "AbortError") {
        showFeedback("network_error", "⚠️ NETWORK ERROR: Connection timeout. Verify manually.");
        addAuditEntry({ token, status: "error", message: "Network timeout" });
      } else {
        showFeedback("network_error", "⚠️ NETWORK ERROR: Request failed. Verify manually.");
        addAuditEntry({ token, status: "error", message: "Request failed" });
      }
      playBuzz(audioCtxRef.current);
    } finally {
      abortRef.current = null;
    }
  }, [showFeedback, addAuditEntry]);

  // Refs to avoid stale closures in scanner callbacks
  const redeemTicketRef = useRef(redeemTicket);
  redeemTicketRef.current = redeemTicket;

  const showFeedbackRef = useRef(showFeedback);
  showFeedbackRef.current = showFeedback;

  const addAuditEntryRef = useRef(addAuditEntry);
  addAuditEntryRef.current = addAuditEntry;

  const onQrCodeSuccess = useCallback(async (decodedText: string) => {
    const token = extractToken(decodedText);
    if (!token) {
      showFeedbackRef.current("invalid", "❌ INVALID TICKET: Unrecognized format");
      addAuditEntryRef.current({ token: decodedText.slice(0, 20), status: "invalid", message: "Unrecognized format" });
      playBuzz(audioCtxRef.current);
      return;
    }
    const now = Date.now();
    const last = lastScanRef.current;
    if (last && last.token === token && now - last.time < COOLDOWN_MS) return;
    lastScanRef.current = { token, time: now };
    await redeemTicketRef.current(token);
  }, []);

  const startCamera = useCallback(async () => {
    try {
      const scanner = new Html5Qrcode(SCANNER_ELEMENT_ID);
      scannerRef.current = scanner;
      setCameraDenied(false);
      setCameraError(null);
      setCameraActive(true);
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10 },
        (text) => {
          console.log("[Scanner] QR detected:", text.slice(0, 40));
          onQrCodeSuccess(text);
        },
        (errMsg) => {
          if (errMsg) console.log("[Scanner] Frame error (no QR in view):", errMsg.slice(0, 60));
        },
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[Scanner] Camera start failed:", msg);
      setCameraActive(false);
      if (msg.toLowerCase().includes("permission")) {
        setCameraDenied(true);
      } else {
        setCameraError(msg || "Failed to start camera");
      }
      scannerRef.current = null;
    }
  }, [onQrCodeSuccess]);

  const stopCamera = useCallback(async () => {
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
      setStarted(true);
    }
  }, [startCamera]);

  const fetchStats = useCallback(async () => {
    if (!eventId) return;
    try {
      const res = await fetch(`/api/admin/tickets/stats?eventId=${encodeURIComponent(eventId)}`);
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch {}
  }, [eventId]);

  useEffect(() => {
    if (!eventId) return;
    fetchStats();
    statsIntervalRef.current = setInterval(fetchStats, STATS_POLL_MS);
    return () => {
      if (statsIntervalRef.current) clearInterval(statsIntervalRef.current);
    };
  }, [eventId, fetchStats]);

  useEffect(() => {
    if (!eventId) {
      setEventsLoading(true);
      fetch(`/api/events?t=${Date.now()}`)
        .then((r) => r.json())
        .then((d) => { if (d.success) setEvents(d.events); })
        .catch(() => {})
        .finally(() => setEventsLoading(false));
    }
  }, [eventId]);

  useEffect(() => {
    return () => {
      stopCamera();
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
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

          {eventsLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1,2,3].map((i) => (
                <div key={i} className="bg-white rounded-[2rem] border border-black/5 shadow-sm p-8 animate-pulse">
                  <div className="h-4 bg-zinc-100 rounded-full w-3/4 mb-4" />
                  <div className="h-3 bg-zinc-50 rounded-full w-1/2 mb-3" />
                  <div className="h-3 bg-zinc-50 rounded-full w-1/3" />
                </div>
              ))}
            </div>
          ) : events.length === 0 ? (
            <div className="bg-white rounded-[2rem] border border-black/5 shadow-sm p-12 text-center">
              <div className="w-16 h-16 bg-zinc-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-zinc-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 5h2a2 2 0 012 2v2M5 15H3m12 0h2m-2 0a2 2 0 012 2v2M5 9H3m2 0a2 2 0 01-2-2V5m12 4V5a2 2 0 00-2-2H7a2 2 0 00-2 2v2m4 10h4" />
                </svg>
              </div>
              <h2 className="text-lg font-bold text-slate-900 mb-2">No Events Found</h2>
              <p className="text-sm text-zinc-400">Create an event first before scanning tickets.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {events.map((event) => (
                <button
                  key={event.id}
                  onClick={() => router.push(`/admin/tickets/scanner?eventId=${event.id}`)}
                  className="bg-white rounded-[2rem] border border-black/5 shadow-sm p-8 text-left hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group cursor-pointer"
                >
                  <h3 className="font-black text-lg uppercase tracking-tight mb-3 group-hover:text-[#FACC15] transition-colors">
                    {event.title}
                  </h3>
                  <div className="space-y-2 text-sm text-zinc-400 font-medium">
                    <p>
                      {event.eventDate
                        ? new Date(event.eventDate).toLocaleDateString("en-US", {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })
                        : "Date TBD"}
                    </p>
                    {event.venue && <p className="truncate">{event.venue}</p>}
                  </div>
                  <div className="mt-4 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#FACC15]">
                    <span>Scan Tickets</span>
                    <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
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
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Camera Error</h2>
          <p className="text-sm text-gray-500 mb-4 break-words">{cameraError}</p>
          <button
            onClick={() => { setCameraError(null); setStarted(false); }}
            className="px-6 py-2 bg-black text-white font-semibold text-sm rounded-xl hover:bg-slate-800 transition-colors"
          >
            Try Again
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
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Camera Access Required</h2>
          <p className="text-sm text-gray-500 mb-4">Camera access required — please enable in browser settings to scan tickets.</p>
          <button
            onClick={() => setCameraDenied(false)}
            className="px-6 py-2 bg-black text-white font-semibold text-sm rounded-xl hover:bg-slate-800 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-black flex flex-col relative overflow-hidden">
      {/* Feedback overlay */}
      {feedback && (
        <div
          className={`absolute inset-0 z-50 flex items-center justify-center transition-opacity duration-200 ${
            feedback === "success"
              ? "bg-emerald-500/90"
              : feedback === "already_used"
              ? "bg-red-500/90"
              : feedback === "network_error"
              ? "bg-yellow-500/90"
              : "bg-red-500/90"
          }`}
        >
          <p className="text-white text-2xl font-black text-center px-6 leading-relaxed">
            {feedbackMessage}
          </p>
        </div>
      )}

      {/* Start scanning overlay */}
      {!started && (
        <div className="absolute inset-0 z-40 bg-black flex items-center justify-center">
          <div className="text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-white/10 flex items-center justify-center">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
            </div>
            <h1 className="text-white text-2xl font-black mb-2">Ticket Scanner</h1>
            <p className="text-white/60 text-sm mb-8 max-w-xs mx-auto">
              Point your camera at the QR code on the ticket to scan and validate entry.
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

      {/* Header with stats */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/80 border-b border-white/10 z-10 shrink-0">
        <div className="flex items-center gap-3">
          <div className={`w-2.5 h-2.5 rounded-full ${cameraActive ? "bg-emerald-400 animate-pulse" : "bg-red-400"}`} />
          <span className="text-white text-sm font-semibold">
            {cameraActive ? "Scanning..." : "Camera Off"}
          </span>
        </div>
        <div className="text-right">
          <span className="text-white text-sm font-bold">
            {stats.redeemedCount} / {stats.totalTickets}
          </span>
          <span className="text-white/40 text-xs ml-2">Redeemed</span>
        </div>
      </div>

      {/* Scanner viewfinder */}
      <div className="flex-1 relative min-h-0">
        <div id={SCANNER_ELEMENT_ID} className="absolute inset-0" />

        {/* Scanning area overlay guide */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div className="w-64 h-64 border-2 border-white/30 rounded-2xl" />
        </div>
      </div>

      {/* Audit feed */}
      <div className="bg-black/90 border-t border-white/10 max-h-48 overflow-y-auto shrink-0">
        <div className="px-4 py-2 border-b border-white/5">
          <span className="text-white/40 text-xs font-semibold uppercase tracking-wider">
            Recent Activity ({auditFeed.length})
          </span>
        </div>
        {auditFeed.length === 0 ? (
          <div className="px-4 py-6 text-center">
            <p className="text-white/20 text-sm">No scans yet</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {auditFeed.map((entry, i) => (
              <div key={i} className="px-4 py-2 flex items-center gap-3">
                <span className="text-lg">
                  {entry.status === "success" ? "✅" : entry.status === "already_used" ? "🔁" : "❌"}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-xs font-mono truncate">{entry.message}</p>
                  <p className="text-white/30 text-[10px] font-mono truncate">{entry.token}</p>
                </div>
                <span className="text-white/20 text-[10px] whitespace-nowrap">
                  {entry.timestamp.toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ScannerPage() {
  return (
    <Suspense fallback={<div className="h-screen bg-black flex items-center justify-center"><div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" /></div>}>
      <ScannerPageInner />
    </Suspense>
  );
}
