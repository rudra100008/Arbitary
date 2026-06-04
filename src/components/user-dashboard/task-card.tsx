"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { YoutubeModal } from "./youtube-modal";
import { FacebookModal } from "./facebook-modal";
import { SubscribeModal } from "./subscribe-modal";
import { FlashCountdown } from "./flash-countdown";
import { ShareTaskCard } from "./share-task-card";

type TaskCardProps = {
  task: any;
  index: number;
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

const gradients = [
  "from-indigo-400 via-purple-400 to-purple-500",
  "from-purple-400 via-violet-400 to-purple-500",
  "from-teal-400 via-cyan-400 to-teal-500",
  "from-blue-400 via-indigo-400 to-blue-500",
  "from-pink-400 via-rose-400 to-pink-500",
];

export function TaskCard({
  task,
  index,
  expandedTasks,
  onToggleExpand,
  onPickup,
  onCancel,
  onComplete,
  onClaimDailyLogin,
  onClaimProfile,
  onClaimReferral,
  pickupPending,
  pickupVariable,
  cancelPending,
  cancelVariable,
}: TaskCardProps) {
  const gradient = gradients[index % gradients.length];
  const [proofUrl, setProofUrl] = useState("");
  const [isYoutubeModalOpen, setIsYoutubeModalOpen] = useState(false);
  const [isFacebookModalOpen, setIsFacebookModalOpen] = useState(false);
  const [isSubscribeModalOpen, setIsSubscribeModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const queryClient = useQueryClient();

  const getSystemClaimHandler = () => {
    const title = (task.title || "").toLowerCase();
    if (title.includes("daily") || title.includes("login"))
      return onClaimDailyLogin;
    if (title.includes("profile") || title.includes("complete profile"))
      return onClaimProfile;
    if (title.includes("referral")) return onClaimReferral;
    return null;
  };

  const requiredSeconds: number = task.watchDuration ?? 30;

  const youtubeCompleteMutation = useMutation({
    mutationFn: async ({
      taskId,
      watchedSeconds,
      sessionId,
    }: {
      taskId: number;
      watchedSeconds: number;
      sessionId?: number;
    }) => {
      const res = await fetch("/api/user/tasks/youtube-complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId, watchedSeconds, sessionId }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Failed to complete YouTube task");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("YouTube task completed and points awarded!");
      setIsYoutubeModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["user-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["user-points"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleSubmitProof = () => {
    if (!proofUrl.trim()) {
      alert("Please paste your proof URL (e.g. comment link)");
      return;
    }
    onComplete(task.id, proofUrl.trim());
    setProofUrl("");
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleScreenshotSubmit = async () => {
    if (!selectedFile) {
      alert("Please select a screenshot to upload");
      return;
    }
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Upload failed");
      }
      const data = await res.json();
      onComplete(task.id, data.url, data.url);
      setSelectedFile(null);
      setPreviewUrl("");
    } catch (err: any) {
      alert(err.message || "Failed to upload screenshot");
    } finally {
      setIsUploading(false);
    }
  };

  // Human-readable duration label shown on the Watch button
  const durationLabel =
    requiredSeconds >= 60
      ? `${Math.round(requiredSeconds / 60)}m`
      : `${requiredSeconds}s`;

  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.99 }}
      transition={{ type: "spring", stiffness: 400, damping: 20 }}
      className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${gradient} p-5 group cursor-pointer transition-all duration-300 ease-out hover:shadow-xl hover:shadow-purple-200/50`}
    >
      <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl" />
      <div className="absolute -right-6 -top-6 w-28 h-28 rounded-full bg-white/10 transition-transform duration-500 group-hover:scale-125" />
      <div className="absolute -right-2 -bottom-8 w-20 h-20 rounded-full bg-white/5 transition-transform duration-500 group-hover:scale-110" />

      <div className="relative z-10 flex items-center justify-between">
        {/* Left: icon + text */}
        <div className="flex items-center gap-3.5">
          <div
            className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center shrink-0
                          transition-transform duration-300 group-hover:scale-110 group-hover:bg-white/30"
          >
            <CheckCircle2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-wide leading-tight">
              {task.title}
            </h3>
            <div className="mt-0.5">
              <p
                className={`text-xs text-white/70 leading-snug max-w-[280px]
                             ${!expandedTasks[task.id] && task.description?.length > 60 ? "line-clamp-2" : ""}`}
              >
                {task.description}
              </p>
              {task.description?.length > 60 && (
                <button
                  onClick={(e) => onToggleExpand(e, task.id)}
                  className="text-[10px] font-bold text-white/90 hover:text-white mt-1
                             underline decoration-white/30 hover:decoration-white/80 transition-colors"
                >
                  {expandedTasks[task.id] ? "See less" : "See more"}
                </button>
              )}
              {task.postUrl && (
                <div className="mt-2">
                  <a
                    href={task.postUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-bold text-blue-200 hover:text-white underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    ↗ Visit Post
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: badges + action */}
        <div className="flex flex-col items-end gap-1.5 shrink-0 ml-3">
          <div className="flex items-center gap-1.5 flex-wrap justify-end">
            {task.isFlash && task.expiresAt && (
              <FlashCountdown expiresAt={task.expiresAt} />
            )}
            {task.difficulty && task.difficulty !== "easy" && (
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  task.difficulty === "hard"
                    ? "bg-red-500/30 text-red-200"
                    : "bg-orange-400/30 text-orange-200"
                }`}
              >
                {task.difficulty.toUpperCase()}
              </span>
            )}
            <span className="text-xs font-bold text-white bg-white/20 backdrop-blur-sm px-2.5 py-1 rounded-full">
              ✦ {task.points} pts
            </span>
          </div>

          {task.isExpired ? (
            <span className="text-[10px] font-bold text-white bg-gray-500/30 backdrop-blur-sm px-2.5 py-1 rounded-full">
              EXPIRED
            </span>
          ) : task.platform === "system" ? (
            !task.userStatus ||
            task.userStatus.toLowerCase() === "in progress" ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const handler = getSystemClaimHandler();
                  if (handler) handler(task.id);
                }}
                className="text-xs font-bold text-black bg-[#FACC15] hover:bg-[#eab308]
                           px-3 py-1.5 rounded-full transition-all duration-200
                           hover:scale-105 hover:shadow-md active:scale-95"
              >
                Claim
              </button>
            ) : (
              <span
                className={`text-xs font-bold px-2.5 py-1 rounded-full backdrop-blur-sm
                  ${
                    task.userStatus.toLowerCase() === "verified"
                      ? "bg-green-400/30 text-white"
                      : task.userStatus.toLowerCase() === "rejected"
                        ? "bg-red-400/30 text-white"
                        : "bg-white/20 text-white"
                  }`}
              >
                {task.userStatus.toUpperCase()}
              </span>
            )
          ) : task.userStatus ? (
            <div className="flex flex-col items-end gap-1.5">
              <span
                className={`text-xs font-bold px-2.5 py-1 rounded-full backdrop-blur-sm
                                ${
                                  task.userStatus.toLowerCase() === "verified"
                                    ? "bg-green-400/30 text-white"
                                    : task.userStatus.toLowerCase() ===
                                        "pending verification"
                                      ? "bg-yellow-400/30 text-white"
                                      : task.userStatus.toLowerCase() ===
                                          "rejected"
                                        ? "bg-red-400/30 text-white"
                                        : "bg-white/20 text-white animate-pulse"
                                }`}
              >
                {task.userStatus.toUpperCase()}
              </span>

              {task.userStatus.toLowerCase() === "rejected" ? (
                <button
                  onClick={() => onPickup(task.id)}
                  disabled={pickupPending}
                  className="text-xs font-bold text-black bg-[#FACC15] hover:bg-[#eab308]
                             px-3 py-1.5 rounded-full transition-all duration-200
                             hover:scale-105 hover:shadow-md disabled:opacity-50
                             disabled:cursor-not-allowed active:scale-95"
                >
                  {pickupPending && pickupVariable === task.id
                    ? "..."
                    : "Re-claim →"}
                </button>
              ) : task.userStatus.toLowerCase() === "in progress" ? (
                <div className="flex flex-col gap-1.5 mt-1 w-full min-w-[200px]">
                  {task.isShare && task.shareLink ? (
                    <ShareTaskCard
                      task={task}
                      onCancel={onCancel}
                      cancelPending={cancelPending}
                      cancelVariable={cancelVariable}
                    />
                  ) : task.platform === "facebook" ? (
                    <div className="flex gap-1.5">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsFacebookModalOpen(true);
                        }}
                        className="text-xs font-bold text-white bg-blue-500/80 hover:bg-blue-500
                                         px-2.5 py-1 rounded-full backdrop-blur-sm transition-all duration-200
                                         hover:scale-105 flex-1"
                      >
                        f Verify with Facebook
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onCancel(task.id);
                        }}
                        disabled={cancelPending}
                        className="text-xs font-bold text-white bg-red-500/40 hover:bg-red-500/60
                                   px-2.5 py-1 rounded-full backdrop-blur-sm transition-all duration-200
                                   hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {cancelPending && cancelVariable === task.id
                          ? "..."
                          : "Cancel"}
                      </button>
                    </div>
                  ) : task.platform === "youtube" && task.taskType === "VIDEO_SUBSCRIBE" ? (
                    <div className="flex gap-1.5">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsSubscribeModalOpen(true);
                        }}
                        className="text-xs font-bold text-white bg-red-600/80 hover:bg-red-600
                                   px-2.5 py-1 rounded-full backdrop-blur-sm transition-all duration-200
                                   hover:scale-105 flex-1"
                      >
                        🔔 Subscribe
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onCancel(task.id);
                        }}
                        disabled={cancelPending}
                        className="text-xs font-bold text-white bg-red-500/40 hover:bg-red-500/60
                                   px-2.5 py-1 rounded-full backdrop-blur-sm transition-all duration-200
                                   hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {cancelPending && cancelVariable === task.id
                          ? "..."
                          : "Cancel"}
                      </button>
                    </div>
                  ) : task.platform === "youtube" ? (
                    <div className="flex gap-1.5">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsYoutubeModalOpen(true);
                        }}
                        className="text-xs font-bold text-white bg-red-600/80 hover:bg-red-600
                                         px-2.5 py-1 rounded-full backdrop-blur-sm transition-all duration-200
                                         hover:scale-105 flex-1"
                      >
                        ▶ Watch ({durationLabel})
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onCancel(task.id);
                        }}
                        disabled={cancelPending}
                        className="text-xs font-bold text-white bg-red-500/40 hover:bg-red-500/60
                                   px-2.5 py-1 rounded-full backdrop-blur-sm transition-all duration-200
                                   hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {cancelPending && cancelVariable === task.id
                          ? "..."
                          : "Cancel"}
                      </button>
                    </div>
                  ) : (task.taskType === "VIDEO_WATCH" || task.taskType === "video_watch") ? (
                    <div className="flex gap-1.5">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsYoutubeModalOpen(true);
                        }}
                        className="text-xs font-bold text-white bg-red-600/80 hover:bg-red-600
                                   px-2.5 py-1 rounded-full backdrop-blur-sm transition-all duration-200
                                   hover:scale-105 flex-1"
                      >
                        ▶ Watch ({durationLabel})
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onCancel(task.id);
                        }}
                        disabled={cancelPending}
                        className="text-xs font-bold text-white bg-red-500/40 hover:bg-red-500/60
                                   px-2.5 py-1 rounded-full backdrop-blur-sm transition-all duration-200
                                   hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {cancelPending && cancelVariable === task.id
                          ? "..."
                          : "Cancel"}
                      </button>
                    </div>
                  ) : task.taskType === "VIDEO_LIKE" ? (
                    <div className="flex flex-col gap-1.5">
                      {task.postUrl && (
                        <a
                          href={task.postUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-xs font-bold text-blue-200 hover:text-white bg-blue-500/30 hover:bg-blue-500/50
                                     px-2.5 py-1.5 rounded-full backdrop-blur-sm transition-all duration-200
                                     hover:scale-105 text-center"
                        >
                          ↗ Visit Link
                        </a>
                      )}
                      <input
                        type="text"
                        value={proofUrl}
                        onChange={(e) => setProofUrl(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        placeholder="Enter your social handle or profile URL..."
                        className="w-full text-xs px-3 py-1.5 rounded-lg bg-white/20 backdrop-blur-sm
                                   text-white placeholder-white/50 border border-white/20
                                   focus:outline-none focus:border-white/50 focus:bg-white/25
                                   transition-all duration-200"
                      />
                      <div className="flex gap-1.5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSubmitProof();
                          }}
                          className="text-xs font-bold text-white bg-emerald-500/50 hover:bg-emerald-500/70
                                          px-2.5 py-1 rounded-full backdrop-blur-sm transition-all duration-200
                                          hover:scale-105 flex-1"
                        >
                          Submit
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onCancel(task.id);
                          }}
                          disabled={cancelPending}
                          className="text-xs font-bold text-white bg-red-500/40 hover:bg-red-500/60
                                     px-2.5 py-1 rounded-full backdrop-blur-sm transition-all duration-200
                                     hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {cancelPending && cancelVariable === task.id
                            ? "..."
                            : "Cancel"}
                        </button>
                      </div>
                    </div>
                  ) : task.taskType === "SCREENSHOT_UPLOAD" ? (
                    <div className="flex flex-col gap-1.5">
                      <label
                        onClick={(e) => e.stopPropagation()}
                        className="flex flex-col items-center justify-center gap-1.5 px-3 py-2.5
                                   rounded-lg bg-white/10 backdrop-blur-sm border border-white/20 border-dashed
                                   cursor-pointer hover:bg-white/20 transition-all duration-200"
                      >
                        {previewUrl ? (
                          <img
                            src={previewUrl}
                            alt="Preview"
                            className="w-full max-h-32 object-contain rounded-lg"
                          />
                        ) : (
                          <div className="flex flex-col items-center gap-1">
                            <svg className="w-6 h-6 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span className="text-[10px] text-white/50 font-medium">
                              Tap to upload screenshot
                            </span>
                          </div>
                        )}
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          onChange={handleFileSelect}
                          className="hidden"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </label>
                      {previewUrl && (
                        <div className="flex gap-1.5">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleScreenshotSubmit();
                            }}
                            disabled={isUploading}
                            className="text-xs font-bold text-white bg-emerald-500/50 hover:bg-emerald-500/70
                                            px-2.5 py-1 rounded-full backdrop-blur-sm transition-all duration-200
                                            hover:scale-105 flex-1 disabled:opacity-50"
                          >
                            {isUploading ? "Uploading..." : "Submit Screenshot"}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onCancel(task.id);
                            }}
                            disabled={cancelPending}
                            className="text-xs font-bold text-white bg-red-500/40 hover:bg-red-500/60
                                       px-2.5 py-1 rounded-full backdrop-blur-sm transition-all duration-200
                                       hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {cancelPending && cancelVariable === task.id
                              ? "..."
                              : "Cancel"}
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <>
                      <input
                        type="url"
                        value={proofUrl}
                        onChange={(e) => setProofUrl(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        placeholder="Paste comment URL as proof..."
                        className="w-full text-xs px-3 py-1.5 rounded-lg bg-white/20 backdrop-blur-sm
                                   text-white placeholder-white/50 border border-white/20
                                   focus:outline-none focus:border-white/50 focus:bg-white/25
                                   transition-all duration-200"
                      />
                      <div className="flex gap-1.5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSubmitProof();
                          }}
                          className="text-xs font-bold text-white bg-emerald-500/50 hover:bg-emerald-500/70
                                          px-2.5 py-1 rounded-full backdrop-blur-sm transition-all duration-200
                                          hover:scale-105 flex-1"
                        >
                          Submit Proof
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onCancel(task.id);
                          }}
                          disabled={cancelPending}
                          className="text-xs font-bold text-white bg-red-500/40 hover:bg-red-500/60
                                     px-2.5 py-1 rounded-full backdrop-blur-sm transition-all duration-200
                                     hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {cancelPending && cancelVariable === task.id
                            ? "..."
                            : "Cancel"}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ) : null}
            </div>
          ) : (
            <button
              onClick={() => onPickup(task.id)}
              disabled={pickupPending}
              className="text-xs font-bold text-black bg-[#FACC15] hover:bg-[#eab308]
                         px-3 py-1.5 rounded-full transition-all duration-200
                         hover:scale-105 hover:shadow-md disabled:opacity-50
                         disabled:cursor-not-allowed active:scale-95"
            >
              {pickupPending && pickupVariable === task.id
                ? "..."
                : "Pick Up →"}
            </button>
          )}
        </div>
      </div>

      <YoutubeModal
        url={task.postUrl || ""}
        taskId={task.id}
        isOpen={isYoutubeModalOpen}
        onClose={() => setIsYoutubeModalOpen(false)}
        onComplete={(watchedSeconds, sessionId) =>
          youtubeCompleteMutation.mutate({ taskId: task.id, watchedSeconds, sessionId })
        }
        requiredSeconds={requiredSeconds}
      />

      <FacebookModal
        task={task}
        isOpen={isFacebookModalOpen}
        onClose={() => setIsFacebookModalOpen(false)}
        onComplete={() => {
          queryClient.invalidateQueries({ queryKey: ["user-tasks"] });
          queryClient.invalidateQueries({ queryKey: ["user-points"] });
          return;
        }}
      />

      <SubscribeModal
        task={task}
        isOpen={isSubscribeModalOpen}
        onClose={() => setIsSubscribeModalOpen(false)}
        onComplete={() => {
          queryClient.invalidateQueries({ queryKey: ["user-tasks"] });
          queryClient.invalidateQueries({ queryKey: ["user-points"] });
          return;
        }}
      />
    </motion.div>
  );
}
