"use client";

import { ShareTaskCard } from "@/src/components/user-dashboard/share-task-card";
import { isYtLike, isYtSubscribe, isYtComment } from "@/src/lib/task-detector";
import { UserTaskItem } from "@/src/services/task.service";
import { usePlatformFlags } from "@/src/hooks/use-platform-flags";
import Image from "next/image";

type Props = {
  task: UserTaskItem;
  cancelPending: boolean;
  cancelVariable: number | undefined;
  fingerprint: string | undefined;
  previewUrl: string;
  isUploading: boolean;
  onCancel: (taskId: number) => void;
  onOpenFacebook: () => void;
  onOpenInstagram: () => void;
  onOpenSubscribe: () => void;
  onOpenYouTubeAction: (type: "like" | "comment") => void;
  onOpenYoutube: () => void;
  onScreenshotFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onScreenshotSubmit: () => void;
  onComplete: (
    taskId: number,
    proofUrl: string,
    proofImageUrl?: string,
  ) => void;
};

export function TaskActionButtons({
  task,
  cancelPending,
  cancelVariable,
  previewUrl,
  isUploading,
  onCancel,
  onOpenFacebook,
  onOpenInstagram,
  onOpenSubscribe,
  onOpenYouTubeAction,
  onOpenYoutube,
  onScreenshotFileSelect,
  onScreenshotSubmit,
  onComplete,
}: Props) {
  const { flags } = usePlatformFlags();
  const isFacebookAvailable = flags.facebook && flags.facebookConnected;

  return (
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
              if (isFacebookAvailable) onOpenFacebook();
            }}
            disabled={!isFacebookAvailable}
            className={`text-xs font-bold px-2.5 py-1 rounded-full backdrop-blur-sm transition-all duration-200
                        hover:scale-105 flex-1 ${
                          isFacebookAvailable
                            ? "text-white bg-blue-500/80 hover:bg-blue-500"
                            : "text-slate-400 bg-slate-100 cursor-not-allowed"
                        }`}
          >
            f {isFacebookAvailable ? "Verify with Facebook" : "Unavailable"}
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
            {cancelPending && cancelVariable === task.id ? "..." : "Cancel"}
          </button>
        </div>
      ) : task.platform === "instagram" ? (
        <div className="flex gap-1.5">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenInstagram();
            }}
            className="text-xs font-bold text-white bg-pink-500/80 hover:bg-pink-500
                             px-2.5 py-1 rounded-full backdrop-blur-sm transition-all duration-200
                             hover:scale-105 flex-1"
          >
            📷 Verify with Instagram
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
            {cancelPending && cancelVariable === task.id ? "..." : "Cancel"}
          </button>
        </div>
      ) : isYtSubscribe(task) ? (
        <div className="flex gap-1.5">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenSubscribe();
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
            {cancelPending && cancelVariable === task.id ? "..." : "Cancel"}
          </button>
        </div>
      ) : isYtLike(task) || isYtComment(task) ? (
        <div className="flex gap-1.5">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenYouTubeAction(isYtLike(task) ? "like" : "comment");
            }}
            className="text-xs font-bold text-white bg-emerald-500/50 hover:bg-emerald-500/70
                            px-2.5 py-1 rounded-full backdrop-blur-sm transition-all duration-200
                            hover:scale-105 flex-1"
          >
            {isYtLike(task) ? "👍 Like" : "💬 Comment"}
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
            {cancelPending && cancelVariable === task.id ? "..." : "Cancel"}
          </button>
        </div>
      ) : task.platform === "youtube" ||
        task.taskType === "VIDEO_WATCH" ||
        task.taskType === "video_watch" ? (
        <div className="flex gap-1.5">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenYoutube();
            }}
            className="text-xs font-bold text-white bg-red-600/80 hover:bg-red-600
                       px-2.5 py-1 rounded-full backdrop-blur-sm transition-all duration-200
                       hover:scale-105 flex-1"
          >
            ▶ Watch
            {task.watchDuration
              ? ` (${task.watchDuration >= 60 ? `${Math.round(task.watchDuration / 60)}m` : `${task.watchDuration}s`})`
              : ""}
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
            {cancelPending && cancelVariable === task.id ? "..." : "Cancel"}
          </button>
        </div>
      ) : task.taskType === "SCREENSHOT_UPLOAD" ||
        task.platform === "screenshot" ? (
        <div className="flex flex-col gap-1.5">
          <label
            onClick={(e) => e.stopPropagation()}
            className="flex flex-col items-center justify-center gap-1.5 px-3 py-2.5
                       rounded-lg bg-indigo-50 border border-indigo-200 border-dashed
                       cursor-pointer hover:bg-indigo-100 transition-all duration-200"
          >
            {previewUrl ? (
              <Image
                src={previewUrl}
                alt="Preview"
                width={200}
                height={200}
                unoptimized
                className="w-full max-h-32 object-contain rounded-lg"
              />
            ) : (
              <div className="flex flex-col items-center gap-1">
                <svg
                  className="w-6 h-6 text-indigo-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                <span className="text-[10px] text-indigo-500 font-bold">
                  Tap to upload screenshot
                </span>
              </div>
            )}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={onScreenshotFileSelect}
              className="hidden"
              onClick={(e) => e.stopPropagation()}
            />
          </label>
          {previewUrl && (
            <div className="flex gap-1.5">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onScreenshotSubmit();
                }}
                disabled={isUploading}
                className="text-xs font-bold text-white bg-emerald-500 hover:bg-emerald-600
                                px-2.5 py-1 rounded-full transition-all duration-200
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
                className="text-xs font-bold text-white bg-red-400 hover:bg-red-500
                           px-2.5 py-1 rounded-full transition-all duration-200
                           hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {cancelPending && cancelVariable === task.id ? "..." : "Cancel"}
              </button>
            </div>
          )}
        </div>
      ) : !task.platform &&
        task.taskType !== "SCREENSHOT_UPLOAD" &&
        task.taskType !== "social" &&
        task.taskType !== "video_watch" ? (
        <button
          onClick={() => onComplete(task.id, "")}
          className="flex items-center gap-1.5 text-xs font-bold text-white 
                     bg-emerald-500 hover:bg-emerald-600 px-3 py-1.5 
                     rounded-full transition-all duration-200 hover:scale-105"
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
              strokeWidth={2.5}
              d="M5 13l4 4L19 7"
            />
          </svg>
          Mark Complete
        </button>
      ) : (
        <div className="flex flex-col gap-1.5">
          <label
            onClick={(e) => e.stopPropagation()}
            className="flex flex-col items-center justify-center gap-1.5 px-3 py-2.5
                       rounded-lg bg-indigo-50 border border-indigo-200 border-dashed
                       cursor-pointer hover:bg-indigo-100 transition-all duration-200"
          >
            {previewUrl ? (
              <Image
                src={previewUrl}
                alt="Preview"
                width={200}
                height={200}
                unoptimized
                className="w-full max-h-32 object-contain rounded-lg"
              />
            ) : (
              <div className="flex flex-col items-center gap-1">
                <svg
                  className="w-6 h-6 text-indigo-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                <span className="text-[10px] text-indigo-500 font-bold">
                  Tap to upload screenshot
                </span>
              </div>
            )}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={onScreenshotFileSelect}
              className="hidden"
              onClick={(e) => e.stopPropagation()}
            />
          </label>
          {previewUrl && (
            <div className="flex gap-1.5">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onScreenshotSubmit();
                }}
                disabled={isUploading}
                className="text-xs font-bold text-white bg-emerald-500 hover:bg-emerald-600
                                px-2.5 py-1 rounded-full transition-all duration-200
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
                className="text-xs font-bold text-white bg-red-400 hover:bg-red-500
                           px-2.5 py-1 rounded-full transition-all duration-200
                           hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {cancelPending && cancelVariable === task.id ? "..." : "Cancel"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
