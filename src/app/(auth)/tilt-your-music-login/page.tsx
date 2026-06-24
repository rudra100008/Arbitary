"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import FormInput from "@/src/components/layout/form-input";

const MailIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <path d="M22 7l-10 7L2 7" />
  </svg>
);

const LockIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" />
    <path d="M7 11V7a5 5 0 0110 0v4" />
  </svg>
);

const EyeIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const EyeOffIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" />
    <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);

const MusicNote = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 18V5l12-2v13" />
    <circle cx="6" cy="18" r="3" />
    <circle cx="18" cy="16" r="3" />
  </svg>
);

const TildeLoginPage = () => {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    await new Promise((r) => setTimeout(r, 1200));

    setIsLoading(false);
    setSuccess(true);

    setTimeout(() => router.push("/"), 2000);
  };

  const passwordToggle = (
    <button
      type="button"
      aria-label={showPassword ? "Hide password" : "Show password"}
      onClick={() => setShowPassword((p) => !p)}
      className="text-gray-400 hover:text-gray-700 transition-colors cursor-pointer p-0.5
                 w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100"
    >
      {showPassword ? <EyeOffIcon /> : <EyeIcon />}
    </button>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900
                    flex items-center justify-center px-4 py-10 relative overflow-hidden
                    selection:bg-[#FACC15] selection:text-black">
      <style>{`
        @keyframes floatUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulseGlow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(250, 204, 21, 0.15); }
          50%      { box-shadow: 0 0 0 12px rgba(250, 204, 21, 0); }
        }
        .float-up   { animation: floatUp 0.5s cubic-bezier(0.23,1,0.32,1) forwards; }
        .float-up-2 { animation: floatUp 0.5s cubic-bezier(0.23,1,0.32,1) 0.07s forwards; opacity: 0; }
        .float-up-3 { animation: floatUp 0.5s cubic-bezier(0.23,1,0.32,1) 0.14s forwards; opacity: 0; }
      `}</style>

      {/* Decorative background circles */}
      <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-white/[0.02]" />
      <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-white/[0.02]" />

      <div className="relative z-10 w-full max-w-sm">
        {/* Card */}
        <div className="bg-white rounded-3xl shadow-2xl shadow-black/30 px-8 pt-10 pb-8 float-up
                        border border-white/10">
          {/* Logo + heading */}
          <div className="flex flex-col items-center text-center gap-4 mb-8">
            <div className="w-14 h-14 bg-[#FACC15] rounded-2xl flex items-center justify-center
                            shadow-lg shadow-yellow-400/25"
                 style={{ animation: "pulseGlow 2.5s ease-in-out infinite" }}>
              <span className="text-black"><MusicNote /></span>
            </div>
            <div>
              <h1 className="text-slate-900 text-2xl font-black tracking-[0.15em] uppercase">
                Tilt Your Music
              </h1>
              <p className="text-slate-400 text-xs font-semibold uppercase tracking-[0.25em] mt-1.5">
                Outlet portal
              </p>
            </div>
          </div>

          {success ? (
            <div className="flex flex-col items-center gap-4 py-6">
              <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-7 h-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </div>
              <p className="text-sm font-bold text-gray-700 text-center">
                Access coming soon
              </p>
              <p className="text-xs text-gray-400 text-center">
                Redirecting you back to the main site…
              </p>
            </div>
          ) : (
            <>
              {error && (
                <div className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm
                                text-red-600 bg-red-50 border border-red-100 mb-5">
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" clipRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" />
                  </svg>
                  <span className="flex-1 text-xs font-semibold">{error}</span>
                </div>
              )}

              <form method="post" onSubmit={handleSubmit} className="space-y-4">
                <FormInput
                  type="email"
                  id="email"
                  name="email"
                  label="Email"
                  placeholder="outlet@distributor.com"
                  required
                  icon={<MailIcon />}
                />

                <FormInput
                  type={showPassword ? "text" : "password"}
                  id="password"
                  name="password"
                  label="Password"
                  placeholder="Enter your password"
                  required
                  icon={<LockIcon />}
                  rightElement={passwordToggle}
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
                  <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full
                                  transition-transform duration-700 pointer-events-none
                                  bg-gradient-to-r from-transparent via-white/30 to-transparent" />
                  <span className="relative">
                    {isLoading ? "Signing in…" : "Sign in"}
                  </span>
                </button>

                <p className="text-center text-xs text-gray-400 pt-1">
                  Not an outlet?{" "}
                  <Link
                    href="/login"
                    className="text-gray-700 font-semibold hover:text-gray-900
                               hover:underline transition-colors"
                  >
                    Sign in to your account
                  </Link>
                </p>
              </form>
            </>
          )}
        </div>

        {/* Back link */}
        <div className="text-center mt-6 float-up-3">
          <Link
            href="/"
            className="group inline-flex items-center gap-1.5 text-[10px] font-bold
                       uppercase tracking-[0.2em] text-white/30 hover:text-white/70
                       transition-colors duration-200"
          >
            <span className="transition-transform duration-200 group-hover:-translate-x-1">←</span>
            Back to Arbitrary
          </Link>
        </div>
      </div>
    </div>
  );
};

export default TildeLoginPage;
