import { useState } from "react";
import { Task } from "@/src/lib/manage-task/types";
import { ModalShell } from "./ModalShell";
import { PlatformBadge } from "./PlatformBadge";

type Props = {
  task: Task;
  isDeleting: boolean;
  onClose: () => void;
  onDelete: (id: Task["id"]) => void;
  onEdit: (task: Task) => void;
};

export function TaskDetailsModal({
  task,
  isDeleting,
  onClose,
  onDelete,
  onEdit,
}: Props) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const headerExtras = (
    <>
      <span className="text-xs font-bold text-white bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-full">
        ✦ {task.rewardPoint ?? "—"} pts reward
      </span>
      {task.platform && (
        <PlatformBadge
          platform={task.platform}
        />
      )}
    </>
  );

  const footer = (
    <>
      <button
        onClick={onClose}
        className="px-5 py-2.5 text-xs font-black uppercase tracking-wider text-zinc-500 bg-zinc-100 hover:bg-zinc-200 rounded-2xl transition-colors"
      >
        Close
      </button>
      {showDeleteConfirm ? (
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowDeleteConfirm(false)}
            className="px-4 py-2.5 text-xs font-black uppercase tracking-wider text-zinc-500 bg-zinc-100 hover:bg-zinc-200 rounded-2xl transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onDelete(task.id)}
            disabled={isDeleting}
            className="px-5 py-2.5 text-xs font-black uppercase tracking-wider text-white bg-red-600 hover:bg-red-700 rounded-2xl transition-all disabled:opacity-50"
          >
            {isDeleting ? "Deleting..." : "Confirm Delete"}
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="px-4 py-2.5 text-xs font-black uppercase tracking-wider text-red-600 bg-red-50 hover:bg-red-100 rounded-2xl transition-all"
          >
            Delete
          </button>
          <button
            onClick={() => onEdit(task)}
            className="px-5 py-2.5 text-xs font-black uppercase tracking-wider text-black bg-[#FACC15] hover:bg-black hover:text-[#FACC15] rounded-2xl transition-all"
          >
            Edit Task
          </button>
        </div>
      )}
    </>
  );

  return (
    <ModalShell
      onClose={onClose}
      title={task.title}
      subtitle="Task Details"
      headerExtras={headerExtras}
      footer={footer}
    >
      <div className="px-6 pb-6 space-y-5">
        {/* Description */}
        <div>
          <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
            Description
          </label>
          <div className="mt-1.5 p-4 bg-zinc-50 rounded-[2rem] border border-black/5">
            <p className="text-sm text-zinc-700 leading-relaxed font-medium">
              {task.description}
            </p>
          </div>
        </div>

        {/* Linked post */}
        {task.socialPostUrl && (
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
              Linked Post
            </label>
            <a
              href={task.socialPostUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1.5 flex items-center gap-2 p-3 bg-blue-50 rounded-[2rem] border border-blue-100 text-sm text-blue-600 font-bold hover:underline"
            >
              ↗ View Post
            </a>
          </div>
        )}

        {/* Video URL */}
        {task.videoUrl && (
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
              YouTube Video
            </label>
            <a
              href={task.videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1.5 flex items-center gap-2 p-3 bg-red-50 rounded-[2rem] border border-red-100 text-sm text-red-600 font-bold hover:underline"
            >
              ▶ Watch Video
            </a>
          </div>
        )}

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-black p-4 rounded-[2rem]">
            <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-1">
              Created
            </p>
            <p className="text-white text-sm font-black">{task.created}</p>
          </div>
          <div className="bg-emerald-50 p-4 rounded-[2rem] border border-emerald-100">
            <p className="text-emerald-600 text-[10px] font-black uppercase tracking-widest mb-1">
              Completions
            </p>
            <p className="text-emerald-900 text-sm font-black">
              {task.completedUsers} users
            </p>
          </div>
        </div>
      </div>
    </ModalShell>
  );
}
