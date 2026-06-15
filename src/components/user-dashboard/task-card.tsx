"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { YoutubeModal } from "./youtube-modal";
import { FacebookModal } from "./facebook-modal";
import { InstagramModal } from "./instagram-modal";
import { SubscribeModal } from "./subscribe-modal";
import { YouTubeActionModal } from "./youtube-action-modal";
import { FlashCountdown } from "./flash-countdown";
import { useReward } from "@/src/components/rewards/reward-context";
import { UserTaskItem } from "@/src/services/task.service";
import { TaskActionButtons } from "@/src/components/tasks/TaskActionButtons";
import {
  useScreenshotUpload,
  type ImageAnalysis,
} from "@/src/hooks/useScreenshotUpload";

type TaskCardProps = {
  task: UserTaskItem;
  index: number;
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
  streak?: number;
};

// Left accent stripe color by difficulty
export const difficultyAccent: Record<string, string> = {
  easy: "bg-emerald-400",
  medium: "bg-orange-400",
  hard: "bg-red-500",
};

// Difficulty badge styles
export const difficultyBadge: Record<string, string> = {
  easy: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  medium: "bg-orange-50 text-orange-700 border border-orange-200",
  hard: "bg-red-50 text-red-700 border border-red-200",
};

// Platform icon background + color
export function PlatformIcon({
  taskType,
  platform,
}: {
  taskType?: string | null;
  platform?: string | null;
}) {
  const type = (platform ?? taskType ?? "").toLowerCase();

  if (type.includes("facebook") || type.includes("fb"))
    return (
      <div
        className="w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0"
        style={{ background: "#1877F2" }}
      >
        <svg className="w-5 h-5" fill="white" viewBox="0 0 24 24">
          <path d="M24 12.073C24 5.404 18.627 0 12 0S0 5.404 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.97h-1.513c-1.491 0-1.956.93-1.956 1.886v2.268h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z" />
        </svg>
      </div>
    );

  if (type.includes("instagram") || type.includes("ig"))
    return (
      <div
        className="w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0"
        style={{
          background:
            "linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)",
        }}
      >
        <svg className="w-5 h-5" fill="white" viewBox="0 0 24 24">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
        </svg>
      </div>
    );

  if (type.includes("youtube") || type.includes("yt") || type.includes("video"))
    return (
      <div
        className="w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0"
        style={{ background: "#FF0000" }}
      >
        <svg className="w-5 h-5" fill="white" viewBox="0 0 24 24">
          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
        </svg>
      </div>
    );

  if (type.includes("share") || type.includes("referral"))
    return (
      <div className="w-9 h-9 rounded-[10px] bg-emerald-50 flex items-center justify-center shrink-0">
        <svg
          className="w-5 h-5 text-emerald-600"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          viewBox="0 0 24 24"
        >
          <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
          <polyline points="16 6 12 2 8 6" />
          <line x1="12" x2="12" y1="2" y2="15" />
        </svg>
      </div>
    );

  if (
    type.includes("screenshot") ||
    type === "screenshot_upload" ||
    type === "manual"
  )
    return (
      <div
        className="w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0"
        style={{ background: "#6366f1" }}
      >
        <svg className="w-5 h-5" fill="white" viewBox="0 0 24 24">
          <path d="M4 5h13v7h2V5c0-1.103-.897-2-2-2H4c-1.103 0-2 .897-2 2v9c0 1.103.897 2 2 2h8v-2H4V5z" />
          <path d="M22 18h-3v-3h-2v3h-3v2h3v3h2v-3h3z" />
        </svg>
      </div>
    );

  if (type.includes("daily") || type.includes("login"))
    return (
      <div className="w-9 h-9 rounded-[10px] bg-amber-50 flex items-center justify-center shrink-0">
        <svg
          className="w-5 h-5 text-amber-500"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          viewBox="0 0 24 24"
        >
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
        </svg>
      </div>
    );

  // Default
  return (
    <div className="w-9 h-9 rounded-[10px] bg-slate-100 flex items-center justify-center shrink-0">
      <svg
        className="w-5 h-5 text-slate-400"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        viewBox="0 0 24 24"
      >
        <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    </div>
  );
}

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
  onYoutubeComplete,
  onModalComplete,
  streak = 0,
}: TaskCardProps) {
  const [isYoutubeModalOpen, setIsYoutubeModalOpen] = useState(false);
  const [isFacebookModalOpen, setIsFacebookModalOpen] = useState(false);
  const [isInstagramModalOpen, setIsInstagramModalOpen] = useState(false);
  const [fingerprint, setFingerprint] = useState<string | undefined>(undefined);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const prevStatusRef = useRef(task.userStatus);
  const cardRef = useRef<HTMLDivElement>(null);
  const [isSubscribeModalOpen, setIsSubscribeModalOpen] = useState(false);
  const [isYouTubeActionModalOpen, setIsYouTubeActionModalOpen] =
    useState(false);
  const [youtubeActionType, setYoutubeActionType] = useState<
    "like" | "comment"
  >("like");
  const { triggerReward } = useReward();
  const {
    previewUrl,
    isUploading,
    handleFileSelect,
    handleSubmit: handleScreenshotSubmit,
  } = useScreenshotUpload((url, imageAnalysis) =>
    onComplete(task.id, url, url, imageAnalysis),
  );

  useEffect(() => {
    async function loadFp() {
      try {
        const FingerprintJS = await import("@fingerprintjs/fingerprintjs");
        const fp = await FingerprintJS.load();
        const { visitorId } = await fp.get();
        setFingerprint(visitorId);
      } catch {
        /* fingerprint capture not available */
      }
    }
    loadFp();
  }, []);

  const currentStatus = task.userStatus?.toLowerCase();
  useEffect(() => {
    const prevStatus = prevStatusRef.current;
    if (!currentStatus) return;
    if (prevStatus === currentStatus) return;
    if (
      currentStatus === "verified" ||
      currentStatus === "pending verification"
    ) {
      const msg = currentStatus === "verified" ? "Verified!" : "Submitted!";
      setSuccessMsg(msg);
      setShowSuccess(true);
      if (currentStatus === "verified" && cardRef.current) {
        const rect = cardRef.current.getBoundingClientRect();
        triggerReward(
          rect.left + rect.width / 2,
          rect.top - 20,
          task.points || 0,
        );
      }
      setTimeout(() => setShowSuccess(false), 2000);
    }
    prevStatusRef.current = currentStatus;
  }, [currentStatus, task.points, triggerReward]);

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
  const completedStatuses = new Set([
    "verified",
    "completed",
    "cancelled",
    "pending verification",
  ]);
  const isFinalStatus =
    task.userStatus && completedStatuses.has(task.userStatus.toLowerCase());
  const difficulty = (task.difficulty ?? "easy").toLowerCase();
  const accentClass = difficultyAccent[difficulty] ?? difficultyAccent.easy;
  const badgeClass = difficultyBadge[difficulty] ?? difficultyBadge.easy;

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, delay: index * 0.06, ease: "easeOut" }}
      className={`relative bg-white border border-black/[0.07] rounded-[14px] overflow-hidden
                  transition-all duration-200
                  ${isFinalStatus ? "opacity-50 saturate-0" : "hover:border-black/[0.14] hover:shadow-sm cursor-pointer"}`}
    >
      {/* Left accent stripe */}
      <div
        className={`absolute left-0 top-0 bottom-0 w-[3px] ${accentClass}`}
      />

      {/* Success overlay */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-20 flex flex-col items-center justify-center rounded-[14px] bg-black/30 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 15 }}
              className="w-12 h-12 rounded-full bg-emerald-500 flex items-center justify-center"
            >
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={3}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </motion.div>
            <p className="text-white font-black text-sm mt-2">{successMsg}</p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="pl-4 pr-4 py-3.5 flex items-center gap-3">
        {/* Platform icon */}
        <PlatformIcon taskType={task.taskType} platform={task.platform} />

        {/* Task info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-0.5">
            <h3 className="text-[13px] font-semibold text-slate-900 leading-snug truncate">
              {task.title}
            </h3>
            {/* Flash countdown stays top-right as it's time-critical */}
            {task.isFlash && task.expiresAt && (
              <div className="shrink-0">
                <FlashCountdown expiresAt={task.expiresAt} />
              </div>
            )}
          </div>

          <p
            className={`text-[11px] text-slate-400 leading-snug ${!expandedTasks[task.id] ? "line-clamp-1" : ""}`}
          >
            {task.description}
          </p>

          {(task.description?.length ?? 0) > 70 && (
            <button
              onClick={(e) => onToggleExpand(e, task.id)}
              className="text-[10px] font-semibold text-slate-400 hover:text-slate-600 mt-0.5 transition-colors"
            >
              {expandedTasks[task.id] ? "See less" : "See more"}
            </button>
          )}

          {task.postUrl?.startsWith("https://") && (
            <a
              href={task.postUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] font-semibold text-blue-500 hover:text-blue-700 mt-0.5 block"
              onClick={(e) => e.stopPropagation()}
            >
              ↗ Visit Post
            </a>
          )}
        </div>

        {/* Right: points + action */}
        <div className="shrink-0 flex flex-col items-end gap-1.5">
          <span className="text-[11px] font-bold text-slate-500">
            +{task.points} pts
          </span>

          {/* Action button / status */}
          {task.isExpired ? (
            <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">
              Expired
            </span>
          ) : task.platform === "system" ? (
            !task.userStatus ||
            task.userStatus.toLowerCase() === "in progress" ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const handler = getSystemClaimHandler();
                  if (handler) {
                    triggerReward(e.clientX, e.clientY, task.points || 0);
                    handler(task.id);
                  }
                }}
                className="text-[11px] font-bold text-[#0f172a] bg-[#FACC15] hover:bg-[#eab308]
                           px-3 py-1.5 rounded-full transition-all duration-200 hover:scale-105 active:scale-95"
              >
                Claim
              </button>
            ) : (
              <span
                className={`text-[10px] font-bold px-2.5 py-1 rounded-full
                ${
                  task.userStatus.toLowerCase() === "verified"
                    ? "bg-emerald-100 text-emerald-700"
                    : task.userStatus.toLowerCase() === "rejected"
                      ? "bg-red-100 text-red-700"
                      : "bg-slate-100 text-slate-500"
                }`}
              >
                {task.userStatus}
              </span>
            )
          ) : task.userStatus ? (
            <div className="flex flex-col items-end gap-1.5">
              <div className="flex items-center gap-1.5 flex-wrap justify-end">
                {task.isShare && (
                  <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600">
                    Share
                  </span>
                )}
                {task.difficulty && (
                  <span
                    className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${badgeClass}`}
                  >
                    {task.difficulty}
                  </span>
                )}
                <span
                  className={`text-[10px] font-bold px-2.5 py-1 rounded-full
                  ${
                    task.userStatus.toLowerCase() === "verified"
                      ? "bg-emerald-100 text-emerald-700"
                      : task.userStatus.toLowerCase() === "pending verification"
                        ? "bg-amber-100 text-amber-700"
                        : task.userStatus.toLowerCase() === "rejected"
                          ? "bg-red-100 text-red-700"
                          : "bg-orange-100 text-orange-700 animate-pulse"
                  }`}
                >
                  {task.userStatus}
                </span>
              </div>

              {task.userStatus.toLowerCase() === "rejected" ? (
                <button
                  onClick={() => onPickup(task.id)}
                  disabled={pickupPending}
                  className="text-[11px] font-bold text-[#0f172a] bg-[#FACC15] hover:bg-[#eab308]
                             px-3 py-1.5 rounded-full transition-all duration-200
                             hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {pickupPending && pickupVariable === task.id
                    ? "..."
                    : "Re-claim →"}
                </button>
              ) : task.userStatus.toLowerCase() === "in progress" ? (
                <TaskActionButtons
                  task={task}
                  cancelPending={cancelPending}
                  cancelVariable={cancelVariable}
                  fingerprint={fingerprint}
                  previewUrl={previewUrl}
                  isUploading={isUploading}
                  onCancel={onCancel}
                  onComplete={onComplete}
                  onOpenFacebook={() => setIsFacebookModalOpen(true)}
                  onOpenInstagram={() => setIsInstagramModalOpen(true)}
                  onOpenSubscribe={() => setIsSubscribeModalOpen(true)}
                  onOpenYouTubeAction={(type) => {
                    setYoutubeActionType(type);
                    setIsYouTubeActionModalOpen(true);
                  }}
                  onOpenYoutube={() => setIsYoutubeModalOpen(true)}
                  onScreenshotFileSelect={handleFileSelect}
                  onScreenshotSubmit={handleScreenshotSubmit}
                />
              ) : null}
            </div>
          ) : (
            /* Pick Up button — magnetic lift */
            <div className="flex flex-col items-end gap-1.5">
              <div className="flex items-center gap-1.5 flex-wrap justify-end">
                {task.isShare && (
                  <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600">
                    Share
                  </span>
                )}
                {task.difficulty && (
                  <span
                    className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${badgeClass}`}
                  >
                    {task.difficulty}
                  </span>
                )}
              </div>
              <motion.button
                onClick={() => onPickup(task.id)}
                disabled={pickupPending}
                whileHover={
                  pickupPending
                    ? {}
                    : {
                        y: -3,
                        boxShadow: "0 8px 20px rgba(250, 204, 21, 0.45)",
                      }
                }
                whileTap={
                  pickupPending
                    ? {}
                    : { y: 0, boxShadow: "0 2px 6px rgba(250, 204, 21, 0.3)" }
                }
                transition={{ type: "spring", stiffness: 400, damping: 20 }}
                className="text-[11px] font-bold text-[#0f172a] bg-[#FACC15]
                           px-3 py-1.5 rounded-full
                           disabled:opacity-50 disabled:cursor-not-allowed
                           whitespace-nowrap"
              >
                {pickupPending && pickupVariable === task.id
                  ? "..."
                  : "Pick Up →"}
              </motion.button>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <YoutubeModal
        url={task.postUrl || ""}
        taskId={task.id}
        isOpen={isYoutubeModalOpen}
        onClose={() => setIsYoutubeModalOpen(false)}
        onComplete={(_watchedSeconds, sessionId) => {
          onYoutubeComplete({ taskId: task.id, sessionId, fingerprint });
        }}
        requiredSeconds={requiredSeconds}
      />
      <FacebookModal
        task={task}
        isOpen={isFacebookModalOpen}
        onClose={() => setIsFacebookModalOpen(false)}
        onComplete={() => {
          onModalComplete(task.id, task.taskType);
        }}
        fingerprint={fingerprint}
      />
      <InstagramModal
        task={task}
        isOpen={isInstagramModalOpen}
        onClose={() => setIsInstagramModalOpen(false)}
        onComplete={() => {
          onModalComplete(task.id, task.taskType);
        }}
        fingerprint={fingerprint}
      />
      <SubscribeModal
        task={task}
        isOpen={isSubscribeModalOpen}
        onClose={() => setIsSubscribeModalOpen(false)}
        onComplete={() => {
          onModalComplete(task.id, task.taskType);
        }}
      />
      <YouTubeActionModal
        task={task}
        action={youtubeActionType}
        isOpen={isYouTubeActionModalOpen}
        onClose={() => setIsYouTubeActionModalOpen(false)}
        onComplete={() => {
          onModalComplete(task.id, task.taskType);
        }}
      />
    </motion.div>
  );
}
