"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface Submission {
  id: number;
  taskId: number;
  userId: number;
  userName: string;
  userEmail: string;
  taskTitle: string;
  points: number;
  status: string;
  proofUrl: string | null;
  assignedAt: string;
  completedAt: string;
}

export default function UserSubmissions() {
  const queryClient = useQueryClient();
  const [processingId, setProcessingId] = useState<number | null>(null);

  const { data: submissions = [], isLoading } = useQuery({
    queryKey: ["admin-submissions"],
    queryFn: async () => {
      const res = await fetch("/api/admin/tasks/verify");
      if (!res.ok) throw new Error("Failed to fetch submissions");
      return res.json() as Promise<Submission[]>;
    },
    refetchInterval: 15_000, // Poll every 15 seconds for new submissions
  });

  const { mutate: verifySubmission } = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const res = await fetch("/api/admin/tasks/verify", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userTaskId: id, status }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Failed to update submission");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Submission status updated!");
      queryClient.invalidateQueries({ queryKey: ["admin-submissions"] });
    },
    onError: (err: any) => {
      const error = err instanceof Error ? err : new Error(String(err));
      toast.error(error.message || "Failed to update submission");
    },
  });

  const handleVerify = (id: number, status: string) => {
    setProcessingId(id);
    verifySubmission(
      { id, status },
      {
        onSettled: () => setProcessingId(null),
      }
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
          {submissions.map((sub) => (
            <div
              key={sub.id}
              className="flex justify-between items-center bg-gray-50 p-5 rounded-2xl border border-gray-100"
            >
              <div>
                <h3 className="font-bold text-lg">
                  {sub.taskTitle}{" "}
                  <span className="text-sm font-semibold text-blue-600 ml-2">
                    ({sub.points} pts)
                  </span>
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  Submitted by:{" "}
                  <span className="font-medium text-gray-700">
                    {sub.userName} ({sub.userEmail})
                  </span>
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Picked up on: {new Date(sub.assignedAt).toLocaleDateString()}
                </p>
                {sub.proofUrl && (
                  <a
                    href={sub.proofUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 mt-2 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg border border-blue-200 transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    View User Proof
                  </a>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleVerify(sub.id, "Verified")}
                  disabled={processingId === sub.id}
                  className="px-4 py-2 bg-green-500 text-white text-sm font-bold rounded-xl hover:bg-green-600 transition-colors disabled:opacity-50"
                >
                  {processingId === sub.id ? "Processing..." : "Verify"}
                </button>
                <button
                  onClick={() => handleVerify(sub.id, "Rejected")}
                  disabled={processingId === sub.id}
                  className="px-4 py-2 bg-red-50 text-red-600 text-sm font-bold rounded-xl hover:bg-red-100 transition-colors disabled:opacity-50"
                >
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
