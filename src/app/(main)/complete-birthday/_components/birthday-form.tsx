"use client";

import type { FormEvent } from "react";
import FormInput from "@/src/components/layout/form-input";
import BirthdayErrorBanner from "./birthday-error-banner";

interface BirthdayFormProps {
  error: string;
  isLoading: boolean;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
}

const CalendarIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <path d="M16 2v4M8 2v4M3 10h18" />
  </svg>
);

/**
 * White card containing the birthday form: explanatory copy, error state,
 * the date input, and the submit button.
 */
export default function BirthdayForm({
  error,
  isLoading,
  onSubmit,
}: BirthdayFormProps) {
  return (
    <div
      className="bg-white rounded-b-3xl border border-gray-100 border-t-0
                   shadow-xl shadow-black/5 px-8 pb-8 float-up-2"
    >
      <p className="text-xs text-gray-500 leading-relaxed mb-5 pt-1">
        We need your date of birth on file to keep your account eligible for all
        current and future promotions.
      </p>

      {error && <BirthdayErrorBanner message={error} />}

      <form onSubmit={onSubmit} className="space-y-4">
        <FormInput
          type="date"
          id="dateOfBirth"
          name="dateOfBirth"
          label="Date of birth"
          placeholder="YYYY-MM-DD"
          required
          icon={<CalendarIcon />}
        />

        <button
          type="submit"
          disabled={isLoading}
          className="relative w-full py-3 rounded-xl text-sm font-black uppercase
                     tracking-[0.15em] overflow-hidden group
                     bg-[#FACC15] text-black hover:bg-[#eab308]
                     transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]
                     shadow-sm hover:shadow-md hover:shadow-yellow-200/50
                     disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span className="relative">{isLoading ? "Saving…" : "Continue"}</span>
        </button>
      </form>
    </div>
  );
}
