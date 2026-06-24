"use client";

// src/app/tilt/login/page.tsx
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function TiltLoginPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    setMounted(true);
    document.title = "Sign In | Tilt Your Music";
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    const fd = new FormData(e.currentTarget);
    const email = fd.get("email") as string;
    const password = fd.get("password") as string;

    try {
      const res = await fetch("/api/tilt/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        setIsLoading(false);
        return;
      }
      router.push(data.role ==="SUPERADMIN" ? "/tilt/admin" :"/tilt/outlet");
    } catch {
      setError("Network error. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className="tilt-noise min-h-screen flex items-center justify-center px-4 py-14 relative overflow-hidden">
      {/* Ambient glow */}
      <div
        style={{
          position: "absolute",
          bottom: "-80px",
          left: "50%",
          transform: "translateX(-50%)",
          width: "500px",
          height: "500px",
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(28,74,30,0.45) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      <style>{`
        @keyframes riseUp {
          from { opacity: 0; transform: translateY(28px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .rise  { animation: riseUp 0.55s cubic-bezier(0.22,1,0.36,1) forwards; }
        .rise2 { animation: riseUp 0.55s cubic-bezier(0.22,1,0.36,1) 0.1s forwards; opacity: 0; }
        .rise3 { animation: riseUp 0.55s cubic-bezier(0.22,1,0.36,1) 0.2s forwards; opacity: 0; }

        .tilt-input {
          width: 100%;
          padding: 12px 16px;
          background: rgba(255,255,255,0.04);
          border: 1.5px solid rgba(200,230,60,0.15);
          border-radius: 10px;
          font-size: 14px;
          color: #fff;
          outline: none;
          transition: border-color 0.2s, background 0.2s;
        }
        .tilt-input::placeholder { color: rgba(255,255,255,0.28); }
        .tilt-input:focus {
          border-color: #c8e63c;
          background: rgba(200,230,60,0.06);
        }

        .tilt-label {
          display: block;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: rgba(200,230,60,0.6);
          margin-bottom: 6px;
        }

        .tilt-btn {
          position: relative;
          width: 100%;
          padding: 14px;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 900;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          overflow: hidden;
          background: #c8e63c;
          color: #0e1f10;
          border: none;
          cursor: pointer;
          transition: transform 0.15s, opacity 0.2s;
          margin-top: 8px;
        }
        .tilt-btn:hover { transform: scale(1.015); }
        .tilt-btn:active { transform: scale(0.985); }
        .tilt-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
        .tilt-btn::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.18), transparent);
          transform: translateX(-100%);
          transition: transform 0.6s;
        }
        .tilt-btn:hover::after { transform: translateX(100%); }
      `}</style>

      <div className="relative z-10 w-full max-w-sm">
        {/* Brand text header */}
        <div className={`text-center mb-10 ${mounted ? "rise" : "opacity-0"}`}>
          <h1
            style={{
              color: "#fff",
              fontSize: "32px",
              fontWeight: 900,
              letterSpacing: "0.25em",
              textTransform: "uppercase",
              margin: 0,
            }}
          >
            Tilt Your Music
          </h1>
          <p
            style={{
              color: "rgba(200,230,60,0.5)",
              fontSize: "13px",
              fontWeight: 600,
              marginTop: "8px",
            }}
          >
            Sign in to your account
          </p>
        </div>

        {/* Form body */}
        <div
          className={mounted ? "rise2" : "opacity-0"}
          style={{
            padding: "0",
          }}
        >
          {/* Error banner */}
          {error && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                background: "rgba(212,43,43,0.12)",
                border: "1px solid rgba(212,43,43,0.35)",
                borderRadius: "10px",
                padding: "10px 14px",
                marginBottom: "20px",
              }}
            >
              <svg
                style={{
                  width: "16px",
                  height: "16px",
                  color: "#d42b2b",
                  flexShrink: 0,
                }}
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
                />
              </svg>
              <span
                style={{
                  color: "#e05555",
                  fontSize: "12px",
                  fontWeight: 600,
                  flex: 1,
                }}
              >
                {error}
              </span>
              <button
                onClick={() => setError("")}
                style={{
                  color: "rgba(212,43,43,0.6)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                <svg
                  style={{ width: "14px", height: "14px" }}
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                </svg>
              </button>
            </div>
          )}

          <form
            method="post"
            onSubmit={handleSubmit}
            style={{ display: "flex", flexDirection: "column", gap: "16px" }}
          >
            {/* Email */}
            <div>
              <label htmlFor="email" className="tilt-label">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="your@email.com"
                className="tilt-input"
              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="tilt-label">
                Password
              </label>
              <div style={{ position: "relative" }}>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="Your password"
                  className="tilt-input"
                  style={{ paddingRight: "44px" }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  style={{
                    position: "absolute",
                    right: "12px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "rgba(200,230,60,0.4)",
                    padding: 0,
                    display: "flex",
                  }}
                >
                  {showPassword ? (
                    <svg
                      style={{ width: "16px", height: "16px" }}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      strokeWidth={1.8}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19M1 1l22 22"
                      />
                    </svg>
                  ) : (
                    <svg
                      style={{ width: "16px", height: "16px" }}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      strokeWidth={1.8}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"
                      />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button type="submit" disabled={isLoading} className="tilt-btn">
              {isLoading ? "Signing in…" : "Sign In"}
            </button>

            <p
              style={{
                textAlign: "center",
                fontSize: "12px",
                color: "rgba(255,255,255,0.35)",
                marginTop: "4px",
              }}
            >
              Don&apos;t have an account?{" "}
              <Link
                href="/tilt/signup"
                style={{
                  color: "#c8e63c",
                  fontWeight: 700,
                  textDecoration: "none",
                }}
              >
                Sign up
              </Link>
            </p>
          </form>
        </div>

        {/* Back link */}
        <div className={`text-center mt-6 ${mounted ? "rise3" : "opacity-0"}`}>
          <Link
            href="/"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "10px",
              fontWeight: 700,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: "rgba(200,230,60,0.3)",
              textDecoration: "none",
              transition: "color 0.2s",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.color = "rgba(200,230,60,0.7)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.color = "rgba(200,230,60,0.3)")
            }
          >
            <span>←</span> Back to Arbitrary
          </Link>
        </div>
      </div>
    </div>
  );
}
