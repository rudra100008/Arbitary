import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Globe,
  Type,
  Clock,
  Zap,
  CheckCircle2,
  Video,
  ThumbsUp,
  Bell,
  MessageSquare,
  Eye,
  Share2,
  Users,
} from "lucide-react";

import { ModalShell } from "./ModalShell";
import { PlatformSelector } from "./PlatformSelector";
import { SocialPostPicker } from "./SocialPostPicker";
import { Platform, PLATFORM_LABELS, SocialPost } from "@/src/lib/social/type";
import { ModalMode, Task, TaskSource } from "@/src/lib/manage-task/types";

export type TaskFormPayload = {
  title: string;
  description: string;
  taskType: string;
  rewardPoint: number;
  videoUrl: string | null;
  platform: Platform | "screenshot" | "share" | null;
  socialPostId: string | null;
  socialPostUrl: string | null;
  socialPlatform?: string | null;
  targetUrl?: string | null;
  isActive?: boolean;
  watchDuration: number | null;
  difficulty: "easy" | "medium" | "hard";
  isFlash: boolean;
  isShare: boolean;
  shareThreshold: number;
  expiresAt: string | null;
  commentInstruction: string | null;
  /** true = Daily Refresh (resets at midnight), false = Permanent */
  isRecurring: boolean;
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
    task?.isShare ? "share" : (task?.platform ?? "manual"),
  );
  const [selectedPost, setSelectedPost] = useState<SocialPost | null>(null);
  const [isFlash, setIsFlash] = useState<boolean>(task?.isFlash === true);
  const [isRecurring, setIsRecurring] = useState<boolean>(
    task?.isRecurring ?? false,
  );
  const [rewardPoints, setRewardPoints] = useState<number | "">(
    mode === "edit" ? (task?.rewardPoint ?? "") : "",
  );

  // Auto-difficulty from points: <=10 easy, <=25 medium, >25 hard
  const autoDifficulty =
    (rewardPoints === "" ? 0 : rewardPoints) <= 10
      ? "easy"
      : (rewardPoints as number) <= 25
        ? "medium"
        : "hard";

  const detectYoutubeAction = ():
    | "watch"
    | "subscribe"
    | "like"
    | "comment" => {
    if (!task) return "watch";
    const tt = (task.taskType || "").toLowerCase();
    if (tt === "video_watch") return "watch";
    if (tt === "youtube_subscribe") return "subscribe";
    if (tt === "youtube_like") return "like";
    if (tt === "youtube_comment") return "comment";
    // Legacy fallback: tasks created before structured YouTube action types
    // existed all share taskType "social"  infer from title/description
    // the same way verification's legacy fallback does, so editing an old
    // task pre-selects the right action in the form.
    const text = (
      (task.title || "") +
      " " +
      (task.description || "")
    ).toLowerCase();
    if (text.includes("subscribe") || text.includes("sub")) return "subscribe";
    if (text.includes("like")) return "like";
    if (text.includes("comment")) return "comment";
    return "watch";
  };

  const [youtubeAction, setYoutubeAction] = useState<
    "watch" | "subscribe" | "like" | "comment"
  >(detectYoutubeAction);

  const isShare = taskSource === "share";
  const isSocialPlatform = taskSource !== "manual" && taskSource !== "share";
  const isYoutube = taskSource === "youtube";
  const isYtWatch = isYoutube && youtubeAction === "watch";
  const isManualScreenshot = taskSource === "manual";

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
      isYtWatch && rawDuration ? Math.max(1, Number(rawDuration)) : null;
    const flashValue = formData.get("isFlash") === "on" || isFlash;

    let resolvedTaskType: string;
    if (isShare) {
      resolvedTaskType = "share";
    } else if (isManualScreenshot) {
      resolvedTaskType = "SCREENSHOT_UPLOAD";
    } else if (isYoutube) {
      resolvedTaskType =
        youtubeAction === "watch"
          ? "video_watch"
          : youtubeAction === "subscribe"
            ? "youtube_subscribe"
            : youtubeAction === "like"
              ? "youtube_like"
              : "youtube_comment";
    } else {
      // facebook, instagram → social
      resolvedTaskType = "social";
    }

    onSubmit({
      title: formData.get("title") as string,
      description: formData.get("description") as string,
      taskType: resolvedTaskType,
      rewardPoint: Number(formData.get("points")),
      videoUrl: (formData.get("videoUrl") as string) || null,
      platform: isManualScreenshot
        ? "screenshot"
        : isShare
          ? "share"
          : isSocialPlatform
            ? (taskSource as Platform)
            : null,
      socialPostId:
        selectedPost?.id ??
        (mode === "edit" ? (task?.socialPostId ?? null) : null),
      socialPostUrl: isSocialPlatform
        ? (selectedPost?.url ??
          (mode === "edit" ? (task?.socialPostUrl ?? null) : null))
        : (formData.get("manualUrl") as string) || null,
      socialPlatform: isYoutube ? "youtube" : null,
      targetUrl: isShare
        ? (formData.get("shareUrl") as string) || null
        : (formData.get("videoUrl") as string) || null,
      isActive: true,
      watchDuration,
      difficulty:
        (formData.get("difficulty") as "easy" | "medium" | "hard") ||
        autoDifficulty,
      isFlash: flashValue,
      isShare: isShare,
      shareThreshold: isShare ? Number(formData.get("shareThreshold")) || 3 : 3,
      expiresAt:
        flashValue || task?.isFlash
          ? (formData.get("expiresAt") as string) || null
          : null,
      commentInstruction:
        (formData.get("commentInstruction") as string) || null,
      isRecurring,
    });
  };

  const defaultDuration =
    mode === "edit" ? (task?.watchDuration ?? 30) : 30;

  return (
    <ModalShell
      onClose={onClose}
      title={mode === "edit" ? "Edit Task" : "Add Task"}
      subtitle={mode === "edit" ? "Edit" : "New"}
      scrollableBody
    >
      <form className="px-6 pb-6 space-y-8" onSubmit={handleSubmit}>
        {/* STEP 1: Source */}
        <div className={sectionClass}>
          <div className={sectionHeaderClass}>
            <Globe className="w-4 h-4 text-[#FACC15]" />
            <span className="text-[11px] font-black uppercase tracking-widest text-black">
              1. Choose Source
            </span>
          </div>
          <div className="space-y-5">
            <PlatformSelector
              value={taskSource}
              onChange={handleSourceChange}
            />

            {/* YouTube action sub-selector */}
            <AnimatePresence mode="wait">
              {isYoutube && (
                <motion.div
                  key="youtube-action"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.25 }}
                  className="border border-red-200 rounded-2xl p-4 bg-red-50/40 space-y-3"
                >
                  <p className={labelClass}>YouTube Action</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {[
                      {
                        value: "watch" as const,
                        label: "Watch Video",
                        icon: Eye,
                      },
                      {
                        value: "subscribe" as const,
                        label: "Subscribe",
                        icon: Bell,
                      },
                      { value: "like" as const, label: "Like", icon: ThumbsUp },
                      {
                        value: "comment" as const,
                        label: "Comment",
                        icon: MessageSquare,
                      },
                    ].map((action) => (
                      <button
                        key={action.value}
                        type="button"
                        onClick={() => setYoutubeAction(action.value)}
                        className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border-2 text-xs font-black tracking-wider transition-all ${
                          youtubeAction === action.value
                            ? "border-red-500 bg-red-500 text-white shadow-md"
                            : "border-black/5 bg-white text-zinc-500 hover:border-red-300"
                        }`}
                      >
                        <action.icon className="w-4 h-4" />
                        {action.label}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-red-400/80 font-medium">
                    {youtubeAction === "watch" &&
                      "Users must watch the video for the specified duration to earn points."}
                    {youtubeAction === "subscribe" &&
                      "Users must subscribe to the YouTube channel. Include the channel URL or handle."}
                    {youtubeAction === "like" &&
                      "Users must like the YouTube video. Verified via YouTube API."}
                    {youtubeAction === "comment" &&
                      "Users must comment on the YouTube video. Verified via YouTube API."}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* STEP 2: Task Details */}
        <AnimatePresence mode="wait">
          <motion.div
            key={taskSource}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="space-y-8"
          >
            {/* ── SHARE SOURCE: dedicated form ── */}
            {isShare ? (
              <div className={sectionClass}>
                <div className={sectionHeaderClass}>
                  <Share2 className="w-4 h-4 text-blue-500" />
                  <span className="text-[11px] font-black uppercase tracking-widest text-black">
                    Share Task Details
                  </span>
                </div>

                <div className="space-y-4">
                  <div>
                    <label htmlFor="title" className={labelClass}>
                      Task Title
                    </label>
                    <input
                      type="text"
                      id="title"
                      name="title"
                      required
                      defaultValue={mode === "edit" ? task?.title : ""}
                      placeholder="e.g. Share our referral link"
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label htmlFor="description" className={labelClass}>
                      Description
                    </label>
                    <textarea
                      id="description"
                      name="description"
                      rows={2}
                      required
                      defaultValue={mode === "edit" ? task?.description : ""}
                      placeholder="Describe what users need to share and why..."
                      className={`${inputClass} resize-none`}
                    />
                  </div>

                  <div>
                    <label htmlFor="shareUrl" className={labelClass}>
                      Link to Share <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="url"
                      id="shareUrl"
                      name="shareUrl"
                      required
                      defaultValue={
                        mode === "edit" ? (task?.targetUrl ?? "") : ""
                      }
                      placeholder="https://... (link users must share)"
                      className={inputClass}
                    />
                    <p className="text-[10px] text-zinc-400 font-medium mt-1.5">
                      This is the link users will share with others to complete
                      the task.
                    </p>
                  </div>

                  <div>
                    <label htmlFor="shareThreshold" className={labelClass}>
                      <Users className="w-3 h-3 inline mr-1" />
                      Minimum Shares Required{" "}
                      <span className="text-red-400">*</span>
                    </label>
                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          id="shareThreshold"
                          name="shareThreshold"
                          min={1}
                          max={100}
                          required
                          defaultValue={
                            mode === "edit" ? (task?.shareThreshold ?? 3) : 3
                          }
                          className="w-24 px-4 py-2.5 bg-white border border-blue-200 rounded-2xl text-sm font-black text-blue-700 focus:outline-none focus:border-blue-400 transition-all"
                        />
                        <span className="text-sm font-bold text-blue-500">
                          users
                        </span>
                      </div>
                      <div className="flex gap-1.5">
                        {[3, 5, 10, 20].map((n) => (
                          <button
                            key={n}
                            type="button"
                            onClick={() => {
                              const input = document.getElementById(
                                "shareThreshold",
                              ) as HTMLInputElement;
                              if (input) input.value = String(n);
                            }}
                            className="text-[10px] font-black px-3 py-1.5 rounded-xl bg-white border border-blue-200 text-blue-500 hover:bg-blue-500 hover:text-white hover:border-blue-500 transition-all"
                          >
                            {n}
                          </button>
                        ))}
                      </div>
                    </div>
                    <p className="text-[10px] text-zinc-400 font-medium mt-1.5">
                      User must share the link with at least this many people to
                      earn points.
                    </p>
                  </div>

                  <div>
                    <label htmlFor="points" className={labelClass}>
                      Reward Points <span className="text-red-400">*</span>
                    </label>
                    <div className="flex items-center gap-3 flex-wrap">
                      <input
                        type="number"
                        id="points"
                        name="points"
                        min={1}
                        required
                        value={rewardPoints}
                        onChange={(e) => {
                          const raw = e.target.value.replace(/^0+(?=\d)/, "");
                          setRewardPoints(raw === "" ? "" : Number(raw));
                        }}
                        className="w-32 px-4 py-2.5 bg-zinc-50 border border-black/5 rounded-2xl text-sm font-black text-black focus:outline-none focus:border-[#FACC15] transition-all"
                      />
                      <div className="flex gap-1.5">
                        {[5, 10, 20, 50].map((n) => (
                          <button
                            key={n}
                            type="button"
                            onClick={() => setRewardPoints(n)}
                            className={`text-[10px] font-black px-3 py-1.5 rounded-xl border transition-all ${
                              rewardPoints === n
                                ? "bg-[#FACC15] border-[#FACC15] text-black"
                                : "bg-white border-black/10 text-zinc-500 hover:border-[#FACC15]"
                            }`}
                          >
                            {n} pts
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* ── Auto Difficulty ── */}
                  <div>
                    <label className={labelClass}>Difficulty</label>
                    <input
                      type="hidden"
                      name="difficulty"
                      value={autoDifficulty}
                    />
                    <div className="flex gap-2">
                      {(["easy", "medium", "hard"] as const).map((d) => (
                        <div
                          key={d}
                          className={`flex-1 text-center py-2 rounded-2xl text-[10px] font-black uppercase tracking-wider border-2 transition-all ${
                            autoDifficulty === d
                              ? d === "easy"
                                ? "border-emerald-400 bg-emerald-50 text-emerald-700"
                                : d === "medium"
                                  ? "border-orange-400 bg-orange-50 text-orange-700"
                                  : "border-red-400 bg-red-50 text-red-700"
                              : "border-black/5 bg-zinc-50 text-zinc-300"
                          }`}
                        >
                          {d}
                        </div>
                      ))}
                    </div>
                    <p className="text-[10px] text-zinc-400 font-medium mt-1.5">
                      Auto-set from reward points — ≤10 pts: Easy · ≤25 pts:
                      Medium · &gt;25 pts: Hard
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              /* ── ALL OTHER SOURCES: original Task Details form ── */
              <div className={sectionClass}>
                <div className={sectionHeaderClass}>
                  <Type className="w-4 h-4 text-[#FACC15]" />
                  <span className="text-[11px] font-black uppercase tracking-widest text-black">
                    Task Details
                  </span>
                </div>

                <div className="space-y-4">
                  <div>
                    <label htmlFor="title" className={labelClass}>
                      Task Title
                    </label>
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
                    <label htmlFor="description" className={labelClass}>
                      Description
                    </label>
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

                  {isManualScreenshot && (
                    <div>
                      <label htmlFor="manualUrl" className={labelClass}>
                        Target URL (Optional)
                      </label>
                      <input
                        type="url"
                        id="manualUrl"
                        name="manualUrl"
                        defaultValue={
                          mode === "edit" ? task?.socialPostUrl : ""
                        }
                        placeholder="https://..."
                        className={inputClass}
                      />
                    </div>
                  )}

                  {isYoutube && (
                    <div>
                      <label htmlFor="videoUrl" className={labelClass}>
                        YouTube Video URL{" "}
                        <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="url"
                        id="videoUrl"
                        name="videoUrl"
                        required
                        defaultValue={
                          mode === "edit" ? (task?.videoUrl ?? "") : ""
                        }
                        placeholder="https://youtube.com/watch?v=..."
                        className={inputClass}
                      />
                    </div>
                  )}

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
                      {mode === "edit" &&
                        task?.socialPostId &&
                        !selectedPost && (
                          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs font-bold text-amber-700">
                            Previously linked post will be kept unless you
                            select a new one.
                          </div>
                        )}
                    </div>
                  )}

                  {isSocialPlatform && !isYoutube && (
                    <div>
                      <label
                        htmlFor="commentInstruction"
                        className={labelClass}
                      >
                        Comment Instruction
                      </label>
                      <textarea
                        id="commentInstruction"
                        name="commentInstruction"
                        rows={2}
                        defaultValue={
                          mode === "edit"
                            ? (task?.commentInstruction ?? "")
                            : ""
                        }
                        placeholder='Tell users what to write — e.g. "Comment LOVE2025 below this post"'
                        className={`${inputClass} resize-none`}
                      />
                      <p className="text-[10px] text-zinc-400 font-medium mt-1.5">
                        Users will see this instruction when they pick up the
                        task. They must paste their unique comment code after
                        the phrase you specify.
                      </p>
                    </div>
                  )}

                  {isYtWatch && (
                    <div className="rounded-2xl border border-red-200 bg-red-50/60 p-5 space-y-3">
                      <div className="flex items-center gap-2">
                        <Video className="w-4 h-4 text-red-600" />
                        <label
                          htmlFor="watchDuration"
                          className="block text-[10px] font-black uppercase tracking-widest text-red-600"
                        >
                          Required Watch Duration
                        </label>
                      </div>
                      <p className="text-[11px] text-red-400/80 mt-0.5 font-medium">
                        Users must watch the video for this many seconds to earn
                        points.
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
                          <span className="text-sm font-bold text-red-500">
                            seconds
                          </span>
                        </div>
                        <div className="flex gap-1.5">
                          {[30, 60, 120, 300].map((s) => (
                            <button
                              key={s}
                              type="button"
                              onClick={() => {
                                const input = document.getElementById(
                                  "watchDuration",
                                ) as HTMLInputElement;
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

                  {/* ── Reward Points ── */}
                  <div>
                    <label htmlFor="points" className={labelClass}>
                      Reward Points <span className="text-red-400">*</span>
                    </label>
                    <div className="flex items-center gap-3 flex-wrap">
                      <input
                        type="number"
                        id="points"
                        name="points"
                        min={1}
                        required
                        value={rewardPoints}
                        onChange={(e) => {
                          const raw = e.target.value.replace(/^0+(?=\d)/, "");
                          setRewardPoints(raw === "" ? "" : Number(raw));
                        }}
                        className="w-32 px-4 py-2.5 bg-zinc-50 border border-black/5 rounded-2xl text-sm font-black text-black focus:outline-none focus:border-[#FACC15] transition-all"
                      />
                      <div className="flex gap-1.5">
                        {[5, 10, 20, 50].map((n) => (
                          <button
                            key={n}
                            type="button"
                            onClick={() => setRewardPoints(n)}
                            className={`text-[10px] font-black px-3 py-1.5 rounded-xl border transition-all ${
                              rewardPoints === n
                                ? "bg-[#FACC15] border-[#FACC15] text-black"
                                : "bg-white border-black/10 text-zinc-500 hover:border-[#FACC15]"
                            }`}
                          >
                            {n} pts
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* ── Auto Difficulty ── */}
                  <div>
                    <label className={labelClass}>Difficulty</label>
                    <input
                      type="hidden"
                      name="difficulty"
                      value={autoDifficulty}
                    />
                    <div className="flex gap-2">
                      {(["easy", "medium", "hard"] as const).map((d) => (
                        <div
                          key={d}
                          className={`flex-1 text-center py-2 rounded-2xl text-[10px] font-black uppercase tracking-wider border-2 transition-all ${
                            autoDifficulty === d
                              ? d === "easy"
                                ? "border-emerald-400 bg-emerald-50 text-emerald-700"
                                : d === "medium"
                                  ? "border-orange-400 bg-orange-50 text-orange-700"
                                  : "border-red-400 bg-red-50 text-red-700"
                              : "border-black/5 bg-zinc-50 text-zinc-300"
                          }`}
                        >
                          {d}
                        </div>
                      ))}
                    </div>
                    <p className="text-[10px] text-zinc-400 font-medium mt-1.5">
                      Auto-set from reward points — ≤10 pts: Easy · ≤25 pts:
                      Medium · &gt;25 pts: Hard
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* SECTION: Rules & Expirations — only Flash Task, no Share toggle here */}
            <div className={sectionClass}>
              <div className={sectionHeaderClass}>
                <Clock className="w-4 h-4 text-[#FACC15]" />
                <span className="text-[11px] font-black uppercase tracking-widest text-black">
                  Rules & Expirations
                </span>
              </div>

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
                    <div
                      className={`p-2 rounded-lg ${isFlash ? "bg-[#FACC15] text-black" : "bg-zinc-200 text-zinc-500"}`}
                    >
                      <Zap className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-black uppercase tracking-wider text-black">
                      Flash Task
                    </span>
                  </div>
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                      isFlash
                        ? "border-[#FACC15] bg-[#FACC15]"
                        : "border-zinc-300 bg-white"
                    }`}
                  >
                    {isFlash && <CheckCircle2 className="w-3 h-3 text-black" />}
                  </div>
                </div>
                <p className="text-[10px] text-zinc-400 font-medium">
                  Time-limited task with countdown
                </p>
                <input
                  type="checkbox"
                  name="isFlash"
                  checked={isFlash}
                  readOnly
                  className="hidden"
                />
              </div>

              <AnimatePresence>
                {isFlash && (
                  <motion.div
                    key="expiresAt"
                    initial={{ opacity: 0, height: 0, marginTop: 0 }}
                    animate={{ opacity: 1, height: "auto", marginTop: 16 }}
                    exit={{ opacity: 0, height: 0, marginTop: 0 }}
                    transition={{ duration: 0.25, ease: "easeOut" }}
                    style={{ overflow: "hidden" }}
                  >
                    <label htmlFor="expiresAt" className={labelClass}>
                      Expires At
                    </label>
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
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* SECTION: Task Type — Daily Refresh or Permanent */}
            <div className={sectionClass}>
              <div className={sectionHeaderClass}>
                <CheckCircle2 className="w-4 h-4 text-[#FACC15]" />
                <span className="text-[11px] font-black uppercase tracking-widest text-black">
                  Task Type <span className="text-red-400">*</span>
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Permanent */}
                <div
                  onClick={() => setIsRecurring(false)}
                  className={`group cursor-pointer p-4 rounded-2xl border-2 transition-all ${
                    !isRecurring
                      ? "border-[#FACC15] bg-[#FACC15]/5 shadow-inner"
                      : "border-black/5 bg-zinc-50 hover:border-black/10"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-2 rounded-lg ${!isRecurring ? "bg-[#FACC15] text-black" : "bg-zinc-200 text-zinc-500"}`}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-black uppercase tracking-wider text-black">
                        Permanent
                      </span>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                        !isRecurring
                          ? "border-[#FACC15] bg-[#FACC15]"
                          : "border-zinc-300 bg-white"
                      }`}
                    >
                      {!isRecurring && (
                        <CheckCircle2 className="w-3 h-3 text-black" />
                      )}
                    </div>
                  </div>
                  <p className="text-[10px] text-zinc-400 font-medium">
                    Users can complete this task only once. After completion it
                    remains permanently completed and cannot be repeated.
                  </p>
                </div>

                {/* Daily Refresh */}
                <div
                  onClick={() => setIsRecurring(true)}
                  className={`group cursor-pointer p-4 rounded-2xl border-2 transition-all ${
                    isRecurring
                      ? "border-emerald-400 bg-emerald-50/60 shadow-inner"
                      : "border-black/5 bg-zinc-50 hover:border-black/10"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-2 rounded-lg ${isRecurring ? "bg-emerald-500 text-white" : "bg-zinc-200 text-zinc-500"}`}
                      >
                        <Clock className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-black uppercase tracking-wider text-black">
                        Daily Refresh
                      </span>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                        isRecurring
                          ? "border-emerald-500 bg-emerald-500"
                          : "border-zinc-300 bg-white"
                      }`}
                    >
                      {isRecurring && (
                        <CheckCircle2 className="w-3 h-3 text-white" />
                      )}
                    </div>
                  </div>
                  <p className="text-[10px] text-zinc-400 font-medium">
                    Users can complete this task once per day. The task
                    automatically resets at midnight and becomes available again
                    the next day. All completion history is retained for
                    analytics.
                  </p>
                </div>
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
                className="px-6 py-2.5 text-xs font-black uppercase tracking-wider text-black bg-[#FACC15] hover:bg-black hover:text-[#FACC15] rounded-2xl transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                {isSaving
                  ? "Saving..."
                  : mode === "edit"
                    ? "Save Changes"
                    : "Create Task"}
              </button>
            </div>
          </motion.div>
        </AnimatePresence>
      </form>
    </ModalShell>
  );
}
