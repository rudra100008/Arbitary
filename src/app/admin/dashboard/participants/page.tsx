"use client";

import { useState, useEffect, useCallback, useReducer } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { parseSocialUrl } from "@/src/lib/social-url";
import { PlatformBadge } from "@/src/components/layout/manage-task/PlatformBadge";

type Category = "all" | "song" | "dance";
type Status = "all" | "pending" | "approved" | "rejected";

interface Submission {
  id: number;
  userId: number;
  category: string;
  name: string;
  email: string;
  phone: string | null;
  mediaUrl: string;
  mediaPlatform: string;
  status: string;
  rejectedReason: string | null;
  createdAt: string;
}

const STATUS_COLORS: Record<string, { bg: string; text: string; dot: string }> =
  {
    pending: {
      bg: "bg-yellow-50",
      text: "text-yellow-700",
      dot: "bg-yellow-400",
    },
    approved: {
      bg: "bg-green-50",
      text: "text-green-700",
      dot: "bg-green-500",
    },
    rejected: { bg: "bg-red-50", text: "text-red-700", dot: "bg-red-500" },
  };

const MAX_REASON_LENGTH = 250;

// ─── MEDIA PREVIEW ────────────────────────────────────────────────────────────
function MediaPreview({
  url,
  category,
  platform,
  name,
}: {
  url: string;
  category: string;
  platform: string;
  name: string;
}) {
  const [open, setOpen] = useState(false);
  const isLegacyUpload = platform === "legacy_upload";

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-indigo-600 hover:text-indigo-800 transition-colors"
      >
        {category === "dance" ? (
          <svg
            width="13"
            height="13"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <rect x="2" y="7" width="15" height="10" rx="2" />
            <path d="M17 9l5-3v12l-5-3" strokeLinecap="round" />
          </svg>
        ) : (
          <svg
            width="13"
            height="13"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path d="M9 18V5l12-2v13" strokeLinecap="round" />
            <circle cx="6" cy="18" r="3" />
            <circle cx="18" cy="16" r="3" />
          </svg>
        )}
        Preview
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-6"
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl overflow-hidden shadow-2xl max-w-2xl w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-black/8">
                <div className="flex items-center gap-2">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-black/35">
                      {category}
                    </p>
                    <p className="text-sm font-black text-black">{name}</p>
                  </div>
                  {!isLegacyUpload && <PlatformBadge platform={platform} />}
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="w-8 h-8 rounded-full border border-black/10 flex items-center justify-center text-black/40 hover:text-black transition-colors"
                >
                  <svg
                    width="12"
                    height="12"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
              <div className="p-5 bg-black/[0.02]">
                <MediaPreviewBody
                  url={url}
                  category={category}
                  platform={platform}
                />
              </div>
              {/* Always-present fallback link, per requirement that every
                  submission has a way to open the original source. */}
              <div className="px-5 py-3.5 border-t border-black/8 bg-white flex justify-end">
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-black uppercase tracking-widest px-5 py-2.5 rounded-full bg-black text-white hover:bg-black/80 transition-colors"
                >
                  Open Original Post ↗
                </a>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// ─── MEDIA PREVIEW BODY ───────────────────────────────────────────────────────
// Renders the actual preview surface: legacy Cloudinary player, a YouTube
// embed, or a fallback card (Instagram/Facebook — see embedding feasibility
// notes; arbitrary public posts can't be reliably embedded without
// privileged Graph API access, so we don't try).
function MediaPreviewBody({
  url,
  category,
  platform,
}: {
  url: string;
  category: string;
  platform: string;
}) {
  if (platform === "legacy_upload") {
    return category === "dance" ? (
      <video src={url} controls className="w-full rounded-xl max-h-[60vh]" />
    ) : (
      <div className="flex flex-col items-center gap-4 py-8">
        <div className="w-16 h-16 rounded-2xl bg-black flex items-center justify-center">
          <svg
            width="28"
            height="28"
            fill="none"
            stroke="white"
            strokeWidth="1.5"
            viewBox="0 0 24 24"
          >
            <path d="M9 18V5l12-2v13" strokeLinecap="round" />
            <circle cx="6" cy="18" r="3" />
            <circle cx="18" cy="16" r="3" />
          </svg>
        </div>
        <audio src={url} controls className="w-full" />
      </div>
    );
  }

  if (platform === "youtube") {
    const id = parseSocialUrl(url)?.id;
    if (id) {
      return (
        <iframe
          className="w-full aspect-video rounded-xl"
          src={`https://www.youtube.com/embed/${id}`}
          title="YouTube preview"
          allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
          sandbox="allow-scripts allow-same-origin allow-presentation"
          referrerPolicy="strict-origin-when-cross-origin"
        />
      );
    }
  }

  // Instagram / Facebook (and any YouTube URL that failed to re-parse)
  return (
    <div className="flex flex-col items-center gap-3 py-10">
      <PlatformBadge platform={platform} />
      <p className="text-sm text-black/50 text-center max-w-xs">
        This {platform === "instagram" ? "Instagram" : "Facebook"} content
        can&apos;t be embedded reliably inside the dashboard. Use &quot;Open
        Original Post&quot; below to review it.
      </p>
    </div>
  );
}

// ─── REJECT MODAL ─────────────────────────────────────────────────────────────
// Rendered via React Portal so the <div> overlay is mounted at document.body
// and never appears inside <tbody> — which would be invalid HTML and cause
// React hydration errors ("tbody cannot contain a div").
function RejectModal({
  onConfirm,
  onCancel,
}: {
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}) {
  const [reason, setReason] = useState("");
  const remaining = MAX_REASON_LENGTH - reason.length;
  const isOverLimit = remaining < 0;

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setReason(e.target.value.slice(0, MAX_REASON_LENGTH));
  }

  const content = (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-6"
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 flex flex-col gap-4"
      >
        <h3 className="text-lg font-black uppercase tracking-tight">
          Rejection reason
        </h3>
        <p className="text-xs text-black/50">
          Optional — will be shown to the participant. Cannot be changed after
          submitting.
        </p>
        <div className="relative">
          <textarea
            rows={3}
            value={reason}
            onChange={handleChange}
            placeholder="e.g. Audio quality too low, unrelated content…"
            className={`w-full text-sm px-4 py-3 rounded-xl border bg-black/[0.02] outline-none resize-none transition-colors ${
              isOverLimit
                ? "border-red-400 focus:border-red-500"
                : "border-black/10 focus:border-black/30"
            }`}
          />
          <span
            className={`absolute bottom-3 right-3 text-[10px] font-bold tabular-nums ${
              remaining <= 20 ? "text-red-500" : "text-black/25"
            }`}
          >
            {remaining}
          </span>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl border border-black/10 text-xs font-black uppercase tracking-wider text-black/50 hover:text-black transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(reason)}
            disabled={isOverLimit}
            className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-xs font-black uppercase tracking-wider hover:bg-red-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Confirm reject
          </button>
        </div>
      </motion.div>
    </motion.div>
  );

  // createPortal mounts at document.body, outside the <table> DOM tree entirely
  return createPortal(content, document.body);
}

