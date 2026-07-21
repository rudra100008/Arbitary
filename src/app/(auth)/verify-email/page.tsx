"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

const VerifyEmailPendingPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";
  const [isResending, setIsResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [error, setError] = useState("");
  const [mounted] = useState(true);

  const handleResend = async () => {
    if (!email) return;
    setIsResending(true);
    setError("");
    try {
      const res = await fetch("/api/auth/verify-email/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to resend");
        setIsResending(false);
        return;
      }
      setResent(true);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-10 relative overflow-hidden selection:bg-[#FACC15] selection:text-black">
      <style>{`
        @keyframes floatUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .float-up   { animation: floatUp 0.5s cubic-bezier(0.23,1,0.32,1) forwards; }
        .float-up-2 { animation: floatUp 0.5s cubic-bezier(0.23,1,0.32,1) 0.07s forwards; opacity: 0; }
        .float-up-3 { animation: floatUp 0.5s cubic-bezier(0.23,1,0.32,1) 0.14s forwards; opacity: 0; }
      `}</style>

      <div className="relative z-10 w-full max-w-sm">
        <div className={`relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-t-3xl px-8 pt-8 pb-10 ${mounted ? "float-up" : "opacity-0"}`}>
          <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-white/5" />
          <div className="absolute right-12 -bottom-6 w-24 h-24 rounded-full bg-white/5" />
          <div className="relative z-10 flex flex-col items-center text-center gap-3">
            <div className="w-12 h-12 bg-[#FACC15] rounded-2xl flex items-center justify-center shadow-lg shadow-yellow-400/20">
              <span className="text-black font-black text-xl">A</span>
            </div>
            <div>
              <h1 className="text-white text-2xl font-black tracking-[0.15em] uppercase">Arbitrary</h1>
              <p className="text-white/40 text-xs font-semibold uppercase tracking-[0.25em] mt-1">Verify your email</p>
            </div>
          </div>
        </div>

        <div className={`h-4 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative ${mounted ? "float-up" : "opacity-0"}`}>
          <div className="absolute inset-x-0 bottom-0 h-4 bg-white rounded-t-3xl" />
        </div>

        <div className={`bg-white rounded-b-3xl border border-gray-100 border-t-0 shadow-xl shadow-black/5 px-8 pb-8 ${mounted ? "float-up-2" : "opacity-0"}`}>
          {error && (
            <div className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm text-red-600 bg-red-50 border border-red-100 mb-5">
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" clipRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" />
              </svg>
              <span className="flex-1 text-xs font-semibold">{error}</span>
              <button onClick={() => setError("")} className="ml-auto text-red-400 hover:text-red-600 transition-colors p-0.5 cursor-pointer">
                <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                </svg>
              </button>
            </div>
          )}

          <div className="text-center space-y-4 pt-4">
            <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-7 h-7 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <path d="M22 7l-10 7L2 7" />
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-900">Check your email</p>
            <p className="text-xs text-gray-500 leading-relaxed">
              We sent a verification link to<br />
              <strong className="text-gray-700">{email || "your email"}</strong>
            </p>
            <p className="text-xs text-gray-400">Click the link in the email to activate your account. The link expires in 24 hours.</p>

            <div className="border-t border-gray-100 pt-4 mt-4">
              <p className="text-xs text-gray-500 mb-2">Didn&apos;t receive the email?</p>
              <button
                onClick={handleResend}
                disabled={isResending || resent}
                className="text-xs font-semibold text-gray-700 hover:text-gray-900 hover:underline transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isResending ? "Sending…" : resent ? "Sent!" : "Resend verification email"}
              </button>
            </div>

            <div className="border-t border-gray-100 pt-4 mt-2">
              <Link href="/login" className="text-xs font-semibold text-gray-500 hover:text-gray-700 hover:underline transition-colors">
                Back to sign in
              </Link>
            </div>
          </div>
        </div>

        <div className={`text-center mt-5 ${mounted ? "float-up-3" : "opacity-0"}`}>
          <button onClick={() => router.push("/")} className="group inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 hover:text-gray-700 transition-colors duration-200">
            <span className="transition-transform duration-200 group-hover:-translate-x-1">←</span>
            Back to site
          </button>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmailPendingPage;
