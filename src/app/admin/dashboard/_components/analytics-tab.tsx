"use client";

import { useQuery } from "@tanstack/react-query";

type TaskAnalyticsItem = {
  taskId: number;
  title: string;
  taskType: string | null;
  points: number;
  pickedUp: number;
  completedCount: number;
  cancelled: number;
  conversionRate: number;
  dropOffRate: number;
};

type TaskAnalyticsResponse = {
  tasks: TaskAnalyticsItem[];
};

export default function AnalyticsTab() {
  const { data, isLoading } = useQuery<TaskAnalyticsResponse>({
    queryKey: ["admin-task-analytics"],
    queryFn: async () => {
      const res = await fetch("/api/admin/analytics/tasks");
      if (!res.ok) throw new Error("Failed to load task analytics");
      return res.json();
    },
  });

  const tasks = data?.tasks ?? [];
  const avgConversion =
    tasks.length > 0
      ? Math.round(
          tasks.reduce((sum, t) => sum + t.conversionRate, 0) / tasks.length,
        )
      : 0;

  return (
    <div className="flex flex-col gap-5 w-full max-w-6xl mx-auto p-4 sm:p-6 text-black">
      {/* Header */}
      <div className="bg-white rounded-[2.5rem] border border-black/5 shadow-sm p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black uppercase tracking-tight">
              Task Analytics
            </h2>
            <p className="text-xs text-zinc-400 font-medium mt-1">
              Performance metrics for all tasks — Avg conversion: {avgConversion}%
            </p>
          </div>
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="bg-white rounded-[2.5rem] border border-black/5 shadow-sm p-12 flex justify-center">
          <div className="w-7 h-7 border-2 border-zinc-200 border-t-slate-900 rounded-full animate-spin" />
        </div>
      ) : tasks.length === 0 ? (
        <div className="bg-white rounded-[2.5rem] border border-black/5 shadow-sm p-12 flex flex-col items-center gap-4">
          <p className="text-sm font-black uppercase tracking-wider text-zinc-500">
            No task data available
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-[2.5rem] border border-black/5 shadow-sm overflow-hidden">
          {/* Column headers */}
          <div className="hidden sm:grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_1fr] gap-4 px-8 py-4 bg-zinc-50 border-b border-black/5">
            {["Task", "Type", "Pts", "Picked", "Done", "Drop-off", "Conv."].map(
              (h, i) => (
                <span
                  key={i}
                  className={`text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 ${i >= 2 ? "text-right" : ""}`}
                >
                  {h}
                </span>
              ),
            )}
          </div>

          <div className="divide-y divide-black/5">
            {tasks.map((item, index) => (
              <div
                key={item.taskId}
                className="fade-in-up"
                style={{
                  animationDelay: `${index * 30}ms`,
                  animationFillMode: "both",
                }}
              >
                {/* Desktop row */}
                <div className="hidden sm:grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_1fr] gap-4 px-8 py-4 items-center hover:bg-zinc-50/50 transition-colors">
                  <p className="text-sm font-bold text-black truncate">
                    {item.title}
                  </p>
                  <span className="text-[10px] font-black uppercase tracking-wider text-zinc-500 bg-zinc-100 px-2 py-1 rounded-full w-fit">
                    {item.taskType ?? "—"}
                  </span>
                  <span className="text-sm font-black text-amber-600 text-right">
                    {item.points}
                  </span>
                  <span className="text-sm font-bold text-zinc-600 text-right">
                    {item.pickedUp}
                  </span>
                  <span className="text-sm font-bold text-emerald-600 text-right">
                    {item.completedCount}
                  </span>
                  <span
                    className={`text-sm font-black text-right ${
                      item.dropOffRate > 50
                        ? "text-red-600"
                        : item.dropOffRate > 25
                          ? "text-amber-600"
                          : "text-zinc-500"
                    }`}
                  >
                    {item.dropOffRate}%
                  </span>
                  <span
                    className={`text-sm font-black text-right ${
                      item.conversionRate < 30
                        ? "text-red-600"
                        : item.conversionRate < 60
                          ? "text-amber-600"
                          : "text-emerald-600"
                    }`}
                  >
                    {item.conversionRate}%
                  </span>
                </div>

                {/* Mobile card */}
                <div className="sm:hidden p-4 border-b border-black/5">
                  <div className="flex items-start justify-between mb-2">
                    <p className="text-sm font-bold text-black truncate flex-1">
                      {item.title}
                    </p>
                    <span className="text-[10px] font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full shrink-0 ml-2">
                      {item.points} pts
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs text-zinc-500">
                    <span className="bg-zinc-100 px-2 py-0.5 rounded-full">
                      {item.taskType ?? "—"}
                    </span>
                    <span>
                      Picked: {item.pickedUp}
                    </span>
                    <span className="text-emerald-600">
                      Done: {item.completedCount}
                    </span>
                    <span
                      className={
                        item.dropOffRate > 50 ? "text-red-600" : "text-zinc-500"
                      }
                    >
                      Drop: {item.dropOffRate}%
                    </span>
                    <span
                      className={
                        item.conversionRate < 30
                          ? "text-red-600"
                          : "text-emerald-600"
                      }
                    >
                      Conv: {item.conversionRate}%
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
