"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { createPortal } from "react-dom";
import { UserTaskItem } from "@/src/services/task.service";

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
  const [submittedForReview, setSubmittedForReview] = useState(false);
  const [error, setError] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [codeLoading, setCodeLoading] = useState(false);
  const [needsScreenshot, setNeedsScreenshot] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  const instagramUsername = session?.user?.instagramUsername;

  useEffect(() => {
    if (isOpen && task.id) {
      setCodeLoading(true);
      setError("");
      setNeedsScreenshot(false);
      setSelectedFile(null);
      setPreviewUrl("");
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
            setVerificationCode(data.verificationCode);
          } else {
            throw new Error("No verification code received from server");
          }
        })
        .catch((err) => {
          setError(err.message);
        })
        .finally(() => {
          setCodeLoading(false);
        });
    }
  }, [isOpen, task.id]);

  if (!isOpen) return null;

  const handleOpenPost = () => {
    if (task.postUrl) {
      window.open(task.postUrl, "_blank", "noopener,noreferrer");
    }
  };

  const copyCode = () => {
    if (verificationCode) {
      navigator.clipboard.writeText(verificationCode);
    }
  };

  const handleVerify = async () => {
    setVerifying(true);
    setError("");
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
        setNeedsScreenshot(true);
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
      setError(error.message);
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
        setError(
          "This image has already been submitted as proof. Please upload a different screenshot.",
        );
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
      setSubmittedForReview(true);
      setTimeout(() => onComplete(task.id), 100);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsUploading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md mx-4 overflow-hidden modal-in">
        {/* Header */}
        <div className="bg-gradient-to-br from-pink-500 via-purple-500 to-orange-400 px-6 pt-6 pb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-white/80">
              Instagram Task
            </span>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-colors"
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
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
          <h2 className="text-xl font-black text-white">{task?.title || ""}</h2>
          <p className="text-sm text-white/80 mt-1 line-clamp-2">
            {task?.description || ""}
          </p>
        </div>

        {/* Body */}
        <div className="p-6">
          {verified ? (
            <div className="flex flex-col items-center gap-3 py-6">
              <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center">
                <svg
                  className="w-7 h-7 text-emerald-600"
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
              </div>
              <p className="text-lg font-black text-emerald-600">Verified!</p>
              <p className="text-sm text-gray-500">Points have been awarded.</p>
            </div>
          ) : submittedForReview ? (
            <div className="flex flex-col items-center gap-3 py-6">
              <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center">
                <svg
                  className="w-7 h-7 text-amber-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <p className="text-lg font-black text-amber-600">
                Submitted for Review
              </p>
              <p className="text-sm text-gray-500">
                An admin will review your proof and award points.
              </p>
            </div>
          ) : !instagramUsername ? (
            <div className="flex flex-col items-center gap-4 py-4">
              <div className="w-14 h-14 rounded-full bg-pink-100 flex items-center justify-center">
                <span className="text-2xl text-pink-600 font-black">📷</span>
              </div>
              <div className="text-center">
                <p className="font-bold text-gray-800">
                  Link Instagram Account
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  You need to link your Instagram username in your profile
                  settings first.
                </p>
              </div>
              <a
                href="/profile"
                className="w-full py-3 px-5 bg-pink-600 hover:bg-pink-700 text-white font-bold text-sm rounded-2xl transition-all hover:scale-[1.02] active:scale-[0.98] shadow-sm text-center"
              >
                Go to Profile Settings
              </a>
            </div>
          ) : needsScreenshot ? (
            <div className="flex flex-col gap-4">
              <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200">
                <p className="text-xs font-bold text-amber-700">
                  Could not verify your comment automatically. Please upload a
                  screenshot showing your comment with the code on the Instagram
                  post.
                </p>
              </div>
              <label
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
                    <svg
                      className="w-6 h-6 text-zinc-400"
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
                    <span className="text-[10px] text-zinc-500 font-medium">
                      Tap to upload screenshot
                    </span>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileSelect}
                  className="hidden"
                />
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
              {/* Linked account info */}
              <div className="flex items-center gap-2 p-3 bg-pink-50 rounded-xl border border-pink-200">
                <span className="text-sm">📷</span>
                <p className="text-xs font-bold text-pink-700">
                  Linked account: @{instagramUsername}
                </p>
              </div>

              {/* Step 1: Open Post */}
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-pink-600 text-white text-xs font-black flex items-center justify-center shrink-0 mt-0.5">
                  1
                </div>
                <div>
                  <p className="font-bold text-gray-800 text-sm">
                    Open the Instagram post
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Click the button below to open the post in a new tab.
                  </p>
                </div>
              </div>

              {task.postUrl && (
                <button
                  onClick={handleOpenPost}
                  className="w-full py-2.5 px-4 bg-pink-50 hover:bg-pink-100 text-pink-700 font-bold text-xs rounded-2xl border border-pink-200 transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2"
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
                      strokeWidth={2}
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                    />
                  </svg>
                  Open Instagram Post
                </button>
              )}

              {/* Step 2: Comment with Code */}
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-pink-600 text-white text-xs font-black flex items-center justify-center shrink-0 mt-0.5">
                  2
                </div>
                <div className="flex-1">
                  <p className="font-bold text-gray-800 text-sm">
                    Leave a real comment with your unique code
                  </p>
                  {task.commentInstruction ? (
                    <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-2xl">
                      <p className="text-[10px] font-black uppercase tracking-wider text-blue-400 mb-1">
                        What to write
                      </p>
                      <p className="text-sm font-bold text-blue-800">
                        {task.commentInstruction}{" "}
                        <span className="font-mono text-blue-600">
                          [your unique code]
                        </span>
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500 mt-0.5">
                      Write a short comment about the post (a sentence or two),
                      then paste your code anywhere in it — at the start, end,
                      or middle. Make sure you&apos;re commenting as @
                      {instagramUsername}.
                    </p>
                  )}
                  <p className="text-[11px] text-amber-600 mt-1.5 font-medium">
                    ⚠️ Don&apos;t post the code by itself — comments with only a
                    code can get flagged as spam/bot activity.
                  </p>
                </div>
              </div>

              {verificationCode ? (
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-2.5 font-mono font-bold text-sm text-pink-700 tracking-wide select-all">
                    {typeof verificationCode === "string"
                      ? verificationCode
                      : ""}
                  </div>
                  <button
                    onClick={copyCode}
                    className="w-10 h-10 rounded-2xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors shrink-0"
                    title="Copy code"
                  >
                    <svg
                      className="w-4 h-4 text-gray-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                      />
                    </svg>
                  </button>
                </div>
              ) : codeLoading ? (
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-2.5 font-mono text-sm text-gray-400 italic animate-pulse">
                    Generating your unique code...
                  </div>
                </div>
              ) : (
                <div className="text-xs text-red-500 font-medium px-1">
                  Failed to load verification code. Please refresh and try
                  again.
                </div>
              )}

              {/* Step 3: Verify */}
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-emerald-600 text-white text-xs font-black flex items-center justify-center shrink-0 mt-0.5">
                  3
                </div>
                <div>
                  <p className="font-bold text-gray-800 text-sm">Verify</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Click verify after you&apos;ve posted your comment with the
                    code.
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
                    <svg
                      className="w-4 h-4"
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
                    Verify & Earn{" "}
                    {typeof task?.points === "number" ? task.points : 0} pts
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
