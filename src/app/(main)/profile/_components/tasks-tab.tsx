"use client";

import {
  PlatformIcon,
  difficultyAccent,
  difficultyBadge,
} from "@/src/components/user-dashboard/task-card";

interface Task {
  id: number;
  title: string;
  description: string | null;
  points: number;
  status: string;
  completedAt: string | null;
  taskType: string | null;
  platform: string | null;
  difficulty: string;
  isRecurring?: boolean;
}

interface TasksTabProps {
  tasks: Task[];
  totalPoints: number;
  completedCount: number;
  isLoading?: boolean;
}

// Status badge styles — mirrors the dashboard task card
const statusBadgeClass: Record<string, string> = {
  verified: "bg-emerald-100 text-emerald-700",
  completed: "bg-emerald-100 text-emerald-700",
  "pending verification": "bg-amber-100 text-amber-700",
  rejected: "bg-red-100 text-red-700",
  "in progress": "bg-orange-100 text-orange-700 animate-pulse",
};

/**
 * Content for the "Tasks" tab — stats overview and task list.
 */
export default function TasksTab({
  tasks,
  totalPoints,
  completedCount,
  isLoading = false,
}: TasksTabProps) {
  const inProgressCount = tasks.filter(
    (t) => t.status === "in progress",
  ).length;
  const completedInListCount = tasks.filter(
    (t) => t.status === "completed" || t.status === "verified",
  ).length;

  return (
    <div className="flex flex-col gap-4">
      {/* Stats header */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-6 pt-5 pb-6">
          <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white/5" />
          <div className="absolute right-16 -bottom-4 w-20 h-20 rounded-full bg-white/5" />
          <div className="relative z-10">
            <p className="text-white/50 text-[10px] font-bold uppercase tracking-widest mb-1">
              Overview
            </p>
            <h2 className="text-white text-xl font-black mb-4">Task History</h2>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl px-4 py-3 border border-white/10">
                <p className="text-white/50 text-xs mb-1">Total Points</p>
                <p className="text-[#FACC15] text-xl font-black">
                  {totalPoints}
                </p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl px-4 py-3 border border-white/10">
                <p className="text-white/50 text-xs mb-1">Completed</p>
                <p className="text-emerald-300 text-xl font-black">
                  {completedCount}
                </p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl px-4 py-3 border border-white/10">
                <p className="text-white/50 text-xs mb-1">In Progress</p>
                <p className="text-amber-300 text-xl font-black">
                  {inProgressCount}
                </p>
              </div>
            </div>
            {tasks.length > 0 && (
              <div className="mt-4">
                <div className="flex items-center justify-between text-[10px] text-white/40 mb-1.5">
                  <span>Task completion</span>
                  <span className="font-semibold text-white/60">
                    {completedInListCount}/{tasks.length}
                  </span>
                </div>
                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-400 to-emerald-300 rounded-full transition-all duration-700 ease-out"
                    style={{
                      width: `${(completedInListCount / tasks.length) * 100}%`,
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="h-3 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative">
          <div className="absolute inset-x-0 bottom-0 h-3 bg-white rounded-t-2xl" />
        </div>

        {/* Task list */}
        <div className="px-6 pb-6">
          <p className="text-[10px] font-black uppercase tracking-[0.15em] text-gray-400 mb-3">
            All Tasks
          </p>

          {isLoading ? (
            <div className="flex items-center justify-center py-12 gap-3">
              <div className="w-6 h-6 border-2 border-zinc-200 border-t-slate-900 rounded-full animate-spin" />
              <p className="text-sm text-zinc-400 font-medium">
                Loading tasks...
              </p>
            </div>
          ) : tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-zinc-400">
              <div className="w-12 h-12 rounded-2xl bg-zinc-100 flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-zinc-300"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.5"
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
              </div>
              <p className="text-sm font-medium text-zinc-400">No tasks yet</p>
              <p className="text-xs text-zinc-300">
                Pick up a task from the dashboard to get started
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {tasks.map((task) => {
                const difficulty = (task.difficulty ?? "easy").toLowerCase();
                const accentClass =
                  difficultyAccent[difficulty] ?? difficultyAccent.easy;
                const badgeClass =
                  difficultyBadge[difficulty] ?? difficultyBadge.easy;
                const statusClass =
                  statusBadgeClass[task.status] ??
                  "bg-slate-100 text-slate-500";

                return (
                  <div
                    key={task.id}
                    className="relative bg-white border border-black/[0.07] rounded-[14px] overflow-hidden"
                  >
                    {/* Left accent stripe */}
                    <div
                      className={`absolute left-0 top-0 bottom-0 w-[3px] ${accentClass}`}
                    />

                    <div className="pl-4 pr-4 py-3.5 flex items-start gap-3">
                      {/* Platform icon */}
                      <PlatformIcon
                        taskType={task.taskType}
                        platform={task.platform}
                      />

                      {/* Task info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start mb-0.5">
                          <h3 className="text-[13px] font-semibold text-slate-900 leading-snug truncate">
                            {task.title}
                          </h3>
                        </div>

                        {task.description && (
                          <p className="text-[11px] text-slate-400 leading-snug line-clamp-1">
                            {task.description}
                          </p>
                        )}

                        {task.completedAt && (
                          <p className="text-[10px] text-slate-300 mt-0.5">
                            Completed{" "}
                            {new Date(task.completedAt).toLocaleDateString(
                              "en-US",
                              {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              },
                            )}
                          </p>
                        )}
                      </div>

                      {/* Right: points + badges + status */}
                      <div className="shrink-0 flex flex-col items-end gap-1.5">
                        <span className="text-[11px] font-bold text-slate-500 whitespace-nowrap">
                          +{task.points} pts
                        </span>
                        <div className="flex items-center gap-1 flex-wrap justify-end">
                          {task.isRecurring && (
                            <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                              🔄 Daily
                            </span>
                          )}
                          {task.difficulty && (
                            <span
                              className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${badgeClass}`}
                            >
                              {task.difficulty}
                            </span>
                          )}
                          <span
                            className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${statusClass}`}
                          >
                            {task.status.toUpperCase()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
