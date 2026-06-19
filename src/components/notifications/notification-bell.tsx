"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  Bell,
  CheckCheck,
  Trash2,
  X,
  ChevronDown,
  ChevronUp,
  Music,
  Mic2,
  Star,
  Calendar,
  Zap,
} from "lucide-react";
import {
  useNotifications,
  type AppNotification,
} from "@/src/hooks/use-notifications";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function getRejectionReason(notification: AppNotification): string | null {
  if (
    notification.type !== "participant_rejected" &&
    notification.type !== "submission_rejected"
  )
    return null;
  const reason = notification.data?.reason;
  if (typeof reason === "string" && reason.trim().length > 0)
    return reason.trim();
  return null;
}

type NotifMeta = {
  icon: React.ReactNode;
  accentClass: string;
  dotClass: string;
  labelClass: string;
};

function getNotifMeta(type: string): NotifMeta {
  switch (type) {
    case "participant_approved":
    case "submission_approved":
      return {
        icon: <CheckCheck className="w-3.5 h-3.5" strokeWidth={2.5} />,
        accentClass: "bg-emerald-50 text-emerald-600",
        dotClass: "bg-emerald-500",
        labelClass: "text-emerald-700",
      };
    case "participant_rejected":
    case "submission_rejected":
      return {
        icon: <X className="w-3.5 h-3.5" strokeWidth={2.5} />,
        accentClass: "bg-rose-50 text-rose-500",
        dotClass: "bg-rose-500",
        labelClass: "text-rose-600",
      };
    case "points_awarded":
    case "tier_upgrade":
      return {
        icon: <Star className="w-3.5 h-3.5" strokeWidth={2.5} />,
        accentClass: "bg-amber-50 text-amber-600",
        dotClass: "bg-amber-500",
        labelClass: "text-amber-700",
      };
    case "event_announcement":
      return {
        icon: <Calendar className="w-3.5 h-3.5" strokeWidth={2.5} />,
        accentClass: "bg-violet-50 text-violet-600",
        dotClass: "bg-violet-500",
        labelClass: "text-violet-700",
      };
    case "task_assigned":
      return {
        icon: <Zap className="w-3.5 h-3.5" strokeWidth={2.5} />,
        accentClass: "bg-blue-50 text-blue-600",
        dotClass: "bg-blue-500",
        labelClass: "text-blue-700",
      };
    default:
      return {
        icon: <Bell className="w-3.5 h-3.5" strokeWidth={2.5} />,
        accentClass: "bg-zinc-100 text-zinc-500",
        dotClass: "bg-zinc-400",
        labelClass: "text-zinc-600",
      };
  }
}

// ─── Rejection Reason Block ────────────────────────────────────────────────────

function RejectionReasonBlock({ reason }: { reason: string }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = reason.length > 90;
  const displayText =
    isLong && !expanded ? reason.slice(0, 90).trimEnd() + "…" : reason;

  return (
    <div
      className="mt-2.5 rounded-lg px-3 py-2.5"
      style={{
        background: "rgba(244, 63, 94, 0.06)",
        border: "1px solid rgba(244, 63, 94, 0.14)",
      }}
    >
      <p
        className="text-[10px] font-semibold uppercase tracking-widest mb-1"
        style={{ color: "rgba(244, 63, 94, 0.6)" }}
      >
        Admin feedback
      </p>
      <p
        className="text-xs leading-relaxed"
        style={{ color: "rgba(30, 10, 14, 0.75)" }}
      >
        {displayText}
      </p>
      {isLong && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setExpanded((v) => !v);
          }}
          className="mt-1.5 flex items-center gap-1 text-[11px] font-semibold"
          style={{ color: "rgba(244, 63, 94, 0.7)" }}
        >
          {expanded ? (
            <>
              <ChevronUp className="w-3 h-3" /> Show less
            </>
          ) : (
            <>
              <ChevronDown className="w-3 h-3" /> Show more
            </>
          )}
        </button>
      )}
    </div>
  );
}

// ─── Notification Row ──────────────────────────────────────────────────────────

