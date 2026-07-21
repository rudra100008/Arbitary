"use client";

import React, { useEffect, useReducer } from "react";
import { REJECTION_REASON_PRESETS } from "@/src/lib/constants/rejection-reasons";

type ModalState = { selected: string; customReason: string };
type ModalAction =
  | { type: "RESET" }
  | { type: "SET_SELECTED"; value: string }
  | { type: "SET_CUSTOM_REASON"; value: string };

function modalReducer(state: ModalState, action: ModalAction): ModalState {
  switch (action.type) {
    case "RESET":
      return { selected: "", customReason: "" };
    case "SET_SELECTED":
      return { ...state, selected: action.value };
    case "SET_CUSTOM_REASON":
      return { ...state, customReason: action.value };
  }
}

interface Submission {
  id: number;
  taskTitle: string;
  userName: string;
}

interface RejectSubmissionModalProps {
  submission: Submission | null;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  isSubmitting?: boolean;
}

const OTHER_VALUE = "__other__";

export function RejectSubmissionModal({
  submission,
  onClose,
  onConfirm,
  isSubmitting = false,
}: RejectSubmissionModalProps) {
  const [state, dispatch] = useReducer(modalReducer, { selected: "", customReason: "" });

  useEffect(() => {
    if (submission) {
      dispatch({ type: "RESET" });
    }
  }, [submission]);

  if (!submission) return null;

  const reason = state.selected === OTHER_VALUE ? state.customReason.trim() : state.selected;
  const canConfirm = reason.length > 0 && !isSubmitting;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6">
        <h3 className="text-lg font-black uppercase tracking-widest text-gray-800">
          Reject Submission
        </h3>
        <p className="text-sm text-gray-500 mt-1">
          {submission.taskTitle} — {submission.userName}
        </p>

        <div className="mt-4 space-y-2">
          {REJECTION_REASON_PRESETS.map((preset) => (
            <label
              key={preset}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border cursor-pointer transition-colors
                ${state.selected === preset ? "border-red-300 bg-red-50" : "border-gray-100 hover:bg-gray-50"}`}
            >
              <input
                type="radio"
                name="rejection-reason"
                value={preset}
                checked={state.selected === preset}
                onChange={() => dispatch({ type: "SET_SELECTED", value: preset })}
                className="accent-red-500"
              />
              <span className="text-sm font-medium text-gray-700">{preset}</span>
            </label>
          ))}

          <label
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border cursor-pointer transition-colors
              ${state.selected === OTHER_VALUE ? "border-red-300 bg-red-50" : "border-gray-100 hover:bg-gray-50"}`}
          >
            <input
              type="radio"
              name="rejection-reason"
              value={OTHER_VALUE}
                checked={state.selected === OTHER_VALUE}
                onChange={() => dispatch({ type: "SET_SELECTED", value: OTHER_VALUE })}
              className="accent-red-500"
            />
            <span className="text-sm font-medium text-gray-700">Other (custom reason)</span>
          </label>

          {state.selected === OTHER_VALUE && (
            <textarea
              value={state.customReason}
              onChange={(e) => dispatch({ type: "SET_CUSTOM_REASON", value: e.target.value })}
              placeholder="Describe the reason for rejection..."
              maxLength={500}
              rows={3}
              className="w-full mt-1 px-3 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-300 resize-none"
              autoFocus
            />
          )}
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-bold text-gray-600 rounded-xl hover:bg-gray-100 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(reason)}
            disabled={!canConfirm}
            className="px-4 py-2 bg-red-500 text-white text-sm font-bold rounded-xl hover:bg-red-600 transition-colors disabled:opacity-50"
          >
            {isSubmitting ? "Rejecting..." : "Confirm Rejection"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default RejectSubmissionModal;
