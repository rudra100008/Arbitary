import { useState } from "react";
import { toast } from "sonner";
import {
  Globe,
  Type,
  Trophy,
  Clock,
  Zap,
  Share2,
  CheckCircle2,
  Video
} from "lucide-react";

import { ModalShell } from "./ModalShell";
import { PlatformSelector } from "./PlatformSelector";
import { SocialPostPicker } from "./SocialPostPicker";
import {
  Platform,
  PLATFORM_LABELS,
  SocialPost,
} from "@/src/lib/social/type";
import { ModalMode, Task, TaskSource } from "@/src/lib/manage-task/types";

export type TaskFormPayload = {
  title: string;
  description: string;
  taskType: string;
  rewardPoint: number;
  videoUrl: string | null;
  platform: Platform | null;
  socialPostId: string | null;
  socialPostUrl: string | null;
  watchDuration: number | null;
  difficulty: "easy" | "medium" | "hard";
  isFlash: boolean;
  isShare: boolean;
  shareThreshold: number;
  expiresAt: string | null;
};

type Props = {
  mode: ModalMode;
  task?: Task | null;
  isSaving: boolean;
  onClose: () => void;
  onSubmit: (payload: TaskFormPayload) => void;
};

const inputClass =
  "w-full px-4 py-2.5 bg-zinc-50 border border-black/5 rounded-2xl text-sm font-medium text-black placeholder:text-zinc-400 focus:outline-none focus:border-[#FACC15] transition-all";
const labelClass =
  "block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1.5";
const sectionClass =
  "p-5 rounded-3xl border border-black/5 bg-white space-y-5 transition-all hover:border-black/10";
const sectionHeaderClass =
  "flex items-center gap-3 mb-4 pb-2 border-b border-black/5";

