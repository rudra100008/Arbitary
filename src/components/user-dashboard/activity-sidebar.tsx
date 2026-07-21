// activity-sidebar.tsx — redesigned to match new mockup
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

  return (
    <div className="flex flex-col gap-4">
      {/* ── Overview card ─────────────────────────────────────────────── */}
      <div className="relative overflow-hidden bg-[#0f172a] rounded-2xl p-4 ">
        {/* Decorative blobs */}
        <div className="absolute -right-8 -top-8 w-36 h-36 rounded-full bg-white/[0.04] pointer-events-none" />
        <div className="absolute left-6 -bottom-6 w-24 h-24 rounded-full bg-[#FACC15]/[0.04] pointer-events-none" />

        <div className="relative z-10">
          {/* Header row */}
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-white/30 text-[9px] font-bold uppercase tracking-[0.2em]">
                Overview
              </p>
              <h3 className="text-white text-[15px] font-black mt-0.5">
                Activity
              </h3>
            </div>
            {/* Streak ring */}
            {streak > 0 && (
              <div className="flex flex-col items-center">
                <div className="w-9 h-9 rounded-full bg-orange-500/15 border border-orange-400/25 flex items-center justify-center flex-col">
                  <span className="text-sm leading-none">🔥</span>
                  <span className="text-[8px] font-bold text-orange-400 mt-0.5">
                    {streak}d
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-1.5">
            <div className="bg-white/[0.07] border border-white/[0.07] rounded-xl px-3 py-2.5">
              <p className="text-white/30 text-[8px] uppercase tracking-wider font-bold mb-1">
                Total pts
              </p>
              <p className="text-[#FACC15] text-[18px] font-black tabular-nums leading-none">
                <AnimatedCounter value={totalEarned} />
              </p>
            </div>
            <div className="bg-white/[0.07] border border-white/[0.07] rounded-xl px-3 py-2.5">
              <p className="text-white/30 text-[8px] uppercase tracking-wider font-bold mb-1">
                Done
              </p>
              <p className="text-emerald-400 text-[18px] font-black tabular-nums leading-none">
                {completedCount}
              </p>
            </div>
            {streak > 0 && (
              <div className="bg-white/[0.07] border border-white/[0.07] rounded-xl px-3 py-2.5">
                <p className="text-white/30 text-[8px] uppercase tracking-wider font-bold mb-1">
                  Streak
                </p>
                <p className="text-orange-400 text-[18px] font-black tabular-nums leading-none">
                  {streak}d
                </p>
              </div>
            )}
            {longestStreak > 0 && (
              <div className="bg-white/[0.07] border border-white/[0.07] rounded-xl px-3 py-2.5">
                <p className="text-white/30 text-[8px] uppercase tracking-wider font-bold mb-1">
                  Best
                </p>
                <p className="text-white/80 text-[18px] font-black tabular-nums leading-none">
                  {longestStreak}d
                </p>
              </div>
            )}
          </div>

          {/* Daily login claimed */}
          {pointsData?.claimedToday && (
            <div className="mt-2.5 flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/15 rounded-xl px-3 py-2">
              <div className="w-4 h-4 rounded-full bg-emerald-500/25 flex items-center justify-center shrink-0">
                <svg
                  className="w-2.5 h-2.5 text-emerald-400"
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
        </div>
      </div>

      {/* ── Currently active label ────────────────────────────────────── */}
      <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 px-0.5">
        Currently active
      </p>

      {/* ── Active task slot ──────────────────────────────────────────── */}
      {isLoading ? (
        <div className="rounded-xl border border-slate-100 bg-slate-50 flex items-center justify-center h-20">
          <div className="w-5 h-5 border-2 border-slate-200 border-t-slate-500 rounded-full animate-spin" />
        </div>
      ) : !activeTask ? (
        <div className="border border-dashed border-slate-200 rounded-xl p-5 flex flex-col items-center justify-center gap-2 min-h-[80px] text-center">
          <div className="w-8 h-8 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center">
            <svg
              className="w-4 h-4 text-slate-300"
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
          <p className="text-[11px] text-slate-400 leading-snug">
            No active task.
            <br />
            Pick one up to get started.
          </p>
        </div>
      ) : (
        <div className="relative overflow-hidden bg-[#0f172a] rounded-xl p-4">
          <div className="absolute -right-6 -top-6 w-20 h-20 rounded-full bg-[#FACC15]/[0.05] pointer-events-none" />
          <div className="relative z-10">
            {/* Status pulse */}
            <div className="flex items-center gap-1.5 mb-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#FACC15] animate-pulse" />
              <span className="text-[9px] font-black text-white/40 uppercase tracking-[0.14em]">
                In Progress
              </span>
            </div>
            <h4 className="text-[13px] font-black text-white leading-snug mb-1">
              {activeTask.title}
            </h4>
            <p className="text-[11px] text-white/40 mb-3 line-clamp-2 leading-snug">
              {activeTask.description}
            </p>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black text-[#0f172a] bg-[#FACC15] px-2.5 py-1 rounded-full">
                +{activeTask.points} pts
              </span>
              <button
                onClick={() => onCancel(activeTask.id)}
                disabled={cancelPending}
                className="text-[11px] font-bold text-white/80 bg-red-500/30 hover:bg-red-500/50
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

      {/* ── Completed tasks ───────────────────────────────────────────── */}
      {completedTasks.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between px-0.5">
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">
              Completed
            </p>
            <span className="text-[9px] font-black text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
              {completedTasks.length}
            </span>
          </div>

          <div className="flex flex-col gap-1.5">
            {completedTasks.map((task) => {
              const status = task.userStatus?.toLowerCase();
              const isPending = status === "pending verification";

              return (
                <div
                  key={task.id}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 border border-slate-100"
                >
                  {/* Status icon */}
                  <div
                    className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 text-[10px]
                    ${isPending ? "bg-orange-100" : "bg-emerald-100"}`}
                  >
                    {isPending ? (
                      <svg
                        className="w-3 h-3 text-orange-500"
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
                        className="w-3 h-3 text-emerald-600"
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

                  {/* Task name */}
                  <p className="flex-1 text-[11px] font-semibold text-slate-700 truncate">
                    {task.title}
                  </p>

                  {/* Points + status */}
                  <div className="flex flex-col items-end gap-0.5 shrink-0">
                    <span className="text-[10px] font-bold text-slate-500">
                      +{task.points}
                    </span>
                    <span
                      className={`text-[8px] font-bold uppercase tracking-wide
                      ${isPending ? "text-orange-500" : "text-emerald-600"}`}
                    >
                      {isPending ? "Pending" : "Verified"}
                    </span>
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
