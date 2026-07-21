"use client";

import { useState, useEffect, useReducer } from "react";
import { signIn, useSession } from "next-auth/react";
import { createPortal } from "react-dom";
import { UserTaskItem } from "@/src/services/task.service";
import { usePlatformFlags } from "@/src/hooks/use-platform-flags";

type FacebookModalProps = {
  task: UserTaskItem;
  isOpen: boolean;
  onClose: () => void;
  onComplete: (taskId: number) => void;
  fingerprint?: string;
};

export function FacebookModal({
  task,
  isOpen,
  onClose,
  onComplete,
  fingerprint,
}: FacebookModalProps) {
  const { data: session } = useSession();
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [verifyError, setVerifyError] = useState("");

  type CodeState = { codeLoading: boolean; verificationCode: string; error: string };
  type CodeAction =
    | { type: "FETCH_START" }
    | { type: "FETCH_SUCCESS"; code: string }
    | { type: "FETCH_ERROR"; error: string }
    | { type: "CLEAR_ERROR" };
  const codeReducer = (_: CodeState, action: CodeAction): CodeState => {
    switch (action.type) {
      case "FETCH_START": return { codeLoading: true, verificationCode: "", error: "" };
      case "FETCH_SUCCESS": return { codeLoading: false, verificationCode: action.code, error: "" };
      case "FETCH_ERROR": return { codeLoading: false, verificationCode: "", error: action.error };
      case "CLEAR_ERROR": return { ..._, error: "" };
    }
  };
  const [codeState, codeDispatch] = useReducer(codeReducer, { codeLoading: false, verificationCode: "", error: "" });

  const isConnected = !!session?.user?.facebookId;
  const { flags } = usePlatformFlags();
  const isPlatformDisabled = !flags.facebook || !flags.facebookConnected;

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
    if (isOpen && isConnected && task.id && !isPlatformDisabled) {
      codeDispatch({ type: "FETCH_START" });
      fetch(`/api/user/tasks/facebook-complete?taskId=${task.id}`)
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
            codeDispatch({ type: "FETCH_SUCCESS", code: data.verificationCode });
          } else {
            throw new Error("No verification code received from server");
          }
        })
        .catch((err) => {
          console.error("[FacebookModal] Code fetch error:", err);
          codeDispatch({ type: "FETCH_ERROR", error: err.message });
        });
    }
  }, [isOpen, isConnected, task.id, isPlatformDisabled]);

  if (!isOpen) return null;

  const handleConnect = () => {
    if (isPlatformDisabled) return;
    if (task?.id) {
      sessionStorage.setItem("facebook_pending_task_id", String(task.id));
    }
    signIn("facebook", { callbackUrl: "/dashboard" });
  };

  const handleOpenPost = () => {
    if (task.postUrl) {
      window.open(task.postUrl, "_blank", "noopener,noreferrer");
    }
  };

  const copyCode = () => {
    if (codeState.verificationCode) {
      navigator.clipboard.writeText(codeState.verificationCode);
    }
  };

  const handleVerify = async () => {
    if (isPlatformDisabled) return;
    setVerifying(true);
    setVerifyError("");
    try {
      const res = await fetch("/api/user/tasks/facebook-complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId: task.id, fingerprint }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Verification failed");
      }
      setVerified(true);
      setTimeout(() => {
        onComplete(task.id);
        onClose();
      }, 1500);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setVerifyError(error.message);
    } finally {
      setVerifying(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-[52px] sm:pt-[56px] md:pt-[68px]">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md mx-3 sm:mx-4 mt-2 md:mt-4 max-h-[calc(100vh-64px)] sm:max-h-[calc(100vh-72px)] md:max-h-[calc(100vh-80px)] overflow-y-auto scrollbar-hide modal-in">
        {/* Header */}
        <div className="bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 px-4 pt-3 pb-5 sm:px-5 sm:pt-4 sm:pb-6 md:px-6 md:pt-5 md:pb-7 rounded-t-3xl">
          <div className="flex items-center justify-between mb-1 sm:mb-2">
            <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-blue-200">
              Facebook Task
            </span>
            <button
              onClick={onClose}
              className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-colors"
            >
              <svg
                className="w-3 h-3 sm:w-3.5 sm:h-3.5"
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
          <h2 className="text-base sm:text-lg md:text-xl font-black text-white">{task?.title || ""}</h2>
          <p className="text-blue-200 text-[11px] sm:text-xs md:text-sm mt-0.5 line-clamp-2">
            {task?.description || ""}
          </p>
        </div>

        {/* Body */}
        <div className="p-3 sm:p-4 md:p-5">
          {isPlatformDisabled ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
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
                    d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
                  />
                </svg>
              </div>
              <p className="font-bold text-gray-800">Temporarily unavailable</p>
              <p className="text-sm text-gray-500">
                {!flags.facebook
                  ? "Facebook tasks are currently disabled. Please check back later."
                  : "Facebook tasks are currently unavailable. Please check back later."}
              </p>
            </div>
          ) : verified ? (
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
          ) : !isConnected ? (
            <div className="flex flex-col items-center gap-4 py-4">
              <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center">
                <span className="text-2xl text-blue-600 font-black">f</span>
              </div>
              <div className="text-center">
                <p className="font-bold text-gray-800">Connect Facebook</p>
                <p className="text-sm text-gray-500 mt-1">
                  You need to connect your Facebook account to verify this task.
                </p>
              </div>
              <button
                onClick={handleConnect}
                className="w-full py-3 px-5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-2xl transition-all hover:scale-[1.02] active:scale-[0.98] shadow-sm"
              >
                Connect Facebook
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {/* Step 1: Open Post */}
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-blue-600 text-white text-xs sm:text-sm font-black flex items-center justify-center shrink-0 mt-0.5">
                  1
                </div>
                <div>
                  <p className="font-bold text-gray-800 text-xs sm:text-sm md:text-base">
                    Open the Facebook post
                  </p>
                  <p className="text-gray-500 text-[11px] sm:text-xs mt-0.5">
                    Click the button below to open the post in a new tab.
                  </p>
                </div>
              </div>

              {task.postUrl && (
                <button
                  onClick={handleOpenPost}
                  className="w-full py-2.5 px-4 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs rounded-2xl border border-blue-200 transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2"
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
                  Open Facebook Post
                </button>
              )}

              {/* Step 2: Comment with Code */}
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-blue-600 text-white text-xs sm:text-sm font-black flex items-center justify-center shrink-0 mt-0.5">
                  2
                </div>
                <div className="flex-1">
                  <p className="font-bold text-gray-800 text-xs sm:text-sm md:text-base">
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
                      or middle.
                    </p>
                  )}
                  <p className="text-[11px] text-amber-600 mt-1.5 font-medium">
                    ⚠️ Don&apos;t post the code by itself — comments with only a
                    code can get flagged as spam/bot activity.
                  </p>
                </div>
              </div>

              {codeState.verificationCode ? (
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-2.5 font-mono font-bold text-sm text-blue-700 tracking-wide select-all">
                    {typeof codeState.verificationCode === "string"
                      ? codeState.verificationCode
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
              ) : codeState.codeLoading ? (
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
                <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-emerald-600 text-white text-xs sm:text-sm font-black flex items-center justify-center shrink-0 mt-0.5">
                  3
                </div>
                <div>
                  <p className="font-bold text-gray-800 text-xs sm:text-sm md:text-base">Verify</p>
                  <p className="text-gray-500 text-[11px] sm:text-xs mt-0.5">
                    Click verify after you&apos;ve posted your comment with the
                    code.
                  </p>
                </div>
              </div>

              {verifyError && (
                <div className="p-3 bg-red-50 rounded-2xl border border-red-200">
                  <p className="text-xs font-medium text-red-600">{verifyError}</p>
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
