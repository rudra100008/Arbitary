import { Task } from "@/src/lib/manage-task/types";
import { TaskRow } from "./TaskRow";

type Props = {
  tasks: Task[];
  isLoading: boolean;
  activeTab: string;
  isAnimating: boolean;
  slideDirection: "left" | "right";
  onDetails: (task: Task) => void;
  searchQuery: string;
};

const COLUMNS = ["Task", "Description", "Platform", "Created", "Users", ""];

export function TaskTable({
  tasks,
  isLoading,
  activeTab,
  isAnimating,
  slideDirection,
  onDetails,
  searchQuery,
}: Props) {
  const filtered = tasks.filter((t) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      t.title.toLowerCase().includes(q) ||
      t.description?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="bg-white rounded-[2.5rem] border border-black/5 shadow-sm overflow-hidden">
      {/* Column headers */}
      <div className="hidden sm:grid grid-cols-[2fr_3fr_1fr_1fr_1fr_1fr] gap-4 px-8 py-4 bg-zinc-50 border-b border-black/5">
        {COLUMNS.map((h, i) => (
          <span
            key={i}
            className={`text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 ${i === 5 ? "text-right" : ""}`}
          >
            {h}
          </span>
        ))}
      </div>

      {/* Body */}
      <div className="overflow-hidden min-h-[280px]">
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
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="w-7 h-7 border-2 border-zinc-200 border-t-slate-900 rounded-full animate-spin" />
              <p className="text-sm text-zinc-400 font-medium">Loading tasks...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4 text-zinc-400 fade-in-up">
              <div className="w-14 h-14 rounded-[2rem] bg-zinc-100 flex items-center justify-center">
                <svg
                  className="w-7 h-7 text-zinc-300"
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
              <div className="text-center">
                <p className="text-sm font-black uppercase tracking-wider text-zinc-500">
                  {searchQuery ? "No matching tasks" : activeTab === "all" ? "No tasks yet" : `No ${activeTab} tasks yet`}
                </p>
                <p className="text-xs text-zinc-300 font-medium mt-1">
                  {searchQuery ? "Try a different search term" : 'Click "Add Task" to create one'}
                </p>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-black/5">
              {filtered.map((task, index) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  index={index}
                  onDetails={onDetails}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer count */}
      {tasks.length > 0 && (
        <div className="px-8 py-4 border-t border-black/5 bg-zinc-50/50 flex items-center justify-between">
          <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
            {searchQuery
              ? `${filtered.length} of ${tasks.length} ${activeTab === "all" ? "" : activeTab + " "}tasks`
              : `${tasks.length} ${activeTab === "all" ? "" : activeTab + " "}${tasks.length === 1 ? "task" : "tasks"}`}
          </p>
        </div>
      )}
    </div>
  );
}
