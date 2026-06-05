"use client";
import { signIn } from "next-auth/react";
import { useEffect, useState } from "react";
import FormInput from "@/src/components/layout/form-input";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

const errorMessages: Record<string, string> = {
  OAuthSignin: "Google sign-in failed. Please try again.",
  OAuthCallback: "Something went wrong during Google login.",
  OAuthAccountNotLinked: "This email is already linked to another account.",
  CredentialsSignin: "Invalid email or password.",
  AccessDenied: "Access was denied.",
  Default: "An unexpected error occurred.",
};

const MailIcon = () => (
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
);

const LockIcon = () => (
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
);

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

const UserLoginPage = () => {
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const authError = searchParams.get("error");

  useEffect(() => {
    setMounted(true);
    document.title = "Login | Arbitary";
  }, []);

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError("");
    try {
      const result = await signIn("google", {
        redirect: true,
        callbackUrl: "/dashboard",
      });
      if (result?.error) {
        setError(result.error);
        setIsLoading(false);
      }
    } catch {
      setError("Google login failed. Please try again.");
      setIsLoading(false);
    }
  };

  const handleFacebookLogin = async () => {
    setIsLoading(true);
    setError("");
    try {
      const result = await signIn("facebook", {
        redirect: true,
        callbackUrl: "/dashboard",
      });
      if (result?.error) {
        setError(result.error);
        setIsLoading(false);
      }
    } catch {
      setError("Facebook login failed. Please try again.");
      setIsLoading(false);
    }
  };

  const handleCredentialsLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        if (result.error.startsWith("RATE_LIMITED")) {
          const seconds = Number(result.error.split(":")[1]) || 0;
          const minutes = Math.ceil(seconds / 60);
          setError(
            minutes > 1
              ? `Too many attempts. Please try again in about ${minutes} minutes.`
              : "Too many attempts. Please try again in about a minute.",
          );
        } else {
          setError(result.error);
        }
        setIsLoading(false);
      } else {
        router.push("/dashboard");
      }
    } catch {
      setError("An unexpected error occurred. Please try again.");
      setIsLoading(false);
    }
  };

  const dismissError = () => {
    setError("");
    if (authError) router.replace("/login");
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

      {/* Card */}
      <div className="relative z-10 w-full max-w-sm">
        {/* Brand header — matches dark slate card header from dashboard */}
        <div
          className={`relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900
                         rounded-t-3xl px-8 pt-8 pb-10 ${mounted ? "float-up" : "opacity-0"}`}
        >
          {/* Decorative circles — same as task cards */}
          <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-white/5" />
          <div className="absolute right-12 -bottom-6 w-24 h-24 rounded-full bg-white/5" />

          <div className="relative z-10 flex flex-col items-center text-center gap-3">
            {/* Logo mark */}
            <div
              className="w-12 h-12 bg-[#FACC15] rounded-2xl flex items-center justify-center
                            shadow-lg shadow-yellow-400/20"
            >
              <span className="text-black font-black text-xl">A</span>
            </div>
            <div>
              <h1 className="text-white text-2xl font-black tracking-[0.15em] uppercase">
                Arbitary
              </h1>
              <p className="text-white/40 text-xs font-semibold uppercase tracking-[0.25em] mt-1">
                Sign in to your account
              </p>
            </div>
          </div>
        </div>

        {/* Curved connector — same pattern as dashboard cards */}
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
              className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm
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
              <span className="flex-1 text-xs font-semibold">
                {authError
                  ? (errorMessages[authError] ?? error)
                  : (errorMessages[error] ?? error ?? errorMessages.Default)}
              </span>
              <button
                onClick={dismissError}
                className="ml-auto text-red-400 hover:text-red-600 transition-colors p-0.5 cursor-pointer"
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

          <form onSubmit={handleCredentialsLogin} className="space-y-4">
            <FormInput
              type="email"
              id="email"
              name="email"
              label="Email"
              placeholder="your@example.com"
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

            {/* Remember + Forgot */}
            <div className="flex items-center justify-between pt-0.5">
              <label
                className="flex items-center gap-2 cursor-pointer select-none group"
                onClick={() => setRememberMe((p) => !p)}
              >
                <span
                  className={`flex h-4 w-4 shrink-0 items-center justify-center rounded
                                  border transition-all duration-150
                                  ${
                                    rememberMe
                                      ? "bg-slate-900 border-slate-900"
                                      : "bg-white border-gray-300 group-hover:border-gray-400"
                                  }`}
                  aria-hidden="true"
                >
                  {rememberMe && (
                    <svg width="9" height="7" viewBox="0 0 10 8" fill="none">
                      <path
                        d="M1 4l2.5 2.5L9 1"
                        stroke="white"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </span>
                <input
                  id="remember"
                  name="remember"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={() => setRememberMe((p) => !p)}
                  className="sr-only"
                />
                <span className="text-xs font-medium text-gray-500 group-hover:text-gray-700 transition-colors">
                  Remember me
                </span>
              </label>

              <Link
                href="/forgot-password"
                className="text-xs font-medium text-gray-500 hover:text-gray-900
                           hover:underline transition-colors"
              >
                Forgot password?
              </Link>
            </div>

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
              {/* Shimmer */}
              <div
                className="absolute inset-0 -translate-x-full group-hover:translate-x-full
                              transition-transform duration-700 pointer-events-none
                              bg-gradient-to-r from-transparent via-white/30 to-transparent"
              />
              <span className="relative">
                {isLoading ? "Signing in…" : "Sign in"}
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

            {/* Google — matches the ghost button style from dashboard */}
            <button
              type="button"
              onClick={handleGoogleLogin}
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
              {isLoading ? "Signing in…" : "Continue with Google"}
            </button>
            {/* Facebook login */}
            <button
              type="button"
              onClick={handleFacebookLogin}
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

            {/* Sign up */}
            <p className="text-center text-xs text-gray-400 pt-1">
              Don&apos;t have an account?{" "}
              <Link
                href="/signup"
                className="text-gray-700 font-semibold hover:text-gray-900
                           hover:underline transition-colors"
              >
                Sign up
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

export default UserLoginPage;
