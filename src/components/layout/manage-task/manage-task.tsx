"use client";
// manage-tasks.tsx
// Thin orchestrator: owns query/mutation state and wires the sub-components together.

import { useEffect, useRef, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { Task } from "@/src/lib/manage-task/types";
import { TaskFormModal, TaskFormPayload } from "./TaskFormModal";
import { TaskDetailsModal } from "./TaskDetailsModal";
import { TaskTable } from "./TaskTable";
import BulkImportModal from "@/src/components/tickets/BulkImportModal";

// ── Animation keyframes (global, injected once) ──────────────────────────────
const ANIMATIONS = `
  @keyframes slideInFromRight { from { opacity:0; transform:translateX(32px); } to { opacity:1; transform:translateX(0); } }
  @keyframes slideInFromLeft  { from { opacity:0; transform:translateX(-32px); } to { opacity:1; transform:translateX(0); } }
  @keyframes slideOutToLeft   { from { opacity:1; transform:translateX(0); } to { opacity:0; transform:translateX(-32px); } }
  @keyframes slideOutToRight  { from { opacity:1; transform:translateX(0); } to { opacity:0; transform:translateX(32px); } }
  @keyframes fadeInUp  { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
  @keyframes modalIn   { from { opacity:0; transform:scale(0.95) translateY(8px); } to { opacity:1; transform:scale(1) translateY(0); } }
  .slide-in-right { animation: slideInFromRight 0.2s ease-out forwards; }
  .slide-in-left  { animation: slideInFromLeft  0.2s ease-out forwards; }
  .slide-out-left { animation: slideOutToLeft   0.16s ease-in  forwards; }
  .slide-out-right{ animation: slideOutToRight  0.16s ease-in  forwards; }
  .fade-in-up     { animation: fadeInUp 0.25s ease-out forwards; }
  .modal-in       { animation: modalIn 0.2s cubic-bezier(0.34,1.2,0.64,1) forwards; }
  .row-hover { transition: background 0.15s, transform 0.15s; }
  .row-hover:hover { background: #fafafa; }
`;

export default function ManageTasks() {
  const queryClient = useQueryClient();

  // ── Tab state ──────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState("all");
  const [slideDirection, setSlideDirection] = useState<"left" | "right">(
    "right",
  );
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [pillStyle, setPillStyle] = useState({ width: 0, left: 0 });
  const [isAnimating, setIsAnimating] = useState(false);

  // ── Pagination state ───────────────────────────────────────────────────────
  const [currentPage, setCurrentPage] = useState(1);
  const LIMIT = 10;

  // ── Search state ───────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");

  // ── Modal state ────────────────────────────────────────────────────────────
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isBulkOpen, setIsBulkOpen] = useState(false);

  // ── Tab animation ──────────────────────────────────────────────────────────
  const handleTabChange = (tab: string) => {
    if (tab === activeTab || isAnimating) return;
    const tabOrder = TASK_TABS.findIndex((t) => t.value === tab);
    const currentOrder = TASK_TABS.findIndex((t) => t.value === activeTab);
    setSlideDirection(tabOrder > currentOrder ? "left" : "right");
    setIsAnimating(true);
    setTimeout(() => {
      setActiveTab(tab);
      setIsAnimating(false);
    }, 200);
  };

  // ── Tabs ───────────────────────────────────────────────────────────────────
  // Fixed, known set of platform tabs  independent of what happens to be on
  // the current page, so tabs never appear/disappear while paginating, and
  // Facebook/Instagram/YouTube are always distinguishable (they used to
  // collapse into one "social" tab).
  const TASK_TABS: { value: string; label: string }[] = [
    { value: "all", label: "All" },
    { value: "facebook", label: "Facebook" },
    { value: "instagram", label: "Instagram" },
    { value: "youtube", label: "YouTube" },
    { value: "share", label: "Share" },
    { value: "screenshot", label: "Screenshot" },
  ];
  const TAB_LABELS: Record<string, string> = Object.fromEntries(
    TASK_TABS.map((t) => [t.value, t.label]),
  );

  // ── Data fetching ──────────────────────────────────────────────────────────
  const { data, isLoading: isFetching } = useQuery<{
    tasks: Task[];
    totalCount: number;
    totalPages: number;
    currentPage: number;
  }>({
    queryKey: ["tasks", currentPage, searchQuery, activeTab],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(currentPage),
        limit: String(LIMIT),
      });
      if (searchQuery.trim()) {
        params.set("search", searchQuery.trim());
      }
      if (activeTab !== "all") {
        params.set("platform", activeTab);
      }
      const res = await fetch(`/api/admin/tasks?${params}`);
      if (!res.ok) throw new Error("Failed to load tasks from server.");
      return res.json();
    },
  });

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- standard fetch-on-mount
    setCurrentPage(1);
  }, [searchQuery, activeTab]);

  const tasks = data?.tasks ?? [];
  const totalPages = data?.totalPages ?? 1;

  const tabs = TASK_TABS.map((t) => t.value);
  // The server already filters by platform when activeTab !== "all", so no
  // client-side filtering is needed (or correct, since `tasks` is only the
  // current page).
  const currentTasks = tasks;

  // ── Mutations ──────────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: async (payload: TaskFormPayload) => {
      const res = await fetch("/api/admin/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const details = body.details as Record<string, string[]> | undefined;
        if (details && Object.keys(details).length > 0) {
          const messages = Object.entries(details)
            .map(([field, errs]) => `• ${field}: ${(errs as string[])[0]}`)
            .join("\n");
          throw new Error(messages);
        }
        throw new Error(body.error || "Failed to create task");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Task created successfully!");
      setIsFormOpen(false);
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
    onError: (error: Error) => {
      const msg = error?.message ?? "";
      toast.error(msg || "Something went wrong. Please try again.", {
        description: msg.includes("•")
          ? "Please fix the following fields:"
          : undefined,
        duration: 6000,
      });
    },
  });

  const editMutation = useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: Task["id"];
      payload: TaskFormPayload;
    }) => {
      const res = await fetch(`/api/admin/tasks/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const details = body.details as Record<string, string[]> | undefined;
        if (details && Object.keys(details).length > 0) {
          const messages = Object.entries(details)
            .map(([field, errs]) => `• ${field}: ${(errs as string[])[0]}`)
            .join("\n");
          throw new Error(messages);
        }
        throw new Error(body.error || "Failed to update task");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Task updated successfully!");
      setIsFormOpen(false);
      setEditingTask(null);
      setSelectedTask(null);
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
    onError: (error: Error) => {
      const msg = error?.message ?? "";
      toast.error(msg || "Something went wrong updating the task.", {
        description: msg.includes("•")
          ? "Please fix the following fields:"
          : undefined,
        duration: 6000,
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (taskId: Task["id"]) => {
      const res = await fetch(`/api/admin/tasks/${taskId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete task");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Task deleted successfully!");
      setSelectedTask(null);
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
    onError: () => toast.error("Something went wrong deleting task"),
  });

  // ── Handlers ───────────────────────────────────────────────────────────────
  const openAddForm = () => {
    setEditingTask(null);
    setIsFormOpen(true);
  };

  const openEditForm = (task: Task) => {
    setEditingTask(task);
    setSelectedTask(null);
    setIsFormOpen(true);
  };

  const handleFormSubmit = (payload: TaskFormPayload) => {
    if (editingTask) {
      editMutation.mutate({ id: editingTask.id, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  // Measure real tab positions for the sliding pill
  

  useEffect(() => {
    const activeEl = tabRefs.current[activeTab];
    if (activeEl) {
      setPillStyle({
        width: activeEl.offsetWidth,
        left: activeEl.offsetLeft,
      });
    }
  }, [activeTab, tabs.length]);
  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-5 w-full max-w-6xl mx-auto p-4 sm:p-6 text-black">
      <style>{ANIMATIONS}</style>

      {/* Header */}
      <div className="bg-white rounded-[2.5rem] border border-black/5 shadow-sm p-6 flex flex-col gap-4">
        {/* Tabs row */}
        <div className="flex items-center gap-3">
          <div className="relative flex p-1 bg-zinc-100 rounded-xl overflow-x-auto">
            {/* Sliding pill — driven by real measured position */}
            <div
              className="absolute top-1 bottom-1 rounded-lg bg-white shadow-sm ring-1 ring-black/5 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
              style={{
                width: pillStyle.width,
                transform: `translateX(${pillStyle.left}px)`,
              }}
            />
            {tabs.map((tab) => (
              <button
                key={tab}
                ref={(el) => {
                  tabRefs.current[tab] = el;
                }}
                onClick={() => handleTabChange(tab)}
                className={`relative z-10 px-5 py-2 text-sm font-bold rounded-lg transition-colors duration-200 capitalize whitespace-nowrap
        ${activeTab === tab ? "text-black" : "text-zinc-400 hover:text-zinc-600"}`}
              >
                {TAB_LABELS[tab] ?? tab}
              </button>
            ))}
          </div>
          <span className="text-[10px] font-black uppercase tracking-wider text-zinc-500 bg-zinc-100 px-3 py-1.5 rounded-full shrink-0">
            {currentTasks.length} {currentTasks.length === 1 ? "task" : "tasks"}
          </span>
        </div>

        {/* Actions row */}
        <div className="flex items-center gap-3 w-full">
          <div className="relative flex-1 sm:flex-initial sm:w-64">
            <svg
              className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tasks..."
              className="w-full pl-10 pr-4 py-2.5 bg-zinc-50 border border-black/5 rounded-2xl text-sm font-medium text-black placeholder:text-zinc-400 focus:outline-none focus:border-[#FACC15] transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 hover:text-black transition-colors"
              >
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={() => setIsBulkOpen(true)}
              className="flex items-center gap-2 bg-white border border-black/10 hover:bg-zinc-50 text-black font-black text-xs uppercase tracking-wider py-2.5 px-4 rounded-2xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-sm"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                />
              </svg>
              Import
            </button>
            <button
              onClick={openAddForm}
              className="flex items-center gap-2 bg-[#FACC15] hover:bg-black hover:text-[#FACC15] text-black font-black text-xs uppercase tracking-wider py-2.5 px-5 rounded-2xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-sm"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2.5"
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Add Task
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <TaskTable
        tasks={currentTasks}
        isLoading={isFetching}
        activeTab={activeTab}
        isAnimating={isAnimating}
        slideDirection={slideDirection}
        onDetails={setSelectedTask}
        searchQuery={searchQuery}
      />

      {/* Pagination */}
      {!searchQuery && (
        <div className="flex items-center justify-between px-1 py-3">
          <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
            Page {currentPage} of {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="flex items-center gap-1 px-4 py-2 text-xs font-black uppercase tracking-wider rounded-xl border border-black/10 bg-white text-black hover:bg-zinc-50 disabled:opacity-30 disabled:pointer-events-none transition-all"
            >
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2.5"
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              Prev
            </button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              const start = Math.max(1, currentPage - 2);
              const pageNum = start + i;
              if (pageNum > totalPages) return null;
              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`w-9 h-9 rounded-xl text-xs font-black transition-all ${
                    pageNum === currentPage
                      ? "bg-black text-[#FACC15] shadow-sm"
                      : "bg-white border border-black/10 text-black hover:bg-zinc-50"
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="flex items-center gap-1 px-4 py-2 text-xs font-black uppercase tracking-wider rounded-xl border border-black/10 bg-white text-black hover:bg-zinc-50 disabled:opacity-30 disabled:pointer-events-none transition-all"
            >
              Next
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2.5"
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Details modal */}
      <AnimatePresence>
        {selectedTask && (
          <TaskDetailsModal
            task={selectedTask}
            isDeleting={deleteMutation.isPending}
            isSaving={editMutation.isPending}
            onClose={() => setSelectedTask(null)}
            onDelete={(id) => deleteMutation.mutate(id)}
            onEdit={openEditForm}
            onSave={(id, payload) => {
              editMutation.mutate({ id, payload: payload as TaskFormPayload });
            }}
          />
        )}
      </AnimatePresence>

      {/* Add / Edit form modal */}
      <AnimatePresence>
        {isFormOpen && (
          <TaskFormModal
            mode={editingTask ? "edit" : "add"}
            task={editingTask}
            isSaving={createMutation.isPending || editMutation.isPending}
            onClose={() => {
              setIsFormOpen(false);
              setEditingTask(null);
            }}
            onSubmit={handleFormSubmit}
          />
        )}
      </AnimatePresence>

      {/* Bulk Import modal */}
      <BulkImportModal
        isOpen={isBulkOpen}
        onClose={() => {
          setIsBulkOpen(false);
          queryClient.invalidateQueries({ queryKey: ["tasks"] });
        }}
      />
    </div>
  );
}
