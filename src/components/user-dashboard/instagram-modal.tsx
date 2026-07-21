"use client";

import { useState, useEffect, useReducer } from "react";
import { useSession } from "next-auth/react";
import { createPortal } from "react-dom";
import { UserTaskItem } from "@/src/services/task.service";
import { Check, Copy, ExternalLink, Loader2, X } from "lucide-react";
import { usePlatformFlags } from "@/src/hooks/use-platform-flags";

type InstagramModalProps = {
  task: UserTaskItem;
  isOpen: boolean;
  onClose: () => void;
  onComplete: (taskId: number) => void;
  fingerprint?: string;
};

export function InstagramModal({
  task,
  isOpen,
  onClose,
  onComplete,
  fingerprint,
}: InstagramModalProps) {
  const { data: session } = useSession();
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  type IgState = {
    codeLoading: boolean;
    error: string;
    needsScreenshot: boolean;
    selectedFile: File | null;
    previewUrl: string;
    verificationCode: string;
  };
  type IgAction =
    | { type: "FETCH_START" }
    | { type: "FETCH_SUCCESS"; code: string }
    | { type: "FETCH_ERROR"; error: string }
    | { type: "CLEAR_ERROR" }
    | { type: "SET_NEEDS_SCREENSHOT"; value: boolean }
    | { type: "SET_FILE"; file: File | null; previewUrl: string };
  const igReducer = (state: IgState, action: IgAction): IgState => {
    switch (action.type) {
      case "FETCH_START":
        return { codeLoading: true, error: "", needsScreenshot: false, selectedFile: null, previewUrl: "", verificationCode: "" };
      case "FETCH_SUCCESS":
        return { ...state, codeLoading: false, verificationCode: action.code, error: "" };
      case "FETCH_ERROR":
        return { ...state, codeLoading: false, error: action.error };
      case "CLEAR_ERROR":
        return { ...state, error: "" };
      case "SET_NEEDS_SCREENSHOT":
        return { ...state, needsScreenshot: action.value };
      case "SET_FILE":
        return { ...state, selectedFile: action.file, previewUrl: action.previewUrl };
    }
  };
  const [igState, igDispatch] = useReducer(igReducer, {
    codeLoading: false,
    error: "",
    needsScreenshot: false,
    selectedFile: null,
    previewUrl: "",
    verificationCode: "",
  });

  const instagramUsername = session?.user?.instagramUsername;
  const { flags } = usePlatformFlags();
  const isPlatformDisabled = !flags.instagram;

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

  useEffect(() => {
    if (isOpen && task.id && !isPlatformDisabled) {
      igDispatch({ type: "FETCH_START" });
      fetch(`/api/user/tasks/instagram-complete?taskId=${task.id}`)
        .then(async (res) => {
          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(
              data.error || `Failed to fetch code (Status: ${res.status})`,
            );
          }
          return res.json();
        })
        .then((data) => {
          if (data.verificationCode) {
            igDispatch({ type: "FETCH_SUCCESS", code: data.verificationCode });
          } else {
            throw new Error("No verification code received from server");
          }
        })
        .catch((err) => {
          igDispatch({ type: "FETCH_ERROR", error: err.message });
        });
    }
  }, [isOpen, task.id, isPlatformDisabled]);

  if (!isOpen) return null;

  const handleOpenPost = () => {
    if (task.postUrl) {
      window.open(task.postUrl, "_blank", "noopener,noreferrer");
    }
  };

  const copyCode = () => {
    if (igState.verificationCode) {
      navigator.clipboard.writeText(igState.verificationCode);
    }
  };

  const handleVerify = async () => {
    if (isPlatformDisabled) return;
    setVerifying(true);
    igDispatch({ type: "CLEAR_ERROR" });
    try {
      const res = await fetch("/api/user/tasks/instagram-complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId: task.id, fingerprint }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Verification failed");
      }
      if (data.requiresScreenshot) {
        igDispatch({ type: "SET_NEEDS_SCREENSHOT", value: true });
        setVerifying(false);
        return;
      }
      setVerified(true);
      setTimeout(() => {
        onComplete(task.id);
        onClose();
      }, 1500);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      igDispatch({ type: "FETCH_ERROR", error: error.message });
    } finally {
      setVerifying(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      igDispatch({ type: "SET_FILE", file, previewUrl: URL.createObjectURL(file) });
    }
  };

  const handleScreenshotSubmit = async () => {
    if (!igState.selectedFile) {
      igDispatch({ type: "FETCH_ERROR", error: "Please select a screenshot to upload" });
      return;
    }
    setIsUploading(true);
    igDispatch({ type: "CLEAR_ERROR" });
    try {
      const formData = new FormData();
      formData.append("file", igState.selectedFile);
      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      if (!uploadRes.ok) {
        const d = await uploadRes.json();
        throw new Error(d.error || "Upload failed");
      }
      const uploadData = await uploadRes.json();

      if (uploadData.imageAnalysis?.isDuplicateImage) {
        igDispatch({ type: "FETCH_ERROR", error: "This image has already been submitted as proof. Please upload a different screenshot." });
        setIsUploading(false);
        return;
      }

      const proofRes = await fetch("/api/user/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId: task.id,
          status: "Pending Verification",
          proofUrl: uploadData.url,
          proofImageUrl: uploadData.url,
          proofPhash: uploadData.imageAnalysis?.phash ?? null,
          proofExifFlags: uploadData.imageAnalysis?.exifFlags
            ? JSON.stringify(uploadData.imageAnalysis.exifFlags)
            : null,
        }),
      });
      if (!proofRes.ok) {
        const d = await proofRes.json();
        throw new Error(d.error || "Failed to submit proof");
      }
      setTimeout(() => onComplete(task.id), 100);
      onClose();
    } catch (err) {
      igDispatch({ type: "FETCH_ERROR", error: err instanceof Error ? err.message : String(err) });
    } finally {
      setIsUploading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-[52px] sm:pt-[56px] md:pt-[68px]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm mx-3 sm:mx-4 mt-2 md:mt-4 max-h-[calc(100vh-64px)] sm:max-h-[calc(100vh-72px)] md:max-h-[calc(100vh-80px)] overflow-y-auto scrollbar-hide modal-in">
        {/* Header */}
        <div className="bg-gradient-to-br from-pink-500 via-purple-500 to-orange-400 px-4 pt-3 pb-5 sm:px-5 sm:pt-4 sm:pb-6 md:px-6 md:pt-5 md:pb-7 rounded-t-3xl">
          <div className="flex items-center justify-between mb-1 sm:mb-2">
            <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-white/80">
              Instagram Task
            </span>
            <button
              onClick={onClose}
              className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
            >
              <X className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white" />
            </button>
          </div>
          <h2 className="text-base sm:text-lg md:text-xl font-black text-white leading-tight">
            {task.title || "Instagram post"}
          </h2>
          <p className="text-white/70 text-[11px] sm:text-xs md:text-sm mt-0.5">
            Comment on this post
          </p>
        </div>

        {/* Body */}
        <div className="p-3 sm:p-4 md:p-5 space-y-3 sm:space-y-4">
          {/* Platform disabled banner (defense-in-depth for a stale cached task) */}
          {isPlatformDisabled && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 text-amber-700 text-xs sm:text-sm">
              Instagram tasks are currently disabled. Please check back later.
            </div>
          )}

          {/* Error */}
          {igState.error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2 text-red-600 text-xs sm:text-sm">
              {igState.error}
            </div>
          )}

          {/* Verified success */}
          {verified && (
            <div className="bg-green-50 border border-green-200 rounded-xl px-3 py-2 text-green-600 text-xs sm:text-sm flex items-center gap-2">
              <Check className="w-4 h-4 flex-shrink-0" />
              Task completed! Points earned.
            </div>
          )}

          {/* Linked account */}
          {instagramUsername && (
            <div className="flex items-center gap-2 bg-pink-50 border border-pink-100 rounded-2xl px-3 py-2 sm:px-4 sm:py-2.5">
              <div className="w-5 h-5 sm:w-6 sm:h-6 bg-gray-200 rounded flex items-center justify-center flex-shrink-0 text-[10px]">
                📷
              </div>
              <span className="text-pink-600 font-semibold text-xs sm:text-sm truncate">
                Linked account: @{instagramUsername}
              </span>
            </div>
          )}

          {/* Screenshot upload flow */}
          {igState.needsScreenshot ? (
            <div className="space-y-3">
              <p className="text-gray-700 text-xs sm:text-sm font-semibold">
                Please upload a screenshot of your comment as proof.
              </p>
              {igState.previewUrl && (
                <img
                  src={igState.previewUrl}
                  alt="Preview"
                  className="w-full rounded-xl object-cover max-h-40"
                />
              )}
              <label className="block w-full py-2.5 rounded-2xl border-2 border-dashed border-gray-300 text-center text-gray-500 text-xs sm:text-sm cursor-pointer hover:border-pink-300 hover:text-pink-500 transition-colors">
                {igState.selectedFile ? igState.selectedFile.name : "Tap to choose screenshot"}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileSelect}
                />
              </label>
              <button
                onClick={handleScreenshotSubmit}
                disabled={isUploading || !igState.selectedFile}
                className="w-full py-3 rounded-2xl bg-green-500 hover:bg-green-600 disabled:opacity-60 text-white font-black text-sm flex items-center justify-center gap-2 transition-colors"
              >
                {isUploading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                Submit for Review
              </button>
            </div>
          ) : (
            <>
              {/* Step 1 */}
              <div className="flex gap-2 sm:gap-3">
                <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-pink-500 text-white font-black text-xs sm:text-sm flex items-center justify-center flex-shrink-0 mt-0.5">
                  1
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900 text-xs sm:text-sm md:text-base leading-snug">
                    Open the Instagram post
                  </p>
                  <p className="text-gray-500 text-[11px] sm:text-xs mt-0.5 leading-relaxed">
                    Click the button below to open the post in a new tab.
                  </p>
                  <button
                    onClick={handleOpenPost}
                    className="mt-2 sm:mt-3 flex items-center justify-center gap-2 w-full py-2 sm:py-2.5 rounded-2xl border-2 border-pink-200 bg-pink-50 text-pink-600 font-bold text-xs sm:text-sm hover:bg-pink-100 transition-colors"
                  >
                    <ExternalLink className="w-3 h-3 sm:w-4 sm:h-4" />
                    Open Instagram Post
                  </button>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex gap-2 sm:gap-3">
                <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-pink-500 text-white font-black text-xs sm:text-sm flex items-center justify-center flex-shrink-0 mt-0.5">
                  2
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900 text-xs sm:text-sm md:text-base leading-snug">
                    Leave a real comment with your unique code
                  </p>
                  <p className="text-gray-500 text-[11px] sm:text-xs mt-0.5 leading-relaxed">
                    Write a short comment about the post (a sentence or two),
                    then paste your code anywhere in it — at the start, end, or
                    middle. Make sure you&apos;re commenting as @
                    {instagramUsername}.
                  </p>
                  <p className="text-amber-600 text-[10px] sm:text-[11px] mt-1.5 leading-snug">
                    ⚠️ Don&apos;t post the code by itself — comments with only a
                    code can get flagged as spam/bot activity.
                  </p>

                  {/* Code box */}
                  <div className="mt-2 sm:mt-3 flex items-center gap-2">
                    {igState.codeLoading ? (
                      <div className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 sm:py-2.5 flex items-center gap-2">
                        <Loader2 className="w-3 h-3 animate-spin text-gray-400" />
                        <span className="text-gray-400 text-xs">
                          Loading code...
                        </span>
                      </div>
                    ) : (
                      <>
                        <div className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 sm:py-2.5">
                          <span className="text-pink-600 font-mono font-bold text-xs sm:text-sm">
                            {igState.verificationCode}
                          </span>
                        </div>
                        <button
                          onClick={copyCode}
                          className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors flex-shrink-0"
                        >
                          <Copy className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-600" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex gap-2 sm:gap-3">
                <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-green-500 text-white font-black text-xs sm:text-sm flex items-center justify-center flex-shrink-0 mt-0.5">
                  3
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900 text-xs sm:text-sm md:text-base leading-snug">
                    Verify
                  </p>
                  <p className="text-gray-500 text-[11px] sm:text-xs mt-0.5 leading-relaxed">
                    Click verify after you&apos;ve posted your comment with the
                    code.
                  </p>
                </div>
              </div>

              {/* Verify button */}
              <button
                onClick={handleVerify}
                disabled={verifying || igState.codeLoading || isPlatformDisabled}
                className="w-full py-3 sm:py-3.5 rounded-2xl bg-green-500 hover:bg-green-600 disabled:opacity-60 text-white font-black text-sm sm:text-base flex items-center justify-center gap-2 transition-colors"
              >
                {verifying ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                Verify &amp; Earn {task.points} pts
              </button>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
