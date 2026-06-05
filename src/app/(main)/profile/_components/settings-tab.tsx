"use client";

import SectionHeader from "./section-header";

interface SettingsTabProps {
  userEmail?: string | null;
  provider?: string | null;
  googleId?: string | null;
  facebookId?: string;
}

/**
 * Content for the "Settings" tab — connected accounts and account management.
 */
export default function SettingsTab({
  userEmail,
  provider,
  googleId,
  facebookId,
}: SettingsTabProps) {
  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        <SectionHeader label="Account" title="Settings" />

        <div className="px-6 pb-6">
          <p className="text-[10px] font-black uppercase tracking-[0.15em] text-gray-400 mb-3">
            Connected Accounts
          </p>
          <div className="flex flex-col gap-2">
            {/* Google */}
            <div
              className="flex items-center justify-between px-4 py-3
                            bg-gray-50 border border-gray-100 rounded-xl
                            transition-all duration-200 hover:bg-white hover:border-gray-200 hover:shadow-sm hover:scale-[1.01]"
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-lg bg-white border border-gray-200
                                flex items-center justify-center shadow-sm"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    Google
                  </p>
                  <p className="text-xs text-gray-400">
                    {googleId
                      ? userEmail
                      : "Not connected"}
                  </p>
                </div>
              </div>
              <span
                className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider
                                ${
                                  googleId
                                    ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                                    : "bg-gray-100 text-gray-400"
                                }`}
              >
                {googleId
                  ? "Connected"
                  : "Not linked"}
              </span>
            </div>

            {/* Facebook */}
            <div
              className="flex items-center justify-between px-4 py-3
                            bg-gray-50 border border-gray-100 rounded-xl
                            transition-all duration-200 hover:bg-white hover:border-gray-200 hover:shadow-sm hover:scale-[1.01]"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#1877F2] flex items-center justify-center shadow-sm">
                  <svg
                    className="w-4 h-4 text-white"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    Facebook
                  </p>
                  <p className="text-xs text-gray-400">
                    {facebookId
                      ? "Connected"
                      : "Not connected"}
                  </p>
                </div>
              </div>
 <span
    className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider
                    ${
                      facebookId
                        ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                        : "bg-gray-100 text-gray-400"
                    }`}
  >
    {facebookId ? "Connected" : "Not linked"}
  </span>            </div>

            {/* Placeholder for more providers */}
            <div
              className="flex items-center gap-3 px-4 py-3 border border-dashed
                            border-gray-200 rounded-xl text-gray-400"
            >
              <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
              </div>
              <p className="text-xs font-medium">
                More providers coming soon
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Account management */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6">
        <p className="text-[10px] font-black uppercase tracking-[0.15em] text-gray-400 mb-3">
          Account Management
        </p>
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl transition-all duration-200 hover:bg-white hover:border-gray-200 hover:shadow-sm hover:scale-[1.01]">
            <div>
              <p className="text-sm font-semibold text-gray-900">
                Password
              </p>
              <p className="text-xs text-gray-400">
                Change your account password
              </p>
            </div>
            <button
              className="text-xs font-bold text-gray-600 bg-white border border-gray-200
                               hover:bg-slate-900 hover:text-white hover:border-slate-900
                               px-3.5 py-1.5 rounded-lg transition-all duration-200
                               active:scale-95"
            >
              Change
            </button>
          </div>
          {/* Space for more settings */}
          <div className="flex items-center gap-3 px-4 py-3 border border-dashed border-gray-200 rounded-xl text-gray-400">
            <p className="text-xs font-medium">
              More settings coming soon
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
