"use client";

import { useState, useEffect, useRef } from "react";
import { Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { UserTaskItem } from "@/src/services/task.service";

type Props = {
    task: UserTaskItem;
    onCancel: (taskId: number) => void;
    cancelPending: boolean;
    cancelVariable: number | undefined;
};

export function ShareTaskCard({ task, onCancel, cancelPending, cancelVariable }: Props) {
    const queryClient = useQueryClient();
    const mountedRef = useRef(false);
    const [copied, setCopied] = useState(false);
    const [clickCount, setClickCount] = useState(task.shareClickCount ?? 0);
    const [completed, setCompleted] = useState(task.sharePointsAwarded ?? false);

    const threshold = task.shareClickThreshold ?? 3;
    const shareLink = task.shareLink ?? "";
    const shareCode = shareLink.split("/r/").pop() ?? "";

    // Capture owner fingerprint on mount to prevent self-clicks
    useEffect(() => {
        if (mountedRef.current) return;
        mountedRef.current = true;
        if (!shareCode || completed) return;

        async function captureFingerprint() {
            try {
                const FingerprintJS = await import("@fingerprintjs/fingerprintjs");
                const fp = await FingerprintJS.load();
                const { visitorId } = await fp.get();
                await fetch("/api/share-task/set-owner-fingerprint", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ shareCode, fingerprint: visitorId }),
                });
            } catch { /* fingerprint capture failed, proceed without it */ }
        }

        captureFingerprint();
    }, [shareCode, completed]);

    useEffect(() => {
        if (completed || !shareCode) return;

        const eventSource = new EventSource(`/api/share-progress/${shareCode}`);

        eventSource.onmessage = (e) => {
            try {
                const data = JSON.parse(e.data);
                if (data.error) return;

                setClickCount(data.clickCount);

                if (data.completed) {
                    setCompleted(true);
                    eventSource.close();
                    queryClient.invalidateQueries({ queryKey: ["user-tasks"] });
                    queryClient.invalidateQueries({ queryKey: ["user-points"] });
                    toast.success("Share task completed! Points awarded 🎉");
                }
            } catch {
                // ignore parse errors
            }
        };

        eventSource.onerror = () => {
            eventSource.close();
        };

        return () => eventSource.close();
    }, [shareCode, completed]);

    const handleCopyLink = async () => {
        if (shareLink) {
            try {
                await navigator.clipboard.writeText(shareLink);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            } catch {
                const textarea = document.createElement("textarea");
                textarea.value = shareLink;
                document.body.appendChild(textarea);
                textarea.select();
                document.execCommand("copy");
                document.body.removeChild(textarea);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            }
        }
    };

    const progress = Math.min(clickCount / threshold, 1);
    const isComplete = completed || clickCount >= threshold;

    return (
        <div className="flex flex-col gap-2 w-full min-w-[200px]">
            <div className="flex items-center gap-2">
                <div className="flex-1 bg-white/10 rounded-full h-2 overflow-hidden">
                    <div
                        className={`h-full rounded-full transition-all duration-500 ${isComplete ? "bg-emerald-400" : "bg-[#FACC15]"}`}
                        style={{ width: `${progress * 100}%` }}
                    />
                </div>
                <span className="text-[10px] font-bold text-white/80 shrink-0">
                    {clickCount}/{threshold}
                </span>
            </div>
            {!isComplete ? (
                <div className="flex gap-1.5">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            handleCopyLink();
                        }}
                        className="text-xs font-bold text-black bg-[#FACC15] hover:bg-[#eab308]
                               px-2.5 py-1.5 rounded-full transition-all duration-200
                               hover:scale-105 flex-1 flex items-center justify-center gap-1"
                    >
                        {copied ? (
                            <><Check className="w-3 h-3" /> Copied!</>
                        ) : (
                            <><Copy className="w-3 h-3" /> Copy Link</>
                        )}
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
            ) : (
                <span className="text-[10px] font-bold text-emerald-300 bg-emerald-500/20 px-2.5 py-1 rounded-full text-center">
                    ✓ Complete — {clickCount} clicks
                </span>
            )}
        </div>
    );
}
