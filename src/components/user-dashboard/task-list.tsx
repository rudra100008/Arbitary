"use client";
import { type ImageAnalysis } from "@/src/hooks/useScreenshotUpload";
// task-list.tsx

import { useState, useMemo } from "react";
import { TaskCard } from "./task-card";
import { UserTaskItem } from "@/src/services/task.service";

type TaskListProps = {
  availableTasks: UserTaskItem[];
  inProgressTasks: UserTaskItem[];
  rejectedTasks: UserTaskItem[];
  completedTasks: UserTaskItem[];
  systemTasks: UserTaskItem[];
  isLoading: boolean;
  activeTab: string;
  isAnimating: boolean;
  slideDirection: "left" | "right";
  expandedTasks: Record<number, boolean>;
  onToggleExpand: (e: React.MouseEvent, taskId: number) => void;
  onPickup: (taskId: number) => void;
  onCancel: (taskId: number) => void;
  onComplete: (
    taskId: number,
    proofUrl: string,
    proofImageUrl?: string,
    imageAnalysis?: ImageAnalysis | null,
  ) => void;
  onClaimDailyLogin: (taskId: number) => void;
  onClaimProfile: (taskId: number) => void;
  onClaimReferral: (taskId: number) => void;
  pickupPending: boolean;
  pickupVariable: number | undefined;
  cancelPending: boolean;
  cancelVariable: number | undefined;
  onYoutubeComplete: (vars: {
    taskId: number;
    sessionId?: number;
    fingerprint?: string;
  }) => void;
  onModalComplete: (taskId: number, taskType?: string | null) => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
  loadingMore?: boolean;
  streak?: number;
};

function TaskSection({
  title,
  tasks,
  accentColor,
  streak,
  ...cardProps
}: {
  title: string;
  tasks: UserTaskItem[];
  accentColor?: string;
  streak?: number;
} & Omit<
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
    <div className="mb-4">
      <div className="flex items-center gap-2 mb-2.5 px-0.5">
        {accentColor && (
          <div className={`w-1.5 h-1.5 rounded-full ${accentColor}`} />
        )}
        <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.18em]">
          {title}
        </h3>
        <span className="text-[9px] font-black text-slate-300 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded-full">
          {tasks.length}
        </span>
      </div>
      <div className="space-y-2">
        {tasks.map((task, index) => (
          <TaskCard
            key={task.id}
            task={task}
            index={index}
            streak={streak}
            {...cardProps}
          />
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
  onLoadMore,
  hasMore,
  loadingMore,
  streak = 0,
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
    return availableTasks.filter((t) => t.difficulty === difficultyFilter);
  }, [availableTasks, difficultyFilter]);

  const difficultyActiveClass: Record<string, string> = {
    all: "bg-slate-900 text-white border-slate-900",
    easy: "bg-emerald-500 text-white border-emerald-500",
    medium: "bg-orange-500 text-white border-orange-500",
    hard: "bg-red-500 text-white border-red-500",
  };

  return (
    <div className="px-5 pb-6 min-h-64">
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
            <div className="w-7 h-7 border-2 border-slate-100 border-t-slate-800 rounded-full animate-spin" />
            <p className="text-sm text-slate-400">Loading tasks…</p>
          </div>
        ) : !hasAnyTasks && systemTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-400 gap-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center">
              <svg
                className="w-6 h-6 text-slate-300"
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
            <p className="text-sm">
              {activeTab === "all"
                ? "No tasks available right now."
                : `No ${activeTab} tasks found.`}
            </p>
          </div>
        ) : (
          <div className="pt-3">
            {/* Difficulty filter pills */}
            {availableTasks.length > 1 && (
              <div className="flex items-center gap-1.5 mb-4 px-0.5 overflow-x-auto pb-0.5">
                {DIFFICULTIES.map((d) => (
                  <button
                    key={d}
                    onClick={() => setDifficultyFilter(d)}
                    className={`text-[9px] font-black uppercase tracking-wider px-3 py-1.5 rounded-full border transition-all shrink-0
                      ${
                        difficultyFilter === d
                          ? difficultyActiveClass[d]
                          : "bg-white border-slate-200 text-slate-400 hover:border-slate-300 hover:text-slate-600"
                      }`}
                  >
                    {d === "all" ? "All" : d}
                  </button>
                ))}
              </div>
            )}

            <TaskSection
              title="In Progress"
              accentColor="bg-orange-400 animate-pulse"
              tasks={inProgressTasks}
              streak={streak}
              {...cardProps}
            />
            <TaskSection
              title="Rejected"
              accentColor="bg-red-400"
              tasks={rejectedTasks}
              streak={streak}
              {...cardProps}
            />
            <TaskSection
              title="Available"
              accentColor="bg-slate-300"
              tasks={filteredAvailable}
              streak={streak}
              {...cardProps}
            />

            {/* Load more */}
            {hasMore && !isLoading && (
              <div className="flex justify-center pt-2 pb-4">
                <button
                  onClick={onLoadMore}
                  disabled={loadingMore}
                  className="px-6 py-2.5 text-[10px] font-black uppercase tracking-wider rounded-full
                             bg-slate-900 text-white hover:bg-slate-800 transition-all
                             disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loadingMore ? "Loading…" : "Load More"}
                </button>
              </div>
            )}
          </div>
        )}

        {/* System tasks */}
        {!isLoading && systemTasks.length > 0 && (
          <div className="mt-2">
            <div className="flex items-center gap-2 mb-2.5 px-0.5">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
              <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.18em]">
                System Tasks
              </h3>
            </div>
            <div className="space-y-2">
              {systemTasks.map((task, index) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  index={index}
                  streak={streak}
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
