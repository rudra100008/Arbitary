"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { FraudReport, FraudUser } from "@/src/services/fraud.service";

const RISK_META = {
  sharedFingerprint: { label: "Shared Fingerprint", pts: 30, color: "text-orange-600", bg: "bg-orange-50" },
  multipleAccounts: { label: "Multi-Account Association", pts: 30, color: "text-red-600", bg: "bg-red-50" },
  fastCompletion: { label: "Fast Task Completion", pts: 20, color: "text-yellow-600", bg: "bg-yellow-50" },
  highVolume: { label: "High Submission Volume", pts: 20, color: "text-purple-600", bg: "bg-purple-50" },
};

export default function FraudTab() {
  const queryClient = useQueryClient();
  const [expandedUser, setExpandedUser] = useState<number | null>(null);

  const { data, isLoading } = useQuery<FraudReport>({
    queryKey: ["admin-fraud-report"],
    queryFn: async () => {
      const res = await fetch("/api/admin/fraud");
      if (!res.ok) throw new Error("Failed to load fraud report");
      return res.json();
    },
  });

  const clearFlagsMutation = useMutation({
    mutationFn: async (userId: number) => {
      const res = await fetch("/api/admin/fraud", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action: "clear_flags" }),
      });
      if (!res.ok) throw new Error("Failed to clear flags");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Flags cleared successfully");
      queryClient.invalidateQueries({ queryKey: ["admin-fraud-report"] });
    },
    onError: () => toast.error("Something went wrong"),
  });

  return (
    <div className="flex flex-col gap-5 w-full max-w-6xl mx-auto p-4 sm:p-6 text-black">
      {/* Header */}
      <div className="bg-white rounded-[2.5rem] border border-black/5 shadow-sm p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black uppercase tracking-tight">
              Fraud Detection
            </h2>
            <p className="text-xs text-zinc-400 font-medium mt-1">
              Risk-Scoring Engine — {data?.flaggedCount ?? 0} flagged of {data?.totalUsersScanned ?? 0} users
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-zinc-500 bg-zinc-100 px-3 py-1.5 rounded-full">
              Threshold: {">"}70 pts
            </span>
          </div>
        </div>
      </div>

      {/* Flagged users list */}
      {isLoading ? (
        <div className="bg-white rounded-[2.5rem] border border-black/5 shadow-sm p-12 flex justify-center">
          <div className="w-7 h-7 border-2 border-zinc-200 border-t-slate-900 rounded-full animate-spin" />
        </div>
      ) : !data || data.flaggedUsers.length === 0 ? (
        <div className="bg-white rounded-[2.5rem] border border-black/5 shadow-sm p-12 flex flex-col items-center gap-4">
          <div className="w-14 h-14 rounded-[2rem] bg-emerald-50 flex items-center justify-center">
            <svg className="w-7 h-7 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-sm font-black uppercase tracking-wider text-zinc-500">
            No flagged users
          </p>
          <p className="text-xs text-zinc-300 font-medium">
            All users are below the risk threshold
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {data.flaggedUsers.map((user) => (
            <FlaggedUserCard
              key={user.userId}
              user={user}
              isExpanded={expandedUser === user.userId}
              onToggle={() =>
                setExpandedUser(expandedUser === user.userId ? null : user.userId)
              }
              onClearFlags={() => clearFlagsMutation.mutate(user.userId)}
              isClearing={clearFlagsMutation.isPending}
            />
          ))}
        </div>
      )}
    </div>
  );
}

type FlaggedUserCardProps = {
  user: FraudUser;
  isExpanded: boolean;
  onToggle: () => void;
  onClearFlags: () => void;
  isClearing: boolean;
};

function FlaggedUserCard({
  user,
  isExpanded,
  onToggle,
  onClearFlags,
  isClearing,
}: FlaggedUserCardProps) {
  const scorePercent = Math.min(user.riskScore, 100);

  return (
    <div className="bg-white rounded-[2.5rem] border border-black/5 shadow-sm overflow-hidden transition-all">
      {/* Summary row */}
      <div className="flex items-center gap-4 px-6 py-4">
        <div className="relative w-14 h-14 shrink-0">
          <svg className="w-14 h-14 -rotate-90" viewBox="0 0 36 36">
            <circle cx="18" cy="18" r="15.5" fill="none" stroke="#e5e7eb" strokeWidth="3" />
            <circle
              cx="18" cy="18" r="15.5" fill="none"
              stroke={scorePercent >= 70 ? "#ef4444" : scorePercent >= 50 ? "#f59e0b" : "#10b981"}
              strokeWidth="3"
              strokeDasharray={`${scorePercent} ${100 - scorePercent}`}
              strokeLinecap="round"
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-xs font-black">
            {user.riskScore}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-black truncate">
            {user.userName || "Unknown User"}
          </p>
          <p className="text-xs text-zinc-400 font-medium truncate">
            {user.userEmail}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black uppercase tracking-wider text-red-600 bg-red-50 px-3 py-1.5 rounded-full">
            {user.completedTasks} tasks
          </span>
          <button
            onClick={onToggle}
            className="text-[10px] font-black uppercase tracking-wider text-zinc-500 bg-zinc-100 hover:bg-zinc-200 px-4 py-2 rounded-full transition-all"
          >
            {isExpanded ? "Hide" : "Details"}
          </button>
        </div>
      </div>

      {/* Expanded breakdown */}
      {isExpanded && (
        <div className="px-6 pb-4 border-t border-black/5 pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            {(Object.keys(RISK_META) as (keyof typeof RISK_META)[]).map((key) => {
              const meta = RISK_META[key];
              const value = user.breakdown[key];
              const triggered = value > 0;
              return (
                <div
                  key={key}
                  className={`flex items-center justify-between px-4 py-3 rounded-2xl ${triggered ? meta.bg : "bg-zinc-50"} border ${triggered ? "border-black/10" : "border-black/5"}`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold ${triggered ? meta.color : "text-zinc-400"}`}>
                      {triggered ? "[+]" : "[−]"} {meta.label}
                    </span>
                  </div>
                  <span className={`text-sm font-black ${triggered ? meta.color : "text-zinc-300"}`}>
                    {triggered ? `+${value}` : "0"}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClearFlags}
              disabled={isClearing}
              className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-300 text-white font-black text-xs uppercase tracking-wider rounded-2xl transition-all"
            >
              {isClearing ? "Clearing..." : "Dismiss Flags"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
