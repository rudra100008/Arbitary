"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { RejectSubmissionModal } from "./reject-submission-modal";
import Image from "next/image";

interface ExifFlags {
  make: string | null;
  model: string | null;
  dateTimeOriginal: string | null;
  software: string | null;
  noExif: boolean;
  editingToolDetected: boolean;
}

interface Submission {
  id: number;
  taskId: number;
  userId: number;
  userName: string;
  userEmail: string;
  taskTitle: string;
  taskType: string | null;
  taskPlatform: string | null;
  watchDuration: number | null;
  points: number;
  status: string;
  proofUrl: string | null;
  proofImageUrl: string | null;
  assignedAt: string;
  completedAt: string;
  /** pHash signals — populated after Tier-1 analysis */
  proofPhash: string | null;
  proofExifFlags: string | null;
}

function isCloudinaryUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      parsed.protocol === "https:" && parsed.hostname === "res.cloudinary.com"
    );
  } catch {
    return false;
  }
}

function sanitizeUrl(url: string | null): string {
  if (!url) return "";
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" ? url : "";
  } catch {
    return "";
  }
}

/** Renders the EXIF + duplicate badges inline under the proof image */
function ImageSignalBadges({ sub }: { sub: Submission }) {
  if (!sub.proofPhash && !sub.proofExifFlags) return null;

  let exif: ExifFlags | null = null;
  try {
    if (sub.proofExifFlags) exif = JSON.parse(sub.proofExifFlags);
  } catch {
    /* ignore */
  }

  const warnings: { label: string; detail: string; color: string }[] = [];

  if (exif?.noExif) {
    warnings.push({
      label: "⚠ No EXIF",
      detail:
        "Image has no camera metadata — may be AI-generated or manually stripped",
      color: "text-amber-700 bg-amber-50 border-amber-200",
    });
  }
  if (exif?.editingToolDetected) {
    warnings.push({
      label: "⚠ Edited",
      detail: `Editing software detected: ${exif.software ?? "unknown"}`,
      color: "text-red-700 bg-red-50 border-red-200",
    });
  }

  const infos: { label: string; detail: string }[] = [];
  if (exif && !exif.noExif) {
    if (exif.make || exif.model) {
      infos.push({
        label: "Device",
        detail: [exif.make, exif.model].filter(Boolean).join(" "),
      });
    }
    if (exif.dateTimeOriginal) {
      infos.push({
        label: "Captured",
        detail: new Date(exif.dateTimeOriginal).toLocaleString(),
      });
    }
  }

  if (warnings.length === 0 && infos.length === 0) return null;

  return (
    <div className="mt-2 space-y-1">
      {warnings.map((w) => (
        <div
          key={w.label}
          title={w.detail}
          className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase px-2 py-0.5 rounded border mr-1 cursor-help ${w.color}`}
        >
          {w.label}
        </div>
      ))}
      {infos.map((info) => (
        <div key={info.label} className="text-[10px] text-gray-400">
          <span className="font-semibold text-gray-500">{info.label}:</span>{" "}
          {info.detail}
        </div>
      ))}
    </div>
  );
}

function ProofDisplay({ sub }: { sub: Submission }) {
  const imageUrl =
    sub.proofImageUrl && isCloudinaryUrl(sub.proofImageUrl)
      ? sub.proofImageUrl
      : sub.proofUrl && isCloudinaryUrl(sub.proofUrl)
        ? sub.proofUrl
        : null;

  if (imageUrl) {
    return (
      <div className="mt-2">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
            Image Proof
          </span>
          <a
            href={imageUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2"
          >
            <div className="relative w-24 h-16">
              <Image
                src={imageUrl}
                alt="Proof screenshot"
                fill
                className="object-cover rounded-lg border border-gray-200 hover:border-blue-400 transition-colors"
              />
            </div>
            <span className="text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg border border-blue-200 transition-colors">
              View Full Size
            </span>
          </a>
        </div>
        <ImageSignalBadges sub={sub} />
      </div>
    );
  }

  if (sub.taskType === "VIDEO_WATCH") {
    return (
      <div className="flex items-center gap-2 mt-2">
        <span className="text-[10px] font-bold uppercase text-red-600 bg-red-50 px-2 py-1 rounded-lg border border-red-200">
          Watch Duration
        </span>
        <span className="text-xs font-medium text-gray-600">
          {sub.watchDuration ? `${sub.watchDuration}s` : "Auto-verified"}
        </span>
      </div>
    );
  }

  const safeUrl = sanitizeUrl(sub.proofUrl);
  if (!safeUrl) return null;

  return (
    <div className="inline-flex items-center gap-2 mt-2">
      <span className="text-[10px] font-bold uppercase text-orange-600 bg-orange-50 px-2 py-0.5 rounded border border-orange-200">
        URL Proof
      </span>
      <a
        href={safeUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg border border-blue-200 transition-colors"
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
            strokeWidth={2}
            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
          />
        </svg>
        View User Proof
      </a>
    </div>
  );
}

export default function UserSubmissions() {
  const queryClient = useQueryClient();
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [rejectTarget, setRejectTarget] = useState<Submission | null>(null);

  const { data: submissions = [], isLoading } = useQuery({
    queryKey: ["admin-submissions"],
    queryFn: async () => {
      const res = await fetch("/api/admin/tasks/verify");
      if (!res.ok) throw new Error("Failed to fetch submissions");
      return res.json() as Promise<Submission[]>;
    },
    refetchInterval: 15_000,
  });

  const { mutate: verifySubmission } = useMutation({
    mutationFn: async ({
      id,
      status,
      rejectionReason,
    }: {
      id: number;
      status: string;
      rejectionReason?: string;
    }) => {
      const res = await fetch("/api/admin/tasks/verify", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userTaskId: id,
          status,
          ...(rejectionReason ? { rejectionReason } : {}),
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Failed to update submission");
      }
      return res.json();
    },
    onMutate: async ({ id }) => {
      await queryClient.cancelQueries({ queryKey: ["admin-submissions"] });
      const previous = queryClient.getQueryData<Submission[]>([
        "admin-submissions",
      ]);
      queryClient.setQueryData<Submission[]>(
        ["admin-submissions"],
        (old) => old?.filter((s) => s.id !== id) ?? [],
      );
      return { previous };
    },
    onSuccess: () => {
      toast.success("Submission status updated!");
    },
    onError: (err: Error, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["admin-submissions"], context.previous);
      }
      toast.error(err.message || "Failed to update submission");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-submissions"] });
    },
  });

  const handleVerify = (id: number, status: string) => {
    setProcessingId(id);
    verifySubmission(
      { id, status },
      { onSettled: () => setProcessingId(null) },
    );
  };

  const handleConfirmReject = (reason: string) => {
    if (!rejectTarget) return;
    const id = rejectTarget.id;
    setProcessingId(id);
    verifySubmission(
      { id, status: "Rejected", rejectionReason: reason },
      {
        onSettled: () => setProcessingId(null),
        onSuccess: () => setRejectTarget(null),
      },
    );
  };

  if (isLoading) {
    return <div className="text-center py-10">Loading submissions...</div>;
  }

  return (
    <div className="bg-white rounded-3xl p-8 border border-black/5 shadow-sm">
      <h2 className="text-2xl font-black uppercase tracking-widest mb-6">
        Pending Submissions
      </h2>
      {submissions.length === 0 ? (
        <p className="text-zinc-500">No pending submissions to verify.</p>
      ) : (
        <div className="space-y-4">
          {submissions.map((sub) => {
            // Parse exif for row-level warning banner
            let hasWarning = false;
            try {
              if (sub.proofExifFlags) {
                const flags = JSON.parse(sub.proofExifFlags);
                hasWarning = flags.noExif || flags.editingToolDetected;
              }
            } catch {
              /* ignore */
            }

            return (
              <div
                key={sub.id}
                className={`flex justify-between items-center p-5 rounded-2xl border ${
                  hasWarning
                    ? "bg-red-50 border-red-200"
                    : "bg-gray-50 border-gray-100"
                }`}
              >
                <div className="min-w-0 flex-1">
                  <h3 className="font-bold text-lg">
                    {sub.taskTitle}{" "}
                    <span className="text-sm font-semibold text-blue-600 ml-2">
                      ({sub.points} pts)
                    </span>
                    {sub.taskType && (
                      <span className="text-[10px] font-bold uppercase text-zinc-400 bg-zinc-100 px-1.5 py-0.5 rounded ml-2 align-middle">
                        {sub.taskType}
                      </span>
                    )}
                    {hasWarning && (
                      <span className="text-[10px] font-bold uppercase text-red-600 bg-red-100 px-1.5 py-0.5 rounded ml-2 align-middle">
                        ⚠ Suspicious Image
                      </span>
                    )}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Submitted by:{" "}
                    <span className="font-medium text-gray-700">
                      {sub.userName} ({sub.userEmail})
                    </span>
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Picked up on:{" "}
                    {new Date(sub.assignedAt).toLocaleDateString()}
                  </p>
                  <ProofDisplay sub={sub} />
                </div>
                <div className="flex gap-2 ml-4 shrink-0">
                  <button
                    onClick={() => handleVerify(sub.id, "Verified")}
                    disabled={processingId === sub.id}
                    className="px-4 py-2 bg-green-500 text-white text-sm font-bold rounded-xl hover:bg-green-600 transition-colors disabled:opacity-50"
                  >
                    {processingId === sub.id ? "Processing..." : "Verify"}
                  </button>
                  <button
                    onClick={() => setRejectTarget(sub)}
                    disabled={processingId === sub.id}
                    className="px-4 py-2 bg-red-50 text-red-600 text-sm font-bold rounded-xl hover:bg-red-100 transition-colors disabled:opacity-50"
                  >
                    Reject
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <RejectSubmissionModal
        submission={rejectTarget}
        onClose={() => setRejectTarget(null)}
        onConfirm={handleConfirmReject}
        isSubmitting={processingId === rejectTarget?.id}
      />
    </div>
  );
}
