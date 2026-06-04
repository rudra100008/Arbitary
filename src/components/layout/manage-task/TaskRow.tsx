import { Task } from "@/src/lib/manage-task/types";
import { PlatformBadge } from "./PlatformBadge";

type Props = {
  task: Task;
  index: number;
  onDetails: (task: Task) => void;
};

export function TaskRow({ task, index, onDetails }: Props) {
  return (
    <div
      className="fade-in-up"
      style={{ animationDelay: `${index * 40}ms`, animationFillMode: "both" }}
    >
      {/* Desktop row */}
      <div className="hidden sm:grid grid-cols-[2fr_3fr_1fr_1fr_1fr_1fr] gap-4 px-8 py-5 items-center hover:bg-zinc-50/50 transition-colors group">
        {/* Title + points */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-black flex items-center justify-center shrink-0">
            <svg
              className="w-4 h-4 text-[#FACC15]"
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
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-black uppercase tracking-tight truncate">
              {task.title}
            </p>
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
              ✦ {task.rewardPoint ?? "—"} pts
            </span>
          </div>
        </div>

        {/* Description */}
        <p className="text-sm text-zinc-400 truncate font-medium">
          {task.description}
        </p>

        {/* Platform */}
        <div>
          <PlatformBadge platform={task.platform} />
        </div>

        {/* Created */}
        <span className="text-xs font-bold text-zinc-500 bg-zinc-100 px-3 py-1.5 rounded-full w-fit uppercase tracking-wider">
          {task.created}
        </span>

        {/* Completed users */}
        <div className="flex items-center gap-1.5">
          <div className="w-6 h-6 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center">
            <svg
              className="w-3.5 h-3.5 text-emerald-600"
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
          <span className="text-sm font-black text-zinc-700">
            {task.completedUsers}
          </span>
        </div>

        {/* Details button */}
        <div className="flex justify-end">
          <button
            onClick={() => onDetails(task)}
            className="text-[10px] font-black uppercase tracking-wider text-zinc-500 bg-zinc-100 hover:bg-black hover:text-[#FACC15] px-4 py-2 rounded-full transition-all duration-200"
          >
            Details →
          </button>
        </div>
      </div>

      {/* Mobile card */}
      <div className="sm:hidden p-4 border-b border-black/5 hover:bg-zinc-50/50 transition-colors">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="w-8 h-8 rounded-xl bg-black flex items-center justify-center shrink-0">
              <svg
                className="w-3.5 h-3.5 text-[#FACC15]"
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
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-black truncate">{task.title}</p>
              <span className="text-[10px] font-bold text-amber-600">
                ✦ {task.rewardPoint ?? "—"} pts
              </span>
            </div>
          </div>
          <button
            onClick={() => onDetails(task)}
            className="text-[10px] font-black uppercase tracking-wider text-zinc-400 hover:text-black shrink-0 ml-2"
          >
            Details →
          </button>
        </div>
        <div className="flex items-center gap-2 text-xs text-zinc-400">
          <PlatformBadge platform={task.platform} />
          <span className="text-zinc-300">·</span>
          <span>{task.created}</span>
          <span className="text-zinc-300">·</span>
          <span>{task.completedUsers} users</span>
        </div>
      </div>
    </div>
  );
}
