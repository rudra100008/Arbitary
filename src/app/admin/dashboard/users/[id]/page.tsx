"use client";

import { useEffect, useReducer } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  AtSign,
  Coins,
  ClipboardList,
} from "lucide-react";

interface UserProfile {
  id: number;
  name: string | null;
  email: string;
  image: string | null;
  bio: string | null;
  location: string | null;
  phoneNumber: string | null;
  referralCode: string | null;
  points: number;
  lifetimePoints: number;
  referredBy: number | null;
  referredByName: string | null;
  instagramUsername: string | null;
}

interface AssignedTask {
  id: number;
  taskId: number | null;
  title: string | null;
  taskType: string | null;
  points: number | null;
  status: string;
  assignedAt: string | null;
  completedAt: string | null;
  rejectionReason: string | null;
}

interface PointsHistoryEntry {
  id: number;
  points: number;
  reason: string | null;
  createdAt: string | null;
  taskTitle: string | null;
}

interface UserDetail {
  profile: UserProfile;
  assignedTasks: AssignedTask[];
  pointsHistory: PointsHistoryEntry[];
}

function formatDate(d: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleString();
}

const STATUS_COLORS: Record<string, string> = {
  "In Progress": "bg-[#FACC15]/10 text-[#FACC15]",
  "Pending Verification": "bg-blue-50 text-blue-500",
  Verified: "bg-green-50 text-green-500",
  Rejected: "bg-red-50 text-red-500",
  active: "bg-green-50 text-green-500",
  redeemed: "bg-zinc-100 text-zinc-500",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-full whitespace-nowrap ${
        STATUS_COLORS[status] ?? "bg-zinc-100 text-zinc-500"
      }`}
    >
      {status}
    </span>
  );
}

function SectionCard({
  icon,
  title,
  children,
  emptyMessage,
  isEmpty,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  emptyMessage: string;
  isEmpty: boolean;
}) {
  return (
    <div className="bg-white rounded-[2rem] border border-black/5 shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 px-6 py-4 border-b border-black/5">
        <span className="text-zinc-400">{icon}</span>
        <h3 className="text-xs font-black uppercase tracking-widest text-zinc-700">
          {title}
        </h3>
      </div>
      {isEmpty ? (
        <p className="px-6 py-8 text-sm text-zinc-400 text-center">
          {emptyMessage}
        </p>
      ) : (
        <div className="divide-y divide-black/5">{children}</div>
      )}
    </div>
  );
}

type UserDetailState = { data: UserDetail | null; loading: boolean; error: string | null };
type UserDetailAction =
  | { type: "FETCH_START" }
  | { type: "FETCH_SUCCESS"; data: UserDetail }
  | { type: "FETCH_ERROR"; error: string };

function userDetailReducer(state: UserDetailState, action: UserDetailAction): UserDetailState {
  switch (action.type) {
    case "FETCH_START":
      return { data: null, loading: true, error: null };
    case "FETCH_SUCCESS":
      return { data: action.data, loading: false, error: null };
    case "FETCH_ERROR":
      return { data: null, loading: false, error: action.error };
  }
}

export default function AdminUserDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [state, dispatch] = useReducer(userDetailReducer, { data: null, loading: true, error: null });

  useEffect(() => {
    let cancelled = false;
    dispatch({ type: "FETCH_START" });
    fetch(`/api/admin/users/${params.id}`)
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || "Failed to load user");
        if (!cancelled) dispatch({ type: "FETCH_SUCCESS", data: body });
      })
      .catch((err) => {
        if (!cancelled) dispatch({ type: "FETCH_ERROR", error: err.message || "Failed to load user" });
      });
    return () => {
      cancelled = true;
    };
  }, [params.id]);

  return (
    <div className="animate-fade-in space-y-6">
      <button
        onClick={() => router.push("/admin/dashboard/users")}
        className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-black transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to Users
      </button>

      {state.loading ? (
        <div className="bg-white rounded-[2rem] border border-black/5 shadow-sm p-10 text-center text-sm text-zinc-400">
          Loading user…
        </div>
      ) : state.error ? (
        <div className="bg-white rounded-[2rem] border border-black/5 shadow-sm p-10 text-center text-sm text-red-500">
          {state.error}
        </div>
      ) : state.data ? (
        <>
          {/* Profile header */}
          <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-black/5 shadow-sm flex flex-col sm:flex-row sm:items-center gap-6">
            <div className="w-16 h-16 rounded-full bg-[#FACC15] flex items-center justify-center shrink-0 text-2xl font-black text-black">
              {(state.data!.profile.name ?? state.data!.profile.email)
                .substring(0, 2)
                .toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-black uppercase tracking-tight">
                {state.data!.profile.name ?? (
                  <span className="italic text-zinc-400">No name</span>
                )}
              </h1>
              <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-zinc-500 font-medium">
                <span className="inline-flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5" /> {state.data!.profile.email}
                </span>
                {state.data!.profile.phoneNumber && (
                  <span className="inline-flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5" /> {state.data!.profile.phoneNumber}
                  </span>
                )}
                {state.data!.profile.location && (
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5" /> {state.data!.profile.location}
                  </span>
                )}
                {state.data!.profile.instagramUsername && (
                  <span className="inline-flex items-center gap-1.5">
                    <AtSign className="w-3.5 h-3.5" /> @
                    {state.data!.profile.instagramUsername}
                  </span>
                )}
              </div>
              {state.data!.profile.bio && (
                <p className="text-sm text-zinc-600 mt-3 max-w-2xl">
                  {state.data!.profile.bio}
                </p>
              )}
              {state.data!.profile.referredByName && (
                <p className="text-[11px] text-zinc-400 font-medium mt-2">
                  Referred by {state.data!.profile.referredByName}
                </p>
              )}
            </div>
            <div className="flex gap-6 sm:gap-8 sm:border-l sm:border-black/5 sm:pl-8">
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400">
                  Points
                </p>
                <p className="text-2xl font-black">
                  {state.data!.profile.points.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400">
                  Referral Code
                </p>
                <p className="text-sm font-bold text-zinc-600">
                  {state.data!.profile.referralCode ?? "—"}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
            {/* Assigned Tasks */}
            <SectionCard
              icon={<ClipboardList className="w-4 h-4" />}
              title="Assigned Tasks"
              isEmpty={state.data!.assignedTasks.length === 0}
              emptyMessage="No tasks assigned yet."
            >
              {state.data!.assignedTasks.map((t) => (
                <div
                  key={t.id}
                  className="px-6 py-4 flex items-center justify-between gap-4"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-zinc-800 truncate">
                      {t.title ?? "Unknown task"}
                    </p>
                    <p className="text-[10px] text-zinc-400 font-medium mt-0.5">
                      {t.taskType ?? "—"} · {t.points ?? 0} pts ·{" "}
                      {formatDate(t.assignedAt)}
                    </p>
                    {t.status === "Rejected" && t.rejectionReason && (
                      <p className="text-[10px] text-red-500 font-medium mt-1">
                        Rejected: {t.rejectionReason}
                      </p>
                    )}
                  </div>
                  <StatusBadge status={t.status} />
                </div>
              ))}
            </SectionCard>

            {/* Points History */}
            <SectionCard
              icon={<Coins className="w-4 h-4" />}
              title="Points History"
              isEmpty={state.data!.pointsHistory.length === 0}
              emptyMessage="No points activity yet."
            >
              {state.data!.pointsHistory.map((p) => (
                <div
                  key={p.id}
                  className="px-6 py-4 flex items-center justify-between gap-4"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-zinc-800 truncate">
                      {p.taskTitle ?? p.reason ?? "Points adjustment"}
                    </p>
                    <p className="text-[10px] text-zinc-400 font-medium mt-0.5">
                      {formatDate(p.createdAt)}
                    </p>
                  </div>
                  <span
                    className={`text-sm font-black shrink-0 ${
                      p.points >= 0 ? "text-green-500" : "text-red-500"
                    }`}
                  >
                    {p.points >= 0 ? "+" : ""}
                    {p.points}
                  </span>
                </div>
              ))}
            </SectionCard>
          </div>
        </>
      ) : null}
    </div>
  );
}
