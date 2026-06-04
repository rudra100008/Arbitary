"use client";

import { useState } from "react";
import { createPortal } from "react-dom";

type SubscribeModalProps = {
  task: any;
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
};

export function SubscribeModal({
  task,
  isOpen,
  onClose,
  onComplete,
}: SubscribeModalProps) {
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleOpenChannel = () => {
    if (task.postUrl) {
      window.open(task.postUrl, "_blank", "noopener,noreferrer");
    }
  };

  const handleVerify = async () => {
    setVerifying(true);
    setError("");
    try {
      const res = await fetch("/api/user/tasks/youtube-complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId: task.id, watchedSeconds: 0 }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Verification failed");
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

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md mx-4 overflow-hidden modal-in">
        <div className="bg-gradient-to-br from-red-500 via-red-600 to-red-700 px-6 pt-6 pb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-red-200">
              YouTube Subscribe
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
          <p className="text-sm text-red-200 mt-1 line-clamp-2">
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
              <p className="text-lg font-black text-emerald-600">Subscribed!</p>
              <p className="text-sm text-gray-500">Points have been awarded.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-red-600 text-white text-xs font-black flex items-center justify-center shrink-0 mt-0.5">
                  1
                </div>
                <div>
                  <p className="font-bold text-gray-800 text-sm">Open the YouTube channel</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Click the button below to open the channel in a new tab.
                  </p>
                </div>
              </div>

              {task.postUrl && (
                <button
                  onClick={handleOpenChannel}
                  className="w-full py-2.5 px-4 bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs rounded-2xl border border-red-200 transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  Open YouTube Channel
                </button>
              )}

              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-emerald-600 text-white text-xs font-black flex items-center justify-center shrink-0 mt-0.5">
                  2
                </div>
                <div>
                  <p className="font-bold text-gray-800 text-sm">Subscribe & Verify</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Click the subscriber button on the channel, then verify here.
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
