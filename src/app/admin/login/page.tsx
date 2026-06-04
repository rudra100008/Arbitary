"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, Lock } from "lucide-react";
import { useRouter } from "next/navigation";
import { signIn, useSession } from "next-auth/react";

const AdminLoginPage = () => {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // If already logged in as admin, redirect to dashboard
  useEffect(() => {
    if (
      status === "authenticated" &&
      (session?.user as any)?.role === "admin"
    ) {
      router.replace("/admin/dashboard");
    }
  }, [status, session, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Invalid email or password. Please try again.");
        setIsLoading(false);
        return;
      }

      if (result?.ok) {
        // Verify the user is actually an admin by fetching the session
        const res = await fetch("/api/auth/session");
        const sessionData = await res.json();

        if (sessionData?.user?.role !== "admin") {
          // Not an admin — sign them out and show error
          await signIn("credentials", { redirect: false }); // this won't do anything harmful
          setError("Access denied. This portal is for administrators only.");
          setIsLoading(false);
          // Sign them out since they're not admin
          const { signOut } = await import("next-auth/react");
          await signOut({ redirect: false });
          return;
        }

        router.push("/admin/dashboard");
      }
    } catch {
      setError("Something went wrong. Please try again.");
      setIsLoading(false);
    }
  };

  useEffect(() => {
    document.title = "Admin Login | Arbitary Agency";
  }, []);

  // Show nothing while checking existing session
  if (status === "loading") {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-6 selection:bg-[#FACC15] selection:text-black font-sans relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-[#FACC15]/5 rounded-full blur-[150px] -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-black/3 rounded-full blur-[100px] translate-x-1/3 translate-y-1/3" />

      <div className="w-full max-w-md animate-fade-in relative z-10">
        {/* Logo Section */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-black rounded-2xl mb-6 shadow-2xl shadow-black/20">
            <span className="text-[#FACC15] font-black text-xl">A</span>
          </div>
          <h1 className="text-4xl font-black tracking-tighter uppercase mb-2">
            ARBITARY <span className="text-[#FACC15]">ADMIN</span>
          </h1>
          <p className="text-zinc-400 text-xs font-bold uppercase tracking-[0.3em]">
            Authorized Personnel Only
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white p-10 rounded-[2.5rem] shadow-[0_40px_100px_rgba(0,0,0,0.05)] border border-black/5 relative overflow-hidden">
          {/* Decorative Elements */}
          <div className="absolute -top-12 -right-12 w-32 h-32 bg-[#FACC15]/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-black/5 rounded-full blur-2xl" />

          <form onSubmit={handleLogin} className="space-y-6 relative z-10">
            {/* Security badge */}
            <div className="flex items-center gap-2 bg-zinc-50 border border-black/5 rounded-xl px-4 py-2.5 mb-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400">
                Secure Connection Established
              </span>
            </div>

            {error && (
              <motion.div
                key={error}
                initial={{ x: 0 }}
                animate={{ x: [0, -10, 10, -10, 10, 0] }}
                transition={{ duration: 0.4 }}
                className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2"
              >
                <AlertTriangle className="w-4 h-4 shrink-0" />
                {error}
              </motion.div>
            )}

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-2">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-6 py-4 bg-zinc-50 border border-black/5 rounded-2xl focus:outline-none focus:border-[#FACC15] focus:ring-4 focus:ring-[#FACC15]/10 transition-all font-bold text-sm"
                placeholder="admin@arbitary.com"
                required
                autoComplete="email"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-6 py-4 bg-zinc-50 border border-black/5 rounded-2xl focus:outline-none focus:border-[#FACC15] focus:ring-4 focus:ring-[#FACC15]/10 transition-all font-bold text-sm pr-14"
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-black transition-colors p-1"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L6.59 6.59m7.532 7.532l3.29 3.29M3 3l18 18"
                      />
                    </svg>
                  ) : (
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-5 bg-black text-white font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-[#FACC15] hover:text-black transition-all duration-500 shadow-xl hover:shadow-2xl hover:shadow-[#FACC15]/20 disabled:opacity-50 disabled:cursor-not-allowed text-sm mt-4 flex items-center justify-center gap-3"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Authenticating...
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  Secure Login
                </>
              )}
            </button>
          </form>
        </div>

        {/* Back to Site */}
        <div className="text-center mt-8">
          <button
            onClick={() => router.push("/")}
            className="text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-black transition-colors group inline-flex items-center gap-2"
          >
            <span className="group-hover:-translate-x-1 transition-transform">
              ←
            </span>
            Back to public site
          </button>
        </div>
      </div>

      <style>{`
        .animate-fade-in {
          animation: fadeIn 0.8s cubic-bezier(0.23, 1, 0.32, 1) forwards;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default AdminLoginPage;
