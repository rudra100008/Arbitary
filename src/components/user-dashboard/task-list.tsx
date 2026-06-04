"use client";
// task-list.tsx

import { useState, useMemo } from "react";
import { TaskCard } from "./task-card";

type TaskListProps = {
  availableTasks: any[];
  inProgressTasks: any[];
  rejectedTasks: any[];
  completedTasks: any[];
  systemTasks: any[];
  isLoading: boolean;
  activeTab: string;
  isAnimating: boolean;
  slideDirection: "left" | "right";
  expandedTasks: Record<number, boolean>;
  onToggleExpand: (e: React.MouseEvent, taskId: number) => void;
  onPickup: (taskId: number) => void;
  onCancel: (taskId: number) => void;
  onComplete: (taskId: number, proofUrl: string, proofImageUrl?: string) => void;
  onClaimDailyLogin: (taskId: number) => void;
  onClaimProfile: (taskId: number) => void;
  onClaimReferral: (taskId: number) => void;
  pickupPending: boolean;
  pickupVariable: number | undefined;
  cancelPending: boolean;
  cancelVariable: number | undefined;
};

function TaskSection({
  title,
  tasks,
  accent,
  ...cardProps
}: { title: string; tasks: any[]; accent?: string } & Omit<
  TaskListProps,
  | "availableTasks"
  | "inProgressTasks"
  | "rejectedTasks"
  | "completedTasks"
  | "systemTasks"
  | "isLoading"
  | "activeTab"
  | "isAnimating"
  | "slideDirection"
>) {
  if (tasks.length === 0) return null;
  return (
    <div className="mb-5">
      <div className="flex items-center gap-2 mb-2.5 px-1">
        {accent && <div className={`w-1.5 h-1.5 rounded-full ${accent}`} />}
        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.18em]">
          {title}
        </h3>
        <span className="text-[9px] font-black text-slate-300 bg-slate-100 px-1.5 py-0.5 rounded-full">
          {tasks.length}
        </span>
      </div>
      <div className="space-y-3">
        {tasks.map((task, index) => (
          <TaskCard key={task.id} task={task} index={index} {...cardProps} />
        ))}
      </div>
    </div>
  );
}

const DIFFICULTIES = ["all", "easy", "medium", "hard"] as const;

export function TaskList({
  availableTasks,
  inProgressTasks,
  rejectedTasks,
  completedTasks,
  systemTasks,
  isLoading,
  activeTab,
  isAnimating,
  slideDirection,
  ...cardProps
}: TaskListProps) {
  const [difficultyFilter, setDifficultyFilter] = useState<string>("all");
  const hasAnyTasks =
    availableTasks.length > 0 ||
    inProgressTasks.length > 0 ||
    rejectedTasks.length > 0 ||
    completedTasks.length > 0;

  const filteredAvailable = useMemo(() => {
    if (difficultyFilter === "all") return availableTasks;
    return availableTasks.filter((t: any) => t.difficulty === difficultyFilter);
  }, [availableTasks, difficultyFilter]);

  const difficultyColors: Record<string, string> = {
    all: "bg-slate-800 text-white",
    easy: "bg-emerald-500 text-white",
    medium: "bg-amber-500 text-white",
    hard: "bg-red-500 text-white",
  };

  return (
    <div className="px-6 pb-6 min-h-64">
      <div
        className={
          isAnimating
            ? slideDirection === "left"
              ? "slide-out-left"
              : "slide-out-right"
            : slideDirection === "left"
              ? "slide-in-left"
              : "slide-in-right"
        }
      >
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3">
            <div className="w-8 h-8 border-2 border-slate-100 border-t-slate-800 rounded-full animate-spin" />
            <p className="text-sm text-slate-400 font-medium">Loading tasks…</p>
          </div>
        ) : !hasAnyTasks && systemTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-400 gap-3">
            <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center">
              <svg
                className="w-7 h-7 text-slate-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.5"
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                />
              </svg>
            </div>
            <p className="text-sm font-medium">
              {activeTab === "all"
                ? "No tasks available right now."
                : `No ${activeTab} tasks found.`}
            </p>
          </div>
        ) : (
          <div className="pt-3">
            {/* Difficulty filter */}
            {availableTasks.length > 1 && (
              <div className="flex items-center gap-1.5 mb-4 px-1 overflow-x-auto pb-0.5">
                {DIFFICULTIES.map((d) => (
                  <button
                    key={d}
                    onClick={() => setDifficultyFilter(d)}
                    className={`text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-full transition-all shrink-0 ${
                      difficultyFilter === d
                        ? difficultyColors[d]
                        : "bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-600"
                    }`}
                  >
                    {d === "all" ? "All" : d}
                  </button>
                ))}
              </div>
            )}

            <TaskSection
              title="In Progress"
              accent="bg-amber-400 animate-pulse"
              tasks={inProgressTasks}
              {...cardProps}
            />
            <TaskSection
              title="Rejected — Re-claim"
              accent="bg-red-400"
              tasks={rejectedTasks}
              {...cardProps}
            />
            <TaskSection
              title="Available"
              accent="bg-slate-300"
              tasks={filteredAvailable}
              {...cardProps}
            />
            <TaskSection
              title="Completed"
              accent="bg-emerald-400"
              tasks={completedTasks}
              {...cardProps}
            />
          </div>
        )}

        {/* System tasks */}
        {!isLoading && systemTasks.length > 0 && (
          <div className="mt-2">
            <div className="flex items-center gap-2 mb-2.5 px-1">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.18em]">
                System Tasks
              </h3>
            </div>
            <div className="space-y-3">
              {systemTasks.map((task, index) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  index={index}
                  {...cardProps}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
