"use client";

import React, { useEffect, useRef, useState } from "react";
import { Bell, CheckCheck, Trash2, X } from "lucide-react";
import {
  useNotifications,
  type AppNotification,
} from "@/src/hooks/use-notifications";

const TYPE_ICON: Record<string, string> = {
  submission_rejected: "✕",
  submission_approved: "✓",
  points_awarded: "★",
  task_assigned: "＋",
  tier_upgrade: "▲",
  event_announcement: "🔔",
};

const TYPE_COLOR: Record<string, string> = {
  submission_rejected: "bg-red-100 text-red-600",
  submission_approved: "bg-emerald-100 text-emerald-600",
  points_awarded: "bg-amber-100 text-amber-600",
  task_assigned: "bg-blue-100 text-blue-600",
  tier_upgrade: "bg-purple-100 text-purple-600",
  event_announcement: "bg-pink-100 text-pink-600",
};

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

function NotificationRow({
  notification,
  onRead,
  onDelete,
}: {
  notification: AppNotification;
  onRead: (id: number) => void;
  onDelete: (id: number) => void;
}) {
  const icon = TYPE_ICON[notification.type] ?? "🔔";
  const color = TYPE_COLOR[notification.type] ?? "bg-zinc-100 text-zinc-600";

  return (
    <div
      className={`group relative w-full flex items-start gap-3 px-3 py-2.5 rounded-xl transition-colors duration-150
        ${notification.isRead ? "hover:bg-gray-50" : "bg-blue-50/60 hover:bg-blue-50"}`}
    >
      <button
        onClick={() => !notification.isRead && onRead(notification.id)}
        className="flex items-start gap-3 flex-1 min-w-0 text-left"
      >
        <div
          className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs font-black ${color}`}
        >
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-gray-800 leading-tight pr-5">
            {notification.title}
          </p>
          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2 pr-5">
            {notification.message}
          </p>
          <p className="text-[10px] text-gray-400 mt-1 font-medium uppercase tracking-wider">
            {timeAgo(notification.createdAt)}
          </p>
        </div>
        {!notification.isRead && (
          <span className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 shrink-0" />
        )}
      </button>

      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete(notification.id);
        }}
        aria-label="Delete notification"
        className="absolute top-2 right-2 w-5 h-5 flex items-center justify-center rounded-full text-gray-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [confirmClearAll, setConfirmClearAll] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
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

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setConfirmClearAll(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={dropdownRef} className="relative pointer-events-auto">
      <button
        onClick={() => setIsOpen((v) => !v)}
        aria-label="Notifications"
        className={`relative flex items-center justify-center w-10 h-10 rounded-full transition-all duration-200
          ${isOpen ? "bg-black/10" : "hover:bg-black/5"}`}
      >
        <Bell className="w-4.5 h-4.5 text-black/70" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 max-w-[90vw] z-[10000] bg-white rounded-2xl shadow-2xl shadow-black/10 border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h3 className="text-sm font-black uppercase tracking-widest text-gray-800">
              Notifications
            </h3>
            <div className="flex items-center gap-3">
              {unreadCount > 0 && (
                <button
                  onClick={() => markAllRead()}
                  className="flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-700"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  Mark all read
                </button>
              )}
              {notifications.length > 0 &&
                (confirmClearAll ? (
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-gray-500">
                      Clear all?
                    </span>
                    <button
                      onClick={() => {
                        deleteAllNotifications();
                        setConfirmClearAll(false);
                      }}
                      className="text-[11px] font-bold text-red-600 hover:text-red-700"
                    >
                      Yes
                    </button>
                    <button
                      onClick={() => setConfirmClearAll(false)}
                      className="text-[11px] font-bold text-gray-400 hover:text-gray-600"
                    >
                      No
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmClearAll(true)}
                    className="flex items-center gap-1 text-[11px] font-bold text-gray-400 hover:text-red-500"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Clear all
                  </button>
                ))}
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto p-2">
            {isLoading ? (
              <p className="text-center text-xs text-gray-400 py-8">
                Loading...
              </p>
            ) : isError ? (
              <p className="text-center text-xs text-red-500 py-8">
                Couldn&apos;t load notifications. Try again later.
              </p>
            ) : notifications.length === 0 ? (
              <p className="text-center text-xs text-gray-400 py-8">
                You&apos;re all caught up — no notifications yet.
              </p>
            ) : (
              <div className="space-y-1">
                {notifications.map((n) => (
                  <NotificationRow
                    key={n.id}
                    notification={n}
                    onRead={markRead}
                    onDelete={deleteNotification}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default NotificationBell;