export function TaskFormModal({
  mode,
  task,
  isSaving,
  onClose,
  onSubmit,
}: Props) {
  const [taskSource, setTaskSource] = useState<TaskSource>(
    task?.platform ?? "manual",
  );
  const [selectedPost, setSelectedPost] = useState<SocialPost | null>(null);
  const [isFlash, setIsFlash] = useState<boolean>(
    task?.isFlash === true,
  );
  const [isShare, setIsShare] = useState<boolean>(
    task?.isShare === true,
  );

  const isSocialPlatform = taskSource !== "manual" && taskSource !== "daily-login";
  const isYoutube = taskSource === "youtube";
  const isDailyLogin = taskSource === "daily-login";

  const handleSourceChange = (source: TaskSource) => {
    setTaskSource(source);
    setSelectedPost(null);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    if (
      isSocialPlatform &&
      !selectedPost &&
      taskSource !== "youtube" &&
      mode === "add"
    ) {
      toast.error(
        `Please select a ${PLATFORM_LABELS[taskSource as Platform]} post`,
      );
      return;
    }

    const rawDuration = formData.get("watchDuration");
    const watchDuration =
      isYoutube && rawDuration ? Math.max(1, Number(rawDuration)) : null;

    const flashValue = formData.get("isFlash") === "on" || isFlash;

    onSubmit({
      title: formData.get("title") as string,
      description: formData.get("description") as string,
      taskType: formData.get("taskType") as string,
      rewardPoint: Number(formData.get("points")),
      videoUrl: isDailyLogin ? null : (formData.get("videoUrl") as string) || null,
      platform: isSocialPlatform || isDailyLogin ? (taskSource as Platform) : null,
      socialPostId:
        selectedPost?.id ??
        (mode === "edit" ? (task?.socialPostId ?? null) : null),
      socialPostUrl: isSocialPlatform
        ? (selectedPost?.url ??
          (mode === "edit" ? (task?.socialPostUrl ?? null) : null))
        : isDailyLogin
          ? null
          : (formData.get("manualUrl") as string) || null,
      watchDuration: isDailyLogin ? null : watchDuration,
      difficulty: (formData.get("difficulty") as "easy" | "medium" | "hard") || "easy",
      isFlash: flashValue,
      isShare: isShare,
      shareThreshold: Number(formData.get("shareThreshold")) || 3,
      expiresAt: (flashValue || task?.isFlash) ? (formData.get("expiresAt") as string) || null : null,
    });
  };

  const defaultDuration =
    mode === "edit" ? (task?.watchDuration ?? 60) : 60;

  return (
    <ModalShell
      onClose={onClose}
      title={mode === "edit" ? "Edit Task" : "Add Task"}
      subtitle={mode === "edit" ? "Edit" : "New"}
      scrollableBody
    >
      <form className="px-6 pb-6 space-y-8" onSubmit={handleSubmit}>

        {/* SECTION 1: Platform & Action */}
        <div className={sectionClass}>
          <div className={sectionHeaderClass}>
            <Globe className="w-4 h-4 text-[#FACC15]" />
            <span className="text-[11px] font-black uppercase tracking-widest text-black">1. Platform & Action</span>
          </div>

          <div className="space-y-5">
            <PlatformSelector value={taskSource} onChange={handleSourceChange} />

            {isSocialPlatform && !isYoutube && (
              <div className="border border-black/5 rounded-2xl p-4 bg-zinc-50 space-y-3">
                <p className={labelClass}>
                  Select {PLATFORM_LABELS[taskSource as Platform]} Post
                </p>
                <SocialPostPicker
                  platform={taskSource as Platform}
                  selected={selectedPost}
                  onSelect={setSelectedPost}
                />
                {selectedPost && (
                  <div className="flex items-center gap-2 p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <p className="text-xs font-bold text-emerald-700 truncate">
                      Post selected: {selectedPost.title}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* SECTION 2: Task Content */}
        <div className={sectionClass}>
          <div className={sectionHeaderClass}>
            <Type className="w-4 h-4 text-[#FACC15]" />
            <span className="text-[11px] font-black uppercase tracking-widest text-black">2. Task Content</span>
          </div>

          <div className="space-y-4">
            <div>
              <label htmlFor="title" className={labelClass}>Task Title</label>
              <input
                type="text"
                id="title"
                name="title"
                required
                defaultValue={
                  mode === "edit"
                    ? task?.title
                    : selectedPost
                      ? `Like our ${PLATFORM_LABELS[taskSource as Platform] || ""} post`
                      : ""
                }
                placeholder="e.g. Watch our latest video"
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="description" className={labelClass}>Description</label>
              <textarea
                id="description"
                name="description"
                rows={2}
                required
                defaultValue={mode === "edit" ? task?.description : ""}
                placeholder="Describe the task..."
                className={`${inputClass} resize-none`}
              />
            </div>

            {taskSource === "manual" && (
              <div>
                <label htmlFor="manualUrl" className={labelClass}>Target URL (Optional)</label>
                <input
                  type="url"
                  id="manualUrl"
                  name="manualUrl"
                  defaultValue={mode === "edit" ? task?.socialPostUrl : ""}
                  placeholder="https://..."
                  className={inputClass}
                />
              </div>
            )}

            {!isDailyLogin && (
              <div>
                <label htmlFor="videoUrl" className={labelClass}>
                  YouTube Video URL {isYoutube ? <span className="text-red-400">*</span> : "(Optional)"}
                </label>
                <input
                  type="url"
                  id="videoUrl"
                  name="videoUrl"
                  required={isYoutube}
                  defaultValue={mode === "edit" ? (task?.videoUrl ?? "") : ""}
                  placeholder="https://youtube.com/watch?v=..."
                  className={inputClass}
                />
              </div>
            )}

            {isYoutube && (
              <div className="rounded-2xl border border-red-200 bg-red-50/60 p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <Video className="w-4 h-4 text-red-600" />
                  <label htmlFor="watchDuration" className="block text-[10px] font-black uppercase tracking-widest text-red-600">
                    Required Watch Duration
                  </label>
                </div>
                <p className="text-[11px] text-red-400/80 mt-0.5 font-medium">
                  Users must watch the video for this many seconds to earn points.
                </p>
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      id="watchDuration"
                      name="watchDuration"
                      min={10}
                      max={3600}
                      required
                      defaultValue={defaultDuration}
                      className="w-24 px-4 py-2.5 bg-white border border-red-200 rounded-2xl text-sm font-black text-red-700 focus:outline-none focus:border-red-400 transition-all"
                    />
                    <span className="text-sm font-bold text-red-500">seconds</span>
                  </div>
                  <div className="flex gap-1.5">
                    {[30, 60, 120, 300].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => {
                          const input = document.getElementById("watchDuration") as HTMLInputElement;
                          if (input) input.value = String(s);
                        }}
                        className="text-[10px] font-black px-3 py-1.5 rounded-xl bg-white border border-red-200 text-red-500 hover:bg-red-500 hover:text-white hover:border-red-500 transition-all"
                      >
                        {s >= 60 ? `${s / 60}m` : `${s}s`}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* SECTION 3: Rewards & Difficulty */}
        <div className={sectionClass}>
          <div className={sectionHeaderClass}>
            <Trophy className="w-4 h-4 text-[#FACC15]" />
            <span className="text-[11px] font-black uppercase tracking-widest text-black">3. Rewards & Difficulty</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="taskType" className={labelClass}>Type</label>
              <select
                id="taskType"
                name="taskType"
                required
                defaultValue={mode === "edit" ? task?.taskType : "social"}
                className={inputClass}
              >
                <option value="daily">Daily Task</option>
                <option value="social">Social Action</option>
                <option value="share">Share Task</option>
                <option value="special">Special Task</option>
              </select>
            </div>
            <div>
              <label htmlFor="points" className={labelClass}>Points</label>
              <input
                type="number"
                id="points"
                name="points"
                min="0"
                required
                defaultValue={mode === "edit" ? task?.rewardPoint : 10}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="difficulty" className={labelClass}>Difficulty</label>
              <select
                id="difficulty"
                name="difficulty"
                defaultValue={mode === "edit" ? task?.difficulty || "easy" : "easy"}
                className={inputClass}
              >
                <option value="easy">Easy (10 pts)</option>
                <option value="medium">Medium (25 pts)</option>
                <option value="hard">Hard (50 pts)</option>
              </select>
            </div>
          </div>
        </div>

        {/* SECTION 4: Rules & Expirations */}
        <div className={sectionClass}>
          <div className={sectionHeaderClass}>
            <Clock className="w-4 h-4 text-[#FACC15]" />
            <span className="text-[11px] font-black uppercase tracking-widest text-black">4. Rules & Expirations</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Flash Task Toggle */}
            <div
              onClick={() => setIsFlash(!isFlash)}
              className={`group cursor-pointer p-4 rounded-2xl border-2 transition-all ${
                isFlash
                ? "border-[#FACC15] bg-[#FACC15]/5 shadow-inner"
                : "border-black/5 bg-zinc-50 hover:border-black/10"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${isFlash ? "bg-[#FACC15] text-black" : "bg-zinc-200 text-zinc-500"}`}>
                    <Zap className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-black uppercase tracking-wider text-black">Flash Task</span>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                  isFlash ? "border-[#FACC15] bg-[#FACC15]" : "border-zinc-300 bg-white"
                }`}>
                  {isFlash && <CheckCircle2 className="w-3 h-3 text-black" />}
                </div>
              </div>
              <p className="text-[10px] text-zinc-400 font-medium">
                Time-limited task with countdown
              </p>
              <input type="checkbox" name="isFlash" checked={isFlash} readOnly className="hidden" />
            </div>

            {/* Share Task Toggle */}
            <div
              onClick={() => setIsShare(!isShare)}
              className={`group cursor-pointer p-4 rounded-2xl border-2 transition-all ${
                isShare
                ? "border-[#FACC15] bg-[#FACC15]/5 shadow-inner"
                : "border-black/5 bg-zinc-50 hover:border-black/10"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${isShare ? "bg-[#FACC15] text-black" : "bg-zinc-200 text-zinc-500"}`}>
                    <Share2 className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-black uppercase tracking-wider text-black">Share Task</span>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                  isShare ? "border-[#FACC15] bg-[#FACC15]" : "border-zinc-300 bg-white"
                }`}>
                  {isShare && <CheckCircle2 className="w-3 h-3 text-black" />}
                </div>
              </div>
              <p className="text-[10px] text-zinc-400 font-medium">
                Generates a unique share link; rewards when N people click
              </p>
              <input type="checkbox" name="isShare" checked={isShare} readOnly className="hidden" />
            </div>
          </div>

          <div className="mt-6 space-y-4">
            {isFlash && (
              <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                <label htmlFor="expiresAt" className={labelClass}>Expires At</label>
                <input
                  type="datetime-local"
                  id="expiresAt"
                  name="expiresAt"
                  defaultValue={
                    mode === "edit" && task?.expiresAt
                      ? new Date(task.expiresAt).toISOString().slice(0, 16)
                      : ""
                  }
                  className={inputClass}
                />
              </div>
            )}
            {isShare && (
              <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                <label htmlFor="shareThreshold" className={labelClass}>Required Clicks</label>
                <input
                  type="number"
                  id="shareThreshold"
                  name="shareThreshold"
                  min={1}
                  max={100}
                  defaultValue={mode === "edit" ? task?.shareThreshold ?? 3 : 3}
                  className={inputClass}
                />
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 text-xs font-black uppercase tracking-wider text-zinc-500 bg-zinc-100 hover:bg-zinc-200 rounded-2xl transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-2.5 text-xs font-black uppercase tracking-wider text-black bg-[#FACC15] hover:bg-black hover:text-[#FACC15] rounded-2xl transition-all hover:scale-[1.0 la] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            {isSaving
              ? "Saving..."
              : mode === "edit"
                ? "Save Changes"
                : "Create Task"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}
