"use client";

import { useState, useEffect, useCallback } from "react";

type HistoryEntry = {
  token: string;
  status: "success" | "already_used" | "invalid" | "error";
  attendeeName: string | null;
  timestamp: number;
  ticketId: number | null;
};

type Props = {
  eventId: string;
  newEntry?: HistoryEntry | null;
};

const STORAGE_KEY_PREFIX = "scan-history-";
const MAX_ENTRIES = 100;

function loadHistory(eventId: string): HistoryEntry[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY_PREFIX + eventId);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveHistory(eventId: string, entries: HistoryEntry[]) {
  try {
    sessionStorage.setItem(STORAGE_KEY_PREFIX + eventId, JSON.stringify(entries));
  } catch {}
}

export default function ScanHistory({ eventId, newEntry }: Props) {
  const [entries, setEntries] = useState<HistoryEntry[]>(() => loadHistory(eventId));
  const [filter, setFilter] = useState<"all" | "success" | "rejected">("all");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- standard fetch-on-mount
    setEntries(loadHistory(eventId));
  }, [eventId]);

  useEffect(() => {
    if (!newEntry) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset UI state on entry change
    setEntries((prev) => {
      const next = [newEntry, ...prev].slice(0, MAX_ENTRIES);
      saveHistory(eventId, next);
      return next;
    });
  }, [newEntry, eventId]);

  const handleClear = useCallback(() => {
    setEntries([]);
    saveHistory(eventId, []);
  }, [eventId]);

  const filtered = entries.filter((e) => {
    if (filter === "success") return e.status === "success";
    if (filter === "rejected") return e.status !== "success";
    return true;
  });

  const successCount = entries.filter((e) => e.status === "success").length;
  const totalCount = entries.length;

  return (
    <div className="bg-black/90 border-t border-white/10 max-h-48 overflow-y-auto shrink-0">
      <div className="px-4 py-2 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-white/40 text-xs font-semibold uppercase tracking-wider">
            Scan History ({totalCount})
          </span>
          <span className="text-emerald-400/60 text-[10px] font-semibold">
            {successCount} accepted
          </span>
        </div>
        <div className="flex items-center gap-2">
          {(["all", "success", "rejected"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full transition-colors ${
                filter === f
                  ? "bg-white/10 text-white"
                  : "text-white/30 hover:text-white/60"
              }`}
            >
              {f}
            </button>
          ))}
          {entries.length > 0 && (
            <button
              onClick={handleClear}
              className="text-[10px] text-red-400/60 hover:text-red-400 font-semibold uppercase tracking-wider ml-1"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="px-4 py-6 text-center">
          <p className="text-white/20 text-sm">
            {entries.length === 0 ? "No scans yet" : "No matching entries"}
          </p>
        </div>
      ) : (
        <div className="divide-y divide-white/5">
          {filtered.map((entry, i) => (
            <div key={`${entry.timestamp}-${i}`} className="px-4 py-2 flex items-center gap-3">
              <span className="text-lg">
                {entry.status === "success" ? "✅" : entry.status === "already_used" ? "🔁" : "❌"}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-white text-xs font-mono truncate">
                  {entry.attendeeName ?? "Unknown"}
                </p>
                <p className="text-white/30 text-[10px] font-mono truncate">
                  {entry.token.slice(0, 16)}...
                </p>
              </div>
              <span className="text-white/20 text-[10px] whitespace-nowrap">
                {new Date(entry.timestamp).toLocaleTimeString()}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export type { HistoryEntry };
