"use client";

import { signIn } from "next-auth/react";
import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Script from "next/script";
import FormInput from "@/src/components/layout/form-input";
import { usePlatformFlags } from "@/src/hooks/use-platform-flags";

declare global {
  interface Window {
    turnstile?: {
      render: (container: string, opts: { sitekey: string }) => void;
      getResponse: () => string;
    };
  }
}

const errorMessages: Record<string, string> = {
  OAuthSignin: "Google sign-up failed. Please try again.",
  OAuthCallback: "Something went wrong during Google sign-up.",
  OAuthAccountNotLinked: "This email is already linked to another account.",
  FACEBOOK_DISABLED:
    "Facebook sign-up is temporarily unavailable. Please use Google or email instead.",
  Default: "An unexpected error occurred.",
};

const UserSignupPage = () => {
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const authError = searchParams.get("error");
  const refCode = searchParams.get("ref");
  const [agreed, setAgreed] = useState(false);
  const turnstileRef = useRef<HTMLDivElement>(null);
  const { flags } = usePlatformFlags();

  useEffect(() => {
    setMounted(true);
    document.title = "Sign Up | Arbitrary";
  }, []);

  const handleGoogleSignup = async () => {
    setIsLoading(true);
    setError("");
    try {
      // Store the ref code server-side in a short-lived httpOnly cookie
      // before the OAuth redirect. This is safer than encoding it in
      // callbackUrl (which is user-editable) or sessionStorage (which
      // doesn't survive cross-browser links).
      if (refCode) {
        await fetch("/api/auth/pre-oauth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refCode }),
        });
      }
      const result = await signIn("google", {
        redirect: true,
        callbackUrl: "/dashboard",
      });
      if (result?.error) {
        setError(result.error);
        setIsLoading(false);
      }
    } catch {
      setError("Google sign-up failed. Please try again.");
      setIsLoading(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFacebookSignup = async () => {
    setIsLoading(true);
    setError("");
    try {
      if (refCode) {
        await fetch("/api/auth/pre-oauth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refCode }),
        });
      }
      const result = await signIn("facebook", {
        redirect: true,
        callbackUrl: "/dashboard",
      });
      if (result?.error) {
        setError(result.error);
        setIsLoading(false);
      }
    } catch {
      setError("Facebook sign-up failed. Please try again.");
      setIsLoading(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (!agreed) {
      setError("You must agree to the Terms of Service and Privacy Policy.");
      return;
    }

    const dateOfBirth = formData.get("dateOfBirth") as string;
    if (!dateOfBirth) {
      setError("Date of birth is required.");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const body: Record<string, unknown> = {
        firstName: formData.get("firstName"),
        lastName: formData.get("lastName"),
        email: formData.get("email"),
        password,
        dateOfBirth,
      };
      if (refCode) body.referralCode = refCode;

      // Fingerprint
      try {
        const FingerprintJS = await import("@fingerprintjs/fingerprintjs");
        const fp = await FingerprintJS.load();
        const { visitorId } = await fp.get();
        body.fingerprint = visitorId;
      } catch {
        /* fingerprint unavailable */
      }

      // Turnstile token
      if (typeof window !== "undefined" && window.turnstile) {
        body.turnstileToken = window.turnstile.getResponse();
      }

      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
        setIsLoading(false);
        return;
      }

      const email = formData.get("email") as string;
      router.push(`/verify-email?email=${encodeURIComponent(email)}`);
    } catch {
      setError("Something went wrong. Please try again.");
      setIsLoading(false);
    }
  };

  const EyeIcon = () => (
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
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );

  const EyeOffIcon = () => (
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
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );

  const eyeToggle = (show: boolean, setShow: (v: boolean) => void) => (
    <button
      type="button"
      aria-label={show ? "Hide password" : "Show password"}
      onClick={() => setShow(!show)}
      className="text-gray-400 hover:text-gray-700 transition-colors cursor-pointer
                 w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100"
    >
      {show ? <EyeOffIcon /> : <EyeIcon />}
    </button>
  );

  return (
    <div
      className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-10
                    relative overflow-hidden selection:bg-[#FACC15] selection:text-black"
    >
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
        {/* Dark slate header — same as login page */}
        <div
          className={`relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900
                         rounded-t-3xl px-8 pt-8 pb-10 ${mounted ? "float-up" : "opacity-0"}`}
        >
          <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-white/5" />
          <div className="absolute right-12 -bottom-6 w-24 h-24 rounded-full bg-white/5" />

          <div className="relative z-10 flex flex-col items-center text-center gap-3">
            <div
              className="w-12 h-12 bg-[#FACC15] rounded-2xl flex items-center justify-center
                            shadow-lg shadow-yellow-400/20"
            >
              <span className="text-black font-black text-xl">A</span>
            </div>
            <div>
              <h1 className="text-white text-2xl font-black tracking-[0.15em] uppercase">
                Arbitrary
              </h1>
              <p className="text-white/40 text-xs font-semibold uppercase tracking-[0.25em] mt-1">
                Create your account
              </p>
            </div>
          </div>
        </div>

        {/* Curved connector */}
        <div
          className={`h-4 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative
                         ${mounted ? "float-up" : "opacity-0"}`}
        >
          <div className="absolute inset-x-0 bottom-0 h-4 bg-white rounded-t-3xl" />
        </div>

        {/* Form body */}
        <div
          className={`bg-white rounded-b-3xl border border-gray-100 border-t-0
                         shadow-xl shadow-black/5 px-8 pb-8
                         ${mounted ? "float-up-2" : "opacity-0"}`}
        >
          {/* Error badge */}
          {(error || authError) && (
            <div
              className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-semibold
                            text-red-600 bg-red-50 border border-red-100 mb-5"
            >
              <svg
                className="w-4 h-4 shrink-0"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
                />
              </svg>
              <span className="flex-1">
                {authError
                  ? (errorMessages[authError] ?? errorMessages.Default)
                  : (errorMessages[error] ?? error ?? errorMessages.Default)}
              </span>
              <button
                onClick={() => setError("")}
                className="ml-auto text-red-400 hover:text-red-600 transition-colors cursor-pointer p-0.5"
              >
                <svg
                  className="w-3.5 h-3.5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                </svg>
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name row */}
            <div className="grid grid-cols-2 gap-3">
              <FormInput
                type="text"
                id="firstName"
                name="firstName"
                label="First name"
                placeholder="John"
                required
              />
              <FormInput
                type="text"
                id="lastName"
                name="lastName"
                label="Last name"
                placeholder="Doe"
                required
              />
            </div>

            <FormInput
              type="email"
              id="email"
              name="email"
              label="Email"
              placeholder="your@example.com"
              required
              icon={
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
                  <rect x="2" y="4" width="20" height="16" rx="2" />
                  <path d="M22 7l-10 7L2 7" />
                </svg>
              }
            />

            <FormInput
              type="date"
              id="dateOfBirth"
              name="dateOfBirth"
              label="Date of birth"
              placeholder="YYYY-MM-DD"
              required
              icon={
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
              }
            />
            <p className="text-[10px] text-gray-400 -mt-2">
              You must be 21 or older to participate in Arbitrary promotions.
            </p>

            <FormInput
              type={showPassword ? "text" : "password"}
              id="password"
              name="password"
              label="Password"
              placeholder="Min. 8 characters"
              required
              icon={
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
                  <rect x="3" y="11" width="18" height="11" rx="2" />
                  <path d="M7 11V7a5 5 0 0110 0v4" />
                </svg>
              }
              rightElement={eyeToggle(showPassword, setShowPassword)}
            />

            <FormInput
              type={showConfirm ? "text" : "password"}
              id="confirmPassword"
              name="confirmPassword"
              label="Confirm password"
              placeholder="Repeat your password"
              required
              icon={
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
                  <rect x="3" y="11" width="18" height="11" rx="2" />
                  <path d="M7 11V7a5 5 0 0110 0v4" />
                </svg>
              }
              rightElement={eyeToggle(showConfirm, setShowConfirm)}
            />

            {/* Terms checkbox */}
            <label
              className="flex items-start gap-2.5 cursor-pointer group pt-0.5"
              onClick={() => setAgreed((p) => !p)}
            >
              {/* No input needed — state drives everything */}
              <span
                className={`flex h-4 w-4 mt-0.5 shrink-0 items-center justify-center rounded
                border transition-all duration-150
                ${
                  agreed
                    ? "bg-slate-900 border-slate-900"
                    : "border-gray-300 bg-white group-hover:border-gray-400"
                }`}
                aria-hidden="true"
              >
                {agreed && (
                  <svg
                    className="w-2.5 h-2.5 text-white"
                    viewBox="0 0 10 8"
                    fill="none"
                  >
                    <path
                      d="M1 4l2.5 2.5L9 1"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </span>
              <span className="text-xs text-gray-500 leading-snug group-hover:text-gray-700 transition-colors">
                I agree to the{" "}
                <Link
                  href="/terms"
                  className="text-gray-700 font-semibold hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link
                  href="/privacy"
                  className="text-gray-700 font-semibold hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  Privacy Policy
                </Link>
              </span>
            </label>

            {/* Turnstile widget */}
            <div ref={turnstileRef} id="cf-turnstile-container" />

            {/* Submit — yellow CTA */}
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
              <div
                className="absolute inset-0 -translate-x-full group-hover:translate-x-full
                              transition-transform duration-700 pointer-events-none
                              bg-gradient-to-r from-transparent via-white/30 to-transparent"
              />
              <span className="relative">
                {isLoading ? "Creating account…" : "Create account"}
              </span>
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                or
              </span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            {/* Google */}
            <button
              type="button"
              onClick={handleGoogleSignup}
              disabled={isLoading}
              className="w-full py-2.5 px-3 flex items-center justify-center gap-2.5
                         text-sm font-medium text-gray-700
                         bg-white border border-gray-200 hover:border-gray-300
                         rounded-xl hover:bg-gray-50
                         transition-all duration-200 hover:scale-[1.01] active:scale-[0.99]
                         disabled:opacity-50 disabled:cursor-not-allowed"
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
              {isLoading ? "Signing up…" : "Continue with Google"}
            </button>
            {flags.facebook && (
              <button
                type="button"
                onClick={handleFacebookSignup}
                disabled={isLoading}
                className="w-full py-2.5 px-3 flex items-center justify-center gap-2.5
                         text-sm font-medium text-gray-700
                         bg-white border border-gray-200 hover:border-gray-300
                         rounded-xl hover:bg-gray-50
                         transition-all duration-200 hover:scale-[1.01] active:scale-[0.99]
                         disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg
                  width={16}
                  height={16}
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 1024 1024"
                  id="facebook"
                >
                  <path
                    fill="#1877f2"
                    d="M1024,512C1024,229.23016,794.76978,0,512,0S0,229.23016,0,512c0,255.554,187.231,467.37012,432,505.77777V660H302V512H432V399.2C432,270.87982,508.43854,200,625.38922,200,681.40765,200,740,210,740,210V336H675.43713C611.83508,336,592,375.46667,592,415.95728V512H734L711.3,660H592v357.77777C836.769,979.37012,1024,767.554,1024,512Z"
                  ></path>
                  <path
                    fill="#fff"
                    d="M711.3,660,734,512H592V415.95728C592,375.46667,611.83508,336,675.43713,336H740V210s-58.59235-10-114.61078-10C508.43854,200,432,270.87982,432,399.2V512H302V660H432v357.77777a517.39619,517.39619,0,0,0,160,0V660Z"
                  ></path>
                </svg>
                {isLoading ? "Signing in…" : "Continue with Facebook"}
              </button>
            )}

            <Script
              src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
              strategy="afterInteractive"
              onLoad={() => {
                if (window.turnstile) {
                  window.turnstile.render("#cf-turnstile-container", {
                    sitekey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "",
                  });
                }
              }}
            />

            {/* Sign in link */}
            <p className="text-center text-xs text-gray-400 pt-1">
              Already have an account?{" "}
              <Link
                href="/login"
                className="text-gray-700 font-semibold hover:text-gray-900 hover:underline transition-colors"
              >
                Sign in
              </Link>
            </p>
          </form>
        </div>

        {/* Back link */}
        <div
          className={`text-center mt-5 ${mounted ? "float-up-3" : "opacity-0"}`}
        >
          <button
            onClick={() => router.push("/")}
            className="group inline-flex items-center gap-1.5 text-[10px] font-bold
                       uppercase tracking-[0.2em] text-gray-400 hover:text-gray-700
                       transition-colors duration-200"
          >
            <span className="transition-transform duration-200 group-hover:-translate-x-1">
              ←
            </span>
            Back to site
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserSignupPage;
