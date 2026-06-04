"use client";

import React from "react";

type Tab = "profile" | "settings" | "tasks" | "tickets";

interface ProfileSidebarProps {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
    role?: string;
  } | undefined;
  initials: string;
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  totalPoints: number;
  completedCount: number;
  completedToday: number;
  totalTasks: number;
}

const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
  {
    key: "profile",
    label: "Profile",
    icon: (
      <svg
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
        />
      </svg>
    ),
  },
  {
    key: "settings",
    label: "Settings",
    icon: (
      <svg
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
        />
      </svg>
    ),
  },
  {
    key: "tasks",
    label: "Tasks",
    icon: (
      <svg
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
  },
  {
    key: "tickets",
    label: "Tickets",
    icon: (
      <svg
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"
        />
      </svg>
    ),
  },
];

/**
 * Left sidebar containing the profile card, navigation tabs, and quick stats.
 */
export default function ProfileSidebar({
  user,
  initials,
  activeTab,
  onTabChange,
  totalPoints,
  completedCount,
  completedToday,
  totalTasks,
}: ProfileSidebarProps) {
  const completionPct = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;

  return (
    <div className="flex flex-col gap-4">
      {/* Profile card */}
      <div
        className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900
                      rounded-3xl px-5 pt-6 pb-5 transition-transform duration-300 hover:scale-[1.02] hover:shadow-xl"
      >
        <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white/5" />
        <div className="absolute right-6 -bottom-5 w-20 h-20 rounded-full bg-white/5" />

        <div className="relative z-10 flex flex-col items-center text-center gap-3">
          {/* Avatar */}
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl overflow-hidden ring-2 ring-white/10">
              {user?.image ? (
                <img
                  src={user.image}
                  alt={user.name || "User"}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-[#FACC15] flex items-center justify-center">
                  <span className="text-black font-black text-2xl">
                    {initials}
                  </span>
                </div>
              )}
            </div>
            <div
              className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-400 rounded-full
                            border-2 border-slate-900 flex items-center justify-center"
            >
              <div className="w-1.5 h-1.5 bg-white rounded-full" />
            </div>
          </div>

          <div>
            <p className="text-white font-bold text-sm">
              {user?.name || "User"}
            </p>
            <p className="text-white/40 text-xs mt-0.5 truncate max-w-[180px]">
              {user?.email}
            </p>
          </div>

          <span
            className="text-[10px] font-bold text-white/60 bg-white/10
                               px-2.5 py-1 rounded-full uppercase tracking-wider"
          >
            {user?.role || "Member"}
          </span>
        </div>
      </div>

      {/* Transition spacer */}
      <div className="relative h-3 -mx-2 -mt-4">
        <svg className="w-full h-full" viewBox="0 0 280 12" preserveAspectRatio="none">
          <path d="M0,12 Q140,-8 280,12" fill="white" />
        </svg>
      </div>

      {/* Nav tabs */}
      <div className="bg-white border border-gray-100 rounded-2xl p-2 shadow-sm -mt-5 flex flex-col gap-1">
        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 px-3 pt-1 pb-0.5">
          My Account
        </p>
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => onTabChange(tab.key)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold
                        transition-all duration-150 group text-left w-full
                        ${
                          activeTab === tab.key
                            ? "bg-slate-900 text-white shadow-sm"
                            : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                        }`}
          >
            <span
              className={`transition-colors ${activeTab === tab.key ? "text-[#FACC15]" : "text-gray-400 group-hover:text-gray-600"}`}
            >
              {tab.icon}
            </span>
            {tab.label}
            {activeTab === tab.key && (
              <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#FACC15]" />
            )}
          </button>
        ))}
      </div>

      {/* Stats mini card */}
      <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 mb-3">
          Quick Stats
        </p>
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="bg-slate-900 rounded-xl px-3 py-2.5">
            <p className="text-white/50 text-[10px] uppercase tracking-wider">
              Points
            </p>
            <p className="text-[#FACC15] text-lg font-black">
              {totalPoints}
            </p>
          </div>
          <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2.5">
            <p className="text-emerald-600 text-[10px] uppercase tracking-wider">
              Done
            </p>
            <p className="text-emerald-900 text-lg font-black">
              {completedCount}
            </p>
          </div>
          <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2.5">
            <p className="text-emerald-600 text-[10px] uppercase tracking-wider">
              Today
            </p>
            <p className="text-emerald-900 text-lg font-black">
              {completedToday}
            </p>
          </div>
        </div>
        {/* Progress bar */}
        <div>
          <div className="flex items-center justify-between text-[10px] text-gray-400 mb-1.5">
            <span>Completion</span>
            <span className="font-semibold text-gray-500">{completionPct}%</span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#FACC15] to-amber-400 rounded-full transition-all duration-700 ease-out"
              style={{ width: `${completionPct}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
