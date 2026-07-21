"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const MailIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <path d="M22 7l-10 7L2 7" />
  </svg>
);

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const mounted = true;
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong");
        setIsLoading(false);
        return;
      }
      setSent(true);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
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
              <p className="text-white/40 text-xs font-semibold uppercase tracking-[0.25em] mt-1">Reset your password</p>
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

          {sent ? (
            <div className="text-center space-y-4 pt-4">
              <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <svg className="w-7 h-7 text-green-600" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" clipRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" />
                </svg>
              </div>
              <p className="text-sm font-medium text-gray-900">Check your email</p>
              <p className="text-xs text-gray-500 leading-relaxed">
                If an account exists with <strong className="text-gray-700">{email}</strong>, you&apos;ll receive a password reset link shortly.
              </p>
              <Link href="/login" className="inline-block mt-2 text-xs font-semibold text-gray-700 hover:text-gray-900 hover:underline transition-colors">
                Back to sign in
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 pt-2">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="email" className="text-[10px] font-bold tracking-[0.15em] uppercase text-gray-500">
                  Email
                </label>
                <div className="relative group">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-slate-700 pointer-events-none flex items-center transition-colors duration-150">
                    <MailIcon />
                  </span>
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@example.com"
                    required
                    className="w-full py-3 pl-10 pr-4 text-sm rounded-xl bg-gray-50 border border-gray-200 text-gray-900 placeholder:text-gray-400 hover:border-gray-300 focus:outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/8 focus:bg-white transition-all duration-150 caret-slate-900"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="relative w-full py-3 rounded-xl text-sm font-black uppercase tracking-[0.15em] overflow-hidden group bg-[#FACC15] text-black hover:bg-[#eab308] transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-sm hover:shadow-md hover:shadow-yellow-200/50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 pointer-events-none bg-gradient-to-r from-transparent via-white/30 to-transparent" />
                <span className="relative">{isLoading ? "Sending…" : "Send reset link"}</span>
              </button>

              <p className="text-center text-xs text-gray-400 pt-1">
                Remember your password?{" "}
                <Link href="/login" className="text-gray-700 font-semibold hover:text-gray-900 hover:underline transition-colors">
                  Sign in
                </Link>
              </p>
            </form>
          )}
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

export default ForgotPasswordPage;
