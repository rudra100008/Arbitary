// activity-sidebar.tsx — redesigned with better visual hierarchy
import { AnimatedCounter } from "@/src/components/rewards/animated-counter";
import { UserTaskItem } from "@/src/services/task.service";

type ActivitySidebarProps = {
  tasks: UserTaskItem[];
  completedTasks: UserTaskItem[];
  isLoading: boolean;
  totalPoints: number;
  completedCount: number;
  pointsData?: {
    points: number;
    completedTasksCount: number;
    currentStreak: number;
    longestStreak: number;
    claimedToday: boolean;
  };
  onCancel: (taskId: number) => void;
  cancelPending: boolean;
  cancelVariable: number | undefined;
};

const statusGradients = [
  "from-violet-500 to-purple-600",
  "from-blue-500 to-indigo-600",
  "from-teal-500 to-cyan-600",
  "from-rose-500 to-pink-600",
  "from-amber-500 to-orange-600",
];

export function ActivitySidebar({
  tasks,
  completedTasks,
  isLoading,
  totalPoints,
  completedCount,
  pointsData,
  onCancel,
  cancelPending,
  cancelVariable,
}: ActivitySidebarProps) {
  const activeTask = tasks.find(
    (t) => t.userStatus?.toLowerCase() === "in progress",
  );


  const streak = pointsData?.currentStreak ?? 0;
  const longestStreak = pointsData?.longestStreak ?? 0;
  const totalEarned = pointsData?.points ?? totalPoints;
  const multiplier =
    streak >= 30 ? 1.5
    : streak >= 7 ? 1.2
    : 1.0;

  return (
    <div className="flex flex-col gap-4">
      {/* ── Overview card ─────────────────────────────────────────────── */}
      <div className="relative overflow-hidden bg-slate-900 rounded-3xl p-5">
        {/* Decorative blobs */}
        <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-white/5 pointer-events-none" />
        <div className="absolute right-8 -bottom-10 w-24 h-24 rounded-full bg-[#FACC15]/10 pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-white/40 text-[10px] font-bold uppercase tracking-[0.2em]">
                Overview
              </p>
              <h3 className="text-white text-lg font-black mt-0.5">Activity</h3>
            </div>
            {/* Streak ring */}
            {streak > 0 && (
              <div className="flex flex-col items-center">
                <div className="w-11 h-11 rounded-full bg-orange-500/20 border-2 border-orange-400/40 flex items-center justify-center">
                  <span className="text-lg leading-none">🔥</span>
                </div>
                <span className="text-[9px] font-black text-orange-400 mt-0.5">
                  {streak}d
                </span>
              </div>
            )}
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-white/8 border border-white/10 rounded-2xl px-3.5 py-3">
              <p className="text-white/40 text-[9px] uppercase tracking-wider font-bold mb-1">
                Total Pts
              </p>
              <p className="text-white text-xl font-black tabular-nums">
                <AnimatedCounter value={totalEarned} />
              </p>
            </div>
            <div className="bg-white/8 border border-white/10 rounded-2xl px-3.5 py-3">
              <p className="text-white/40 text-[9px] uppercase tracking-wider font-bold mb-1">
                Done
              </p>
              <p className="text-emerald-400 text-xl font-black tabular-nums">
                {completedCount}
              </p>
            </div>
            {streak > 0 && (
              <div className="bg-white/8 border border-white/10 rounded-2xl px-3.5 py-3">
                <p className="text-white/40 text-[9px] uppercase tracking-wider font-bold mb-1">
                  Streak
                </p>
                <p className="text-orange-400 text-xl font-black tabular-nums">
                  {streak}d
                </p>
              </div>
            )}
            {longestStreak > 0 && (
              <div className="bg-white/8 border border-white/10 rounded-2xl px-3.5 py-3">
                <p className="text-white/40 text-[9px] uppercase tracking-wider font-bold mb-1">
                  Best
                </p>
                <p className="text-yellow-400 text-xl font-black tabular-nums">
                  {longestStreak}d
                </p>
              </div>
            )}
          </div>

          {/* Login claimed indicator */}
          {pointsData?.claimedToday && (
            <div className="mt-3 flex items-center gap-2 bg-emerald-500/15 border border-emerald-500/20 rounded-xl px-3 py-2">
              <div className="w-5 h-5 rounded-full bg-emerald-500/30 flex items-center justify-center shrink-0">
                <svg
                  className="w-3 h-3 text-emerald-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <span className="text-[10px] font-bold text-emerald-400">
                Daily login claimed
              </span>
            </div>
          )}

          {/* Streak multiplier indicator */}
          {multiplier > 1 && (
            <div className="mt-2 flex items-center gap-2 bg-amber-500/15 border border-amber-500/20 rounded-xl px-3 py-2">
              <span className="text-xs">⚡</span>
              <span className="text-[10px] font-bold text-amber-400">
                {multiplier}× multiplier active
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── Active task ───────────────────────────────────────────────── */}
      <div className="flex flex-col gap-2.5">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 px-1">
          Currently Active
        </p>

        {isLoading ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 flex items-center justify-center h-28">
            <div className="w-6 h-6 border-2 border-slate-200 border-t-slate-500 rounded-full animate-spin" />
          </div>
        ) : !activeTask ? (
          <div className="relative overflow-hidden rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 p-5 flex flex-col items-center justify-center gap-2 min-h-[7rem] text-center">
            <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center">
              <svg
                className="w-4 h-4 text-slate-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
            </div>
            <p className="text-xs text-slate-400 font-medium leading-snug">
              No active task.
              <br />
              Pick one up to get started.
            </p>
          </div>
        ) : (
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-500 via-purple-500 to-indigo-600 p-4 shadow-lg shadow-purple-200/50">
            <div className="absolute -right-4 -top-4 w-20 h-20 rounded-full bg-white/10 pointer-events-none" />
            <div className="absolute -left-3 -bottom-5 w-16 h-16 rounded-full bg-white/5 pointer-events-none" />

            <div className="relative z-10 flex flex-col gap-2.5">
              {/* Status pulse */}
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                <span className="text-[9px] font-black text-white/70 uppercase tracking-[0.15em]">
                  In Progress
                </span>
              </div>

              {/* Task info */}
              <div>
                <h4 className="text-sm font-black text-white leading-tight">
                  {activeTask.title}
                </h4>
                <p className="text-xs text-white/60 mt-0.5 line-clamp-2 leading-snug">
                  {activeTask.description}
                </p>
              </div>

              {/* Footer row */}
              <div className="flex items-center justify-between pt-0.5">
                <span className="text-xs font-black text-white bg-white/20 px-2.5 py-1 rounded-full">
                  ✦ {activeTask.points} pts
                </span>
                <button
                  onClick={() => onCancel(activeTask.id)}
                  disabled={cancelPending}
                  className="text-xs font-bold text-white/90 bg-red-500/40 hover:bg-red-500/60
                             px-2.5 py-1 rounded-full transition-all duration-200
                             hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {cancelPending && cancelVariable === activeTask.id
                    ? "..."
                    : "Cancel"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Completed tasks ───────────────────────────────────────────── */}
      {completedTasks.length > 0 && (
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between px-1">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
              Completed
            </p>
            <span className="text-[10px] font-black text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
              {completedTasks.length}
            </span>
          </div>

          <div className="flex flex-col gap-2">
            {completedTasks.map((task, index) => {
              const status = task.userStatus?.toLowerCase();
              const isPending = status === "pending verification";
              const isVerified = status === "verified";

              return (
                <div
                  key={task.id}
                  className={`relative overflow-hidden rounded-xl px-3.5 py-3 flex items-center justify-between gap-2
                    ${
                      isPending
                        ? "bg-amber-50 border border-amber-200"
                        : isVerified
                          ? "bg-emerald-50 border border-emerald-200"
                          : `bg-gradient-to-br ${statusGradients[index % statusGradients.length]}`
                    }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                        isPending
                          ? "bg-amber-200"
                          : isVerified
                            ? "bg-emerald-200"
                            : "bg-white/20"
                      }`}
                    >
                      {isPending ? (
                        <svg
                          className="w-3.5 h-3.5 text-amber-700"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                      ) : (
                        <svg
                          className={`w-3.5 h-3.5 ${isVerified ? "text-emerald-700" : "text-white"}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2.5}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      )}
                    </div>
                    <p
                      className={`text-xs font-bold truncate ${isPending || isVerified ? "text-slate-700" : "text-white"}`}
                    >
                      {task.title}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-0.5 shrink-0">
                    <span
                      className={`text-[10px] font-black ${isPending || isVerified ? "text-slate-500" : "text-white/80"}`}
                    >
                      +{task.points}
                    </span>
                    {isPending && (
                      <span className="text-[8px] font-bold text-amber-600 uppercase tracking-wide">
                        Pending
                      </span>
                    )}
                    {isVerified && (
                      <span className="text-[8px] font-bold text-emerald-600 uppercase tracking-wide">
                        Verified
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