// ─── SUBMISSION ROW ───────────────────────────────────────────────────────────
function SubmissionRow({
  s,
  onStatusChange,
}: {
  s: Submission;
  onStatusChange: (
    id: number,
    status: string,
    reason?: string,
  ) => Promise<void>;
}) {
  const [loading, setLoading] = useState(false);
  const [showReject, setShowReject] = useState(false);
  const colors = STATUS_COLORS[s.status] ?? STATUS_COLORS.pending;

  async function handle(status: "approved" | "rejected", reason?: string) {
    setLoading(true);
    await onStatusChange(s.id, status, reason);
    setLoading(false);
  }

  const dateStr = new Date(s.createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const actionButtons = loading ? (
    <svg
      className="animate-spin w-4 h-4 text-black/30"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  ) : (
    <div className="flex gap-2">
      {s.status !== "approved" && (
        <button
          onClick={() => handle("approved")}
          className="px-3 py-1.5 rounded-lg bg-green-500 text-white text-[10px] font-black uppercase tracking-wider hover:bg-green-600 transition-colors"
        >
          ✓ Approve
        </button>
      )}
      {s.status !== "rejected" && (
        <button
          onClick={() => setShowReject(true)}
          className="px-3 py-1.5 rounded-lg bg-red-100 text-red-600 text-[10px] font-black uppercase tracking-wider hover:bg-red-500 hover:text-white transition-colors"
        >
          ✕ Reject
        </button>
      )}
      {s.status !== "pending" && (
        <button
          onClick={() => handle("approved")}
          className="px-3 py-1.5 rounded-lg bg-black/5 text-black/50 text-[10px] font-black uppercase tracking-wider hover:bg-black/10 transition-colors"
        >
          Reset
        </button>
      )}
    </div>
  );

  return (
    <>
      <AnimatePresence>
        {showReject && (
          <RejectModal
            onConfirm={(r) => {
              setShowReject(false);
              handle("rejected", r);
            }}
            onCancel={() => setShowReject(false)}
          />
        )}
      </AnimatePresence>

      {/* Desktop row */}
      <div className="hidden sm:grid grid-cols-[1fr_2fr_1fr_1fr_1fr_1fr] gap-4 px-6 py-3.5 items-center hover:bg-black/[0.015] transition-colors group">
        {/* Category */}
        <span
          className={`inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full w-fit ${
            s.category === "dance"
              ? "bg-indigo-100 text-indigo-700"
              : "bg-black/8 text-black/60"
          }`}
        >
          {s.category === "dance" ? "💃" : "🎵"} {s.category}
        </span>

        {/* Name + email */}
        <div>
          <p className="text-sm font-bold text-black">{s.name}</p>
          <p className="text-[11px] text-black/40">{s.email}</p>
          {s.phone && <p className="text-[11px] text-black/30">{s.phone}</p>}
        </div>

        {/* Media */}
        <td className="px-4 py-3.5">
          <MediaPreview
            url={s.mediaUrl}
            category={s.category}
            platform={s.mediaPlatform}
            name={s.name}
          />
        </td>

        {/* Status */}
        <div>
          <span
            className={`inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full ${colors.bg} ${colors.text}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />
            {s.status}
          </span>
          {s.rejectedReason && (
            <p
              className="text-[10px] text-red-400 mt-1 max-w-[140px] truncate"
              title={s.rejectedReason}
            >
              {s.rejectedReason}
            </p>
          )}
        </div>

        {/* Date */}
        <span className="text-[11px] text-black/35">{dateStr}</span>

        {/* Actions */}
        <div className="flex justify-end opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
          {actionButtons}
        </div>
      </div>

      {/* Mobile card */}
      <div className="sm:hidden p-4 border-b border-black/5 hover:bg-black/[0.015] transition-colors">
        <div className="flex items-start justify-between mb-2">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-black truncate">{s.name}</p>
            <p className="text-[11px] text-black/40 truncate">{s.email}</p>
            {s.phone && <p className="text-[11px] text-black/30">{s.phone}</p>}
          </div>
          <div className="shrink-0 ml-2">{actionButtons}</div>
        </div>
        <div className="flex items-center gap-2 text-xs text-black/40 flex-wrap">
          <span
            className={`inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
              s.category === "dance"
                ? "bg-indigo-100 text-indigo-700"
                : "bg-black/8 text-black/60"
            }`}
          >
            {s.category === "dance" ? "💃" : "🎵"} {s.category}
          </span>
          <span className="text-zinc-300">·</span>
          <MediaPreview
            url={s.mediaUrl}
            category={s.category}
            platform={s.mediaPlatform}
            name={s.name}
          />
          <span className="text-zinc-300">·</span>
          <span
            className={`inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${colors.bg} ${colors.text}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />
            {s.status}
          </span>
          {s.rejectedReason && (
            <span className="text-[9px] text-red-400">
              · {s.rejectedReason}
            </span>
          )}
        </div>
        <p className="text-[10px] text-black/30 mt-1.5">{dateStr}</p>
      </div>
    </>
  );
}

type FetchState = { loading: boolean; submissions: Submission[]; hasMore: boolean; page: number };
type FetchAction =
  | { type: "FETCH_START" }
  | { type: "FETCH_SUCCESS"; submissions: Submission[]; hasMore: boolean; page: number }
  | { type: "FETCH_MORE_SUCCESS"; submissions: Submission[]; hasMore: boolean; page: number };

function fetchReducer(state: FetchState, action: FetchAction): FetchState {
  switch (action.type) {
    case "FETCH_START":
      return { ...state, loading: true };
    case "FETCH_SUCCESS":
      return { loading: false, submissions: action.submissions, hasMore: action.hasMore, page: action.page };
    case "FETCH_MORE_SUCCESS":
      return { loading: false, submissions: [...state.submissions, ...action.submissions], hasMore: action.hasMore, page: action.page };
  }
}

// ─── PAGE ─────────────────────────────────────────────────────────────────────
export default function AdminParticipantsPage() {
  const [fetchState, fetchDispatch] = useReducer(fetchReducer, { loading: true, submissions: [], hasMore: false, page: 1 });
  const [category, setCategory] = useState<Category>("all");
  const [status, setStatus] = useState<Status>("all");
  const [search, setSearch] = useState("");

  // filterKey bumps whenever category/status change so the main fetch effect
  // re-runs cleanly without needing fetchSubmissions in its dep array.
  const [filterKey, setFilterKey] = useState(0);

  // ── Primary fetch: runs on mount, filter change, or manual refresh ────────
  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams({ page: "1" });
    if (category !== "all") params.set("category", category);
    if (status !== "all") params.set("status", status);

    fetchDispatch({ type: "FETCH_START" });
    fetch(`/api/admin/participants?${params}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch");
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        fetchDispatch({ type: "FETCH_SUCCESS", submissions: data.submissions, hasMore: data.submissions.length === 20, page: 1 });
      })
      .catch(() => {
        if (!cancelled) toast.error("Failed to load submissions");
      });

    return () => {
      cancelled = true;
    };
    // filterKey is the manual-refresh escape hatch; category/status are filters.
     
  }, [category, status, filterKey]);

  // ── Load-more (append) ────────────────────────────────────────────────────
  const fetchSubmissions = useCallback(
    async (reset = false) => {
      if (reset) {
        // Trigger the primary effect instead of duplicating the logic.
        setFilterKey((k) => k + 1);
        return;
      }
      fetchDispatch({ type: "FETCH_START" });
      const p = fetchState.page + 1;
      const params = new URLSearchParams({ page: String(p) });
      if (category !== "all") params.set("category", category);
      if (status !== "all") params.set("status", status);
      if (search.trim()) params.set("search", search.trim());

      try {
        const res = await fetch(`/api/admin/participants?${params}`);
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        fetchDispatch({ type: "FETCH_MORE_SUCCESS", submissions: data.submissions, hasMore: data.submissions.length === 20, page: p });
      } catch {
        toast.error("Failed to load submissions");
      }
    },
    [category, status, search, fetchState.page],
  );

  // ── Debounced search ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!search.trim()) return;
    const t = setTimeout(() => {
      const params = new URLSearchParams({ page: "1" });
      if (category !== "all") params.set("category", category);
      if (status !== "all") params.set("status", status);
      params.set("search", search.trim());

      fetchDispatch({ type: "FETCH_START" });
      fetch(`/api/admin/participants?${params}`)
        .then((res) => {
          if (!res.ok) throw new Error("Failed to fetch");
          return res.json();
        })
        .then((data) => {
          fetchDispatch({ type: "FETCH_SUCCESS", submissions: data.submissions, hasMore: data.submissions.length === 20, page: 1 });
        })
        .catch(() => toast.error("Failed to load submissions"));
    }, 400);
    return () => clearTimeout(t);
  }, [search, category, status]);

  const handleStatusChange = useCallback(
    async (id: number, newStatus: string, reason?: string) => {
      try {
        const res = await fetch("/api/admin/participants", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, status: newStatus, rejectedReason: reason }),
        });

        if (res.status === 409) {
          toast.error(`Submission is already ${newStatus}`);
          return;
        }
        if (!res.ok) throw new Error();

        toast.success(`Submission ${newStatus}`);
        fetchDispatch({ type: "FETCH_SUCCESS", submissions: fetchState.submissions.map((s) =>
          s.id === id ? { ...s, status: newStatus, rejectedReason: reason ?? null } : s
        ), hasMore: fetchState.hasMore, page: fetchState.page });
      } catch {
        toast.error("Failed to update status");
      }
    },
    [fetchState.submissions, fetchState.hasMore, fetchState.page],
  );

  // Stats
  const stats = {
    total: fetchState.submissions.length,
    pending: fetchState.submissions.filter((s) => s.status === "pending").length,
    approved: fetchState.submissions.filter((s) => s.status === "approved").length,
    rejected: fetchState.submissions.filter((s) => s.status === "rejected").length,
  };

  return (
    <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-black/35 mb-1">
            Admin
          </p>
          <h1 className="text-3xl font-black uppercase tracking-tight">
            Participants
          </h1>
        </div>
        <button
          onClick={() => setFilterKey((k) => k + 1)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-black/10 text-xs font-black uppercase tracking-wider text-black/50 hover:text-black hover:border-black/25 transition-colors"
        >
          <svg
            width="13"
            height="13"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path
              d="M23 4v6h-6M1 20v-6h6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"
              strokeLinecap="round"
            />
          </svg>
          Refresh
        </button>
      </div>

      {/* Stat pills */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {
            label: "Total",
            value: stats.total,
            color: "bg-black/5 text-black",
          },
          {
            label: "Pending",
            value: stats.pending,
            color: "bg-yellow-50 text-yellow-700",
          },
          {
            label: "Approved",
            value: stats.approved,
            color: "bg-green-50 text-green-700",
          },
          {
            label: "Rejected",
            value: stats.rejected,
            color: "bg-red-50 text-red-600",
          },
        ].map((s) => (
          <div key={s.label} className={`rounded-2xl px-5 py-4 ${s.color}`}>
            <p className="text-2xl font-black">{s.value}</p>
            <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mt-0.5">
              {s.label}
            </p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        {/* Search */}
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 text-black/30 pointer-events-none"
            width="13"
            height="13"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
          </svg>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name…"
            className="pl-8 pr-4 py-2 text-sm rounded-xl border border-black/10 bg-white outline-none focus:border-black/30 w-full sm:w-52"
          />
        </div>

        {/* Category filter */}
        <div className="flex rounded-xl border border-black/10 overflow-hidden">
          {(["all", "song", "dance"] as Category[]).map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`px-4 py-2 text-[10px] font-black uppercase tracking-wider transition-colors ${category === c ? "bg-black text-white" : "bg-white text-black/45 hover:text-black"}`}
            >
              {c}
            </button>
          ))}
        </div>

        {/* Status filter */}
        <div className="flex rounded-xl border border-black/10 overflow-hidden">
          {(["all", "pending", "approved", "rejected"] as Status[]).map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={`px-4 py-2 text-[10px] font-black uppercase tracking-wider transition-colors ${status === s ? "bg-black text-white" : "bg-white text-black/45 hover:text-black"}`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-black/8 overflow-hidden bg-white">
        {fetchState.loading && fetchState.submissions.length === 0 ? (
          <div className="flex items-center justify-center py-20 text-black/30">
            <svg
              className="animate-spin w-5 h-5 mr-2"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            <span className="text-xs font-black uppercase tracking-widest">
              Loading…
            </span>
          </div>
        ) : fetchState.submissions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-black/30">
            <svg
              width="32"
              height="32"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              viewBox="0 0 24 24"
              className="mb-3"
            >
              <path d="M9 18V5l12-2v13" strokeLinecap="round" />
              <circle cx="6" cy="18" r="3" />
              <circle cx="18" cy="16" r="3" />
            </svg>
            <p className="text-xs font-black uppercase tracking-widest">
              No submissions found
            </p>
          </div>
        ) : (
          <>
            <div className="hidden sm:grid grid-cols-[1fr_2fr_1fr_1fr_1fr_1fr] gap-4 px-6 py-3 bg-black/[0.015] border-b border-black/8">
              {["Category", "Participant", "Media", "Status", "Date", ""].map(
                (h, i) => (
                  <span
                    key={h}
                    className={`text-[10px] font-black uppercase tracking-wider text-black/35 ${i === 5 ? "text-right" : ""}`}
                  >
                    {h}
                  </span>
                ),
              )}
            </div>
            <div className="divide-y divide-black/5">
              {fetchState.submissions.map((s) => (
                <SubmissionRow
                  key={s.id}
                  s={s}
                  onStatusChange={handleStatusChange}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Load more */}
      {fetchState.hasMore && (
        <button
          onClick={() => {
            fetchDispatch({ type: "FETCH_START" });
            fetchSubmissions();
          }}
          className="self-center px-6 py-2.5 rounded-full border border-black/10 text-xs font-black uppercase tracking-wider text-black/50 hover:text-black hover:border-black/25 transition-colors"
        >
          Load more
        </button>
      )}
    </div>
  );
}
