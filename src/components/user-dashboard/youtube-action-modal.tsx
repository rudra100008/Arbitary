"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";

type ActionType = "like" | "comment";

type YouTubeActionModalProps = {
  task: any;
  action: ActionType;
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
};

export function YouTubeActionModal({
  task,
  action,
  isOpen,
  onClose,
  onComplete,
}: YouTubeActionModalProps) {
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState("");
  const [needsScreenshot, setNeedsScreenshot] = useState(false);
  const [needsGoogleLink, setNeedsGoogleLink] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const isLike = action === "like";
  const label = isLike ? "Like" : "Comment";
  const labelLower = label.toLowerCase();
  const headerGradient = isLike
    ? "from-emerald-500 via-emerald-600 to-emerald-700"
    : "from-blue-500 via-blue-600 to-blue-700";
  const headerLabelColor = isLike ? "text-emerald-200" : "text-blue-200";

  const handleOpenVideo = () => {
    if (task.postUrl) {
      window.open(task.postUrl, "_blank", "noopener,noreferrer");
    }
  };

  const handleVerify = async () => {
    setVerifying(true);
    setError("");
    setNeedsGoogleLink(false);
    try {
      const res = await fetch("/api/user/tasks/youtube-complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId: task.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401) {
          setNeedsGoogleLink(true);
          setError(data.error || "Link your YouTube account");
          setVerifying(false);
          return;
        }
        throw new Error(data.error || "Verification failed");
      }
      if (data.requiresScreenshot) {
        setNeedsScreenshot(true);
        setVerifying(false);
        return;
      }
      setVerified(true);
      setTimeout(() => {
        onComplete();
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setVerifying(false);
    }
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
      setError("Please select a screenshot to upload");
      return;
    }
    setIsUploading(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
      if (!uploadRes.ok) {
        const d = await uploadRes.json();
        throw new Error(d.error || "Upload failed");
      }
      const uploadData = await uploadRes.json();

      const proofRes = await fetch("/api/user/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId: task.id,
          status: "Pending Verification",
          proofUrl: uploadData.url,
          proofImageUrl: uploadData.url,
        }),
      });
      if (!proofRes.ok) {
        const d = await proofRes.json();
        throw new Error(d.error || "Failed to submit proof");
      }
      onComplete();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsUploading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-start md:items-center justify-center pt-[60px] md:pt-0">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md mx-4 max-h-[calc(100vh-80px)] md:max-h-none overflow-y-auto md:overflow-visible modal-in">
        <div className={`bg-gradient-to-br ${headerGradient} px-6 pt-6 pb-8`}>
          <div className="flex items-center justify-between mb-2">
            <span className={`text-[10px] font-black uppercase tracking-widest ${headerLabelColor}`}>
              YouTube {label}
            </span>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <h2 className="text-xl font-black text-white">{task?.title || ""}</h2>
          <p className="text-sm text-white/80 mt-1 line-clamp-2">
            {task?.description || ""}
          </p>
        </div>

        <div className="p-6">
          {verified ? (
            <div className="flex flex-col items-center gap-3 py-6">
              <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center">
                <svg className="w-7 h-7 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-lg font-black text-emerald-600">{label}ed!</p>
              <p className="text-sm text-gray-500">Points have been awarded.</p>
            </div>
          ) : needsGoogleLink ? (
            <div className="flex flex-col gap-4">
              <div className="p-3 bg-red-50 rounded-2xl border border-red-200">
                <p className="text-xs font-bold text-red-700">
                  Your YouTube account is not linked.
                </p>
                <p className="text-xs text-red-600 mt-1">
                  Link your Google account in profile settings. 
                </p>
              </div>
              <button
                onClick={onClose}
                className="w-full py-3 px-5 bg-gray-500 hover:bg-gray-600 text-white font-bold text-sm rounded-2xl transition-all hover:scale-[1.02] active:scale-[0.98] shadow-sm"
              >
                Close
              </button>
            </div>
          ) : needsScreenshot ? (
            <div className="flex flex-col gap-4">
              <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200">
                <p className="text-xs font-bold text-amber-700">
                  Automatic verification could not confirm your {labelLower}. Please upload a screenshot showing you have {isLike ? "liked" : "commented on"} this video.
                </p>
              </div>
              <label
                className="flex flex-col items-center justify-center gap-1.5 px-3 py-2.5
                           rounded-lg bg-white/10 backdrop-blur-sm border border-white/20 border-dashed
                           cursor-pointer hover:bg-white/20 transition-all duration-200"
              >
                {previewUrl ? (
                  <img src={previewUrl} alt="Preview" className="w-full max-h-32 object-contain rounded-lg" />
                ) : (
                  <div className="flex flex-col items-center gap-1">
                    <svg className="w-6 h-6 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="text-[10px] text-zinc-500 font-medium">Tap to upload screenshot</span>
                  </div>
                )}
                <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFileSelect} className="hidden" />
              </label>
              {error && (
                <div className="p-3 bg-red-50 rounded-2xl border border-red-200">
                  <p className="text-xs font-medium text-red-600">{error}</p>
                </div>
              )}
              {previewUrl && (
                <button
                  onClick={handleScreenshotSubmit}
                  disabled={isUploading}
                  className="w-full py-3 px-5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-300 text-white font-bold text-sm rounded-2xl transition-all hover:scale-[1.02] active:scale-[0.98] disabled:scale-100 disabled:cursor-not-allowed shadow-sm"
                >
                  {isUploading ? "Uploading..." : "Submit Screenshot"}
                </button>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-emerald-600 text-white text-xs font-black flex items-center justify-center shrink-0 mt-0.5">
                  1
                </div>
                <div>
                  <p className="font-bold text-gray-800 text-sm">Open the YouTube video</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Click the button below to open the video in a new tab.
                  </p>
                </div>
              </div>

              {task.postUrl && (
                <button
                  onClick={handleOpenVideo}
                  className="w-full py-2.5 px-4 bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs rounded-2xl border border-red-200 transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  Open YouTube Video
                </button>
              )}

              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-emerald-600 text-white text-xs font-black flex items-center justify-center shrink-0 mt-0.5">
                  2
                </div>
                <div>
                  <p className="font-bold text-gray-800 text-sm">{label} & Verify</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {isLike
                      ? "Click the like button on the video, then verify here."
                      : "Post your comment on the video, then verify here."}
                  </p>
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-50 rounded-2xl border border-red-200">
                  <p className="text-xs font-medium text-red-600">{error}</p>
                </div>
              )}

              <button
                onClick={handleVerify}
                disabled={verifying}
                className="w-full py-3 px-5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-300 text-white font-bold text-sm rounded-2xl transition-all hover:scale-[1.02] active:scale-[0.98] disabled:scale-100 disabled:cursor-not-allowed shadow-sm flex items-center justify-center gap-2"
              >
                {verifying ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                    Verify & Earn {typeof task?.points === "number" ? task.points : 0} pts
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