function NotificationRow({
  notification,
  isNew,
  onRead,
  onDelete,
}: {
  notification: AppNotification;
  isNew: boolean;
  onRead: (id: number) => void;
  onDelete: (id: number) => void;
}) {
  const { icon, accentClass, dotClass } = getNotifMeta(notification.type);
  const rejectionReason = getRejectionReason(notification);
  const isRejection =
    notification.type === "participant_rejected" ||
    notification.type === "submission_rejected";
  const isApproval =
    notification.type === "participant_approved" ||
    notification.type === "submission_approved";

  return (
    <div
      className={[
        "group relative rounded-xl transition-all duration-300",
        notification.isRead ? "hover:bg-black/[0.025]" : "",
        isNew ? "animate-notif-in" : "",
      ].join(" ")}
      style={
        !notification.isRead
          ? {
              background: isRejection
                ? "rgba(254, 242, 242, 0.7)"
                : isApproval
                  ? "rgba(240, 253, 244, 0.7)"
                  : "rgba(239, 246, 255, 0.7)",
            }
          : undefined
      }
    >
      <button
        className="w-full flex items-start gap-3 px-3.5 py-3 text-left"
        onClick={() => !notification.isRead && onRead(notification.id)}
        aria-label={`Notification: ${notification.title}`}
      >
        {/* Icon bubble */}
        <div
          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${accentClass}`}
        >
          {icon}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p
              className={`text-[13px] leading-snug pr-2 ${notification.isRead ? "font-medium text-gray-700" : "font-semibold text-gray-900"}`}
            >
              {notification.title}
            </p>
            {!notification.isRead && (
              <span
                className={`mt-1 w-2 h-2 rounded-full shrink-0 ${dotClass}`}
              />
            )}
          </div>

          <p className="text-[12px] text-gray-500 mt-0.5 leading-relaxed pr-2">
            {notification.message}
          </p>

          {rejectionReason && <RejectionReasonBlock reason={rejectionReason} />}

          <p
            className={`text-[11px] mt-2 font-medium ${notification.isRead ? "text-gray-400" : "text-gray-500"}`}
          >
            {timeAgo(notification.createdAt)}
          </p>
        </div>
      </button>

      {/* Delete — always visible on touch, hover-only on desktop */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete(notification.id);
        }}
        aria-label="Dismiss"
        className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full flex items-center justify-center text-gray-300 hover:text-gray-600 hover:bg-black/[0.06] transition-all duration-150 opacity-0 group-hover:opacity-100 touch-visible-delete"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ─── Empty State ───────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
      <div className="relative mb-4">
        <div className="w-14 h-14 rounded-2xl bg-black/[0.04] flex items-center justify-center">
          <Bell className="w-6 h-6 text-black/25" strokeWidth={1.5} />
        </div>
        <Music
          className="absolute -top-1 -right-2 w-3.5 h-3.5 text-black/15"
          strokeWidth={2}
        />
        <Mic2
          className="absolute -bottom-1 -left-2 w-3.5 h-3.5 text-black/15"
          strokeWidth={2}
        />
      </div>
      <p className="text-[13px] font-semibold text-gray-800 mb-1">
        All caught up
      </p>
      <p className="text-[12px] text-gray-400 max-w-[180px] leading-relaxed">
        Submission updates and event news will appear here.
      </p>
    </div>
  );
}

// ─── Bell + Dropdown ──────────────────────────────────────────────────────────

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [confirmClearAll, setConfirmClearAll] = useState(false);
  const [newIds, setNewIds] = useState<Set<number>>(new Set());
  const [isMobile, setIsMobile] = useState(false);
  const [mounted, setMounted] = useState(false);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLButtonElement>(null);
  // ▼ NEW: ref for the portalled mobile sheet so outside-click ignores it
  const sheetRef = useRef<HTMLDivElement>(null);
  const prevIdsRef = useRef<Set<number>>(new Set());

  const {
    notifications,
    unreadCount,
    isLoading,
    isError,
    markRead,
    markAllRead,
    deleteNotification,
    deleteAllNotifications,
  } = useNotifications();

  // Portal needs DOM mounted
  useEffect(() => {
    setMounted(true);
  }, []);

  // Detect mobile breakpoint
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Track newly-arrived notifications for entrance animation
  useEffect(() => {
    const currentIds = new Set(notifications.map((n) => n.id));
    const arrived = new Set<number>();
    currentIds.forEach((id) => {
      if (!prevIdsRef.current.has(id)) arrived.add(id);
    });
    prevIdsRef.current = currentIds;
    if (arrived.size > 0) {
      setNewIds(arrived);
      const timer = setTimeout(() => setNewIds(new Set()), 2000);
      return () => clearTimeout(timer);
    }
  }, [notifications]);

  // Close on outside click / Escape
  // ▼ CHANGED: also check sheetRef so clicks inside the portal don't close
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node;
      const insideWrapper = wrapperRef.current?.contains(target);
      const insideSheet = sheetRef.current?.contains(target);
      if (!insideWrapper && !insideSheet) {
        setIsOpen(false);
        setConfirmClearAll(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
        setConfirmClearAll(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, []);

  // Lock body scroll when mobile sheet is open
  useEffect(() => {
    if (isMobile && isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobile, isOpen]);

  const hasNotifications = notifications.length > 0;

  const close = useCallback(() => {
    setIsOpen(false);
    setConfirmClearAll(false);
  }, []);

  // ── Header (shared between sheet and dropdown) ──────────────────────────
  const header = (
    <div
      className="flex items-center justify-between px-4 py-3.5 shrink-0"
      style={{ borderBottom: "1px solid rgba(0,0,0,0.06)" }}
    >
      <div className="flex items-center gap-2.5">
        {isMobile && (
          <button
            onClick={close}
            className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-black/[0.06] transition-colors mr-0.5"
            aria-label="Close"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        )}
        <h3 className="text-[13px] font-bold text-gray-900 tracking-tight">
          Notifications
        </h3>
        {unreadCount > 0 && (
          <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-rose-500 text-white text-[10px] font-bold">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </div>
      <div className="flex items-center gap-3">
        {unreadCount > 0 && (
          <button
            onClick={() => markAllRead()}
            className="flex items-center gap-1.5 text-[12px] font-semibold text-gray-500 hover:text-gray-800 transition-colors"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">Mark all read</span>
            <span className="xs:hidden">Mark read</span>
          </button>
        )}
        {hasNotifications &&
          (confirmClearAll ? (
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-gray-400">Clear all?</span>
              <button
                onClick={() => {
                  deleteAllNotifications();
                  setConfirmClearAll(false);
                }}
                className="text-[12px] font-semibold text-rose-500 hover:text-rose-600"
              >
                Yes
              </button>
              <button
                onClick={() => setConfirmClearAll(false)}
                className="text-[12px] font-semibold text-gray-400 hover:text-gray-600"
              >
                No
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmClearAll(true)}
              className="flex items-center gap-1 text-[12px] font-semibold text-gray-400 hover:text-rose-500 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>
          ))}
      </div>
    </div>
  );

  // ── Notification list (shared) ──────────────────────────────────────────
  const list = (
    <div
      className="overflow-y-auto overscroll-contain flex-1 min-h-0"
      style={{ WebkitOverflowScrolling: "touch" }}
    >
      {isLoading ? (
        <div className="flex flex-col gap-2.5 p-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex items-start gap-3 px-3.5 py-3 animate-pulse"
            >
              <div className="w-8 h-8 rounded-lg bg-gray-100 shrink-0" />
              <div className="flex-1 space-y-2 pt-0.5">
                <div className="h-3 bg-gray-100 rounded w-3/4" />
                <div className="h-2.5 bg-gray-100 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center py-10 gap-2">
          <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center">
            <X className="w-5 h-5 text-rose-400" />
          </div>
          <p className="text-[12px] text-gray-500 text-center px-6">
            Couldn&apos;t load notifications. Try again later.
          </p>
        </div>
      ) : notifications.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="p-2 space-y-0.5">
          {notifications.map((n) => (
            <NotificationRow
              key={n.id}
              notification={n}
              isNew={newIds.has(n.id)}
              onRead={markRead}
              onDelete={deleteNotification}
            />
          ))}
        </div>
      )}
    </div>
  );

  const footer =
    hasNotifications && !isLoading && !isError ? (
      <div
        className="px-4 py-2.5 flex items-center justify-center shrink-0"
        style={{ borderTop: "1px solid rgba(0,0,0,0.05)" }}
      >
        <p className="text-[11px] text-gray-400 font-medium">
          {notifications.length} notification
          {notifications.length !== 1 ? "s" : ""}
        </p>
      </div>
    ) : null;

  return (
    <div ref={wrapperRef} className="relative pointer-events-auto">
      <style>{`
        @keyframes notifSlideIn {
          from { opacity: 0; transform: translateY(-5px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes notifSheetUp {
          from { opacity: 0; transform: translateY(100%); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes notifFadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes pulseGlow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(244,63,94,0.4); }
          50%       { box-shadow: 0 0 0 5px rgba(244,63,94,0); }
        }
        .animate-notif-in { animation: notifSlideIn 0.28s cubic-bezier(0.22,1,0.36,1) both; }
        .notif-dropdown-anim { animation: notifSlideIn 0.2s cubic-bezier(0.22,1,0.36,1) both; transform-origin: top right; }
        .notif-sheet-anim { animation: notifSheetUp 0.3s cubic-bezier(0.22,1,0.36,1) both; }
        .notif-overlay-anim { animation: notifFadeIn 0.2s ease both; }
        .badge-pulse { animation: pulseGlow 1.8s ease-in-out 2; }
        @media (hover: none) {
          .touch-visible-delete { opacity: 1 !important; }
        }
      `}</style>

      {/* Bell trigger */}
      <button
        ref={bellRef}
        onClick={() => {
          setIsOpen((v) => !v);
          setConfirmClearAll(false);
        }}
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`}
        aria-expanded={isOpen}
        className={`relative flex items-center justify-center w-10 h-10 rounded-full transition-all duration-200 ${
          isOpen ? "bg-black/10" : "hover:bg-black/[0.06]"
        }`}
      >
        <Bell
          className={`w-[18px] h-[18px] transition-colors duration-200 ${isOpen ? "text-black/80" : "text-black/60"}`}
          strokeWidth={1.8}
        />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center leading-none badge-pulse">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* ── Mobile: portalled bottom sheet so it escapes header overflow clipping
           sheetRef is passed to the sheet div so outside-click ignores it    ── */}
      {isOpen &&
        isMobile &&
        mounted &&
        createPortal(
          <>
            {/* Scrim — click closes, but NOT via the outside-click handler */}
            <div
              className="notif-overlay-anim fixed inset-0 z-[9999] bg-black/30"
              onClick={close}
              aria-hidden="true"
            />
            {/* Sheet */}
            <div
              ref={sheetRef}
              className="notif-sheet-anim fixed bottom-0 left-0 right-0 z-[10000] bg-white flex flex-col overflow-hidden"
              style={{
                borderRadius: "20px 20px 0 0",
                maxHeight: "85dvh",
                border: "1px solid rgba(0,0,0,0.08)",
                boxShadow: "0 -4px 40px rgba(0,0,0,0.15)",
              }}
              role="dialog"
              aria-modal="true"
              aria-label="Notifications"
            >
              {/* Drag handle */}
              <div className="flex justify-center pt-3 pb-1 shrink-0">
                <div className="w-10 h-1 rounded-full bg-gray-300" />
              </div>
              {header}
              {list}
              {footer}
            </div>
          </>,
          document.body,
        )}

      {/* ── Desktop: anchored dropdown ── */}
      {isOpen && !isMobile && (
        <div
          className="notif-dropdown-anim absolute z-[10000] bg-white rounded-2xl overflow-hidden flex flex-col"
          style={{
            right: 0,
            width: "440px",
            maxWidth: "calc(100vw - 16px)",
            top: "calc(100% + 10px)",
            border: "1px solid rgba(0,0,0,0.08)",
            boxShadow:
              "0 4px 6px -1px rgba(0,0,0,0.07), 0 10px 40px -4px rgba(0,0,0,0.12)",
            maxHeight: "600px",
          }}
          role="dialog"
          aria-modal="true"
          aria-label="Notifications"
        >
          {header}
          {list}
          {footer}
        </div>
      )}
    </div>
  );
}

export default NotificationBell;
