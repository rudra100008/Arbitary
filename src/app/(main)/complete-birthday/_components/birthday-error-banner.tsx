"use client";

interface BirthdayErrorBannerProps {
  message: string;
}

/**
 * Inline error banner shown above the birthday form when submission fails.
 */
export default function BirthdayErrorBanner({
  message,
}: BirthdayErrorBannerProps) {
  return (
    <div
      className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-semibold
                    text-red-600 bg-red-50 border border-red-100 mb-5"
    >
      <svg className="w-4 h-4 shrink-0" viewBox="0 0 20 20" fill="currentColor">
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
        />
      </svg>
      <span className="flex-1">{message}</span>
    </div>
  );
}
