"use client";

// src/app/tilt/page.tsx
//
// Public Tilt lottery application page.
// Accessed via redeemed QR flow; submission is tied to the anonymous lottery session cookie.
//
// Flow:
//   1. User fills in full_name / email / phone / address and clicks "Apply".
//   2. POST /api/tilt/register → lottery entry validation + save.
//   3. Success screen shown.

import { useState, useEffect, useCallback } from "react";

import { motion, AnimatePresence } from "framer-motion";
import type { Variants, Transition } from "framer-motion";

import { normalisePhone } from "@/src/lib/tilt/phone";
import { EMAIL_FORMAT_REGEX } from "@/src/lib/tilt/disposable-email";

type PageStep = "form" | "success" | "won";

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

const riseVariants: Variants = {
  hidden: { opacity: 0, y: 28 },
  visible: (delay: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay,
      duration: 0.55,
      ease: EASE,
    } as Transition,
  }),
};

// ── Inline CSS ─────────────────────────────────────────────────────────────
const pageCss = `
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
    font-family: inherit;
    box-sizing: border-box;
  }
  .tilt-input::placeholder { color: rgba(255,255,255,0.28); }
  .tilt-input:focus {
    border-color: #c8e63c;
    background: rgba(200,230,60,0.06);
  }
  .tilt-textarea { resize: none; min-height: 80px; }
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
    background: #c8e63c;
    color: #0e1f10;
    border: none;
    cursor: pointer;
    margin-top: 8px;
    font-family: inherit;
    overflow: hidden;
    transition: transform 0.15s, opacity 0.2s;
  }
  .tilt-btn:hover { transform: scale(1.015); }
  .tilt-btn:active { transform: scale(0.985); }
  .tilt-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
  .tilt-field-error {
    font-size: 11px;
    color: #e05555;
    margin-top: 5px;
    font-weight: 600;
    line-height: 1.4;
  }
  .tilt-input.tilt-input-error {
    border-color: rgba(224,85,85,0.5);
  }
`;

export default function TiltPage() {
  const [step, setStep] = useState<PageStep>("form");
  const [sidFallback, setSidFallback] = useState("");
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  // Form state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [phoneValue, setPhoneValue] = useState("");
  const [emailValue, setEmailValue] = useState("");

  const validatePhone = useCallback((value: string): string | null => {
    const normalised = normalisePhone(value, "977");
    if (!normalised) return "Phone number is required";
    const sub = normalised.startsWith("977") ? normalised.slice(3) : normalised;
    if (sub.length !== 10) return "Phone must be exactly 10 digits";
    if (!/^(97|98)/.test(sub)) return "Phone must start with 97 or 98";
    return null;
  }, []);

  const handlePhoneBlur = useCallback(() => {
    const err = validatePhone(phoneValue);
    setFieldErrors((prev) => {
      if (err === prev.phone) return prev;
      return { ...prev, phone: err ?? "" };
    });
  }, [phoneValue, validatePhone]);

  const handlePhoneChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setPhoneValue(v);
    setFieldErrors((prev) => {
      if (!prev.phone) return prev;
      return { ...prev, phone: "" };
    });
  }, []);

  const validateEmail = useCallback((value: string): string | null => {
    if (!value) return "Email is required";
    if (!EMAIL_FORMAT_REGEX.test(value)) return "Please enter a valid email address";
    return null;
  }, []);

  const handleEmailBlur = useCallback(() => {
    const err = validateEmail(emailValue);
    setFieldErrors((prev) => {
      if (err === prev.email) return prev;
      return { ...prev, email: err ?? "" };
    });
  }, [emailValue, validateEmail]);

  const handleEmailChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setEmailValue(e.target.value);
    setFieldErrors((prev) => {
      if (!prev.email) return prev;
      return { ...prev, email: "" };
    });
  }, []);

  useEffect(() => {
    document.title = "Apply | Tilt Lottery";

    const resolveSid = () => {
      const sidFromQuery =
        new URLSearchParams(window.location.search).get("sid")?.trim() ?? "";
      const sidFromStorage =
        sessionStorage.getItem("tilt_lsid_fallback")?.trim() ?? "";
      const sid = sidFromQuery || sidFromStorage;

      if (sid) {
        setSidFallback(sid);
        sessionStorage.setItem("tilt_lsid_fallback", sid);
      }

      if (sidFromQuery) {
        window.history.replaceState(null, "", "/tilt");
      }

      return sid;
    };

    const checkSession = async () => {
      const sid = resolveSid();

      try {
        const url = new URL("/api/tilt/session-state", window.location.origin);
        if (sid) {
          url.searchParams.set("sid", sid);
        }

        const response = await fetch(url.toString(), {
          method: "GET",
          credentials: "same-origin",
          cache: "no-store",
        });

        const payload = (await response.json().catch(() => null)) as
          | { valid?: boolean; submitted?: boolean; reason?: string }
          | null;

        if (!payload?.valid) {
          const reason = payload?.reason || "invalid_session";
          window.location.replace(`/tilt/invalid?reason=${encodeURIComponent(reason)}`);
          return;
        }

        if (payload.submitted) {
          window.location.replace("/tilt/invalid?reason=already_submitted");
          return;
        }
      } catch {
        window.location.replace("/tilt/invalid?reason=server_error");
        return;
      }

      setIsCheckingSession(false);
    };

    void checkSession();

    const handlePageShow = () => {
      setIsCheckingSession(true);
      void checkSession();
    };

    window.addEventListener("pageshow", handlePageShow);

    return () => {
      window.removeEventListener("pageshow", handlePageShow);
    };
  }, []);

  if (isCheckingSession) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "#0e1f10" }}
      >
        <div
          style={{
            width: "40px",
            height: "40px",
            borderRadius: "50%",
            border: "3px solid rgba(200,230,60,0.15)",
            borderTop: "3px solid #c8e63c",
            animation: "spin 0.8s linear infinite",
          }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // ── Submit form → save lottery entry ─────────────────────────────────────
  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    // Client-side phone validation
    const phoneErr = validatePhone(phoneValue);
    if (phoneErr) {
      setFieldErrors((prev) => ({ ...prev, phone: phoneErr }));
      setIsLoading(false);
      return;
    }

    // Client-side email validation
    const emailErr = validateEmail(emailValue);
    if (emailErr) {
      setFieldErrors((prev) => ({ ...prev, email: emailErr }));
      setIsLoading(false);
      return;
    }

    const fd = new FormData(e.currentTarget);
    const data = {
      full_name: fd.get("full_name") as string,
      email: emailValue,
      phone: phoneValue,
      address: fd.get("address") as string,
      sid: sidFallback,
    };

    try {
      const res = await fetch("/api/tilt/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        const code = typeof json?.code === "string" ? json.code : "";
        const fallback =
          typeof json?.error === "string"
            ? json.error
            : "Unable to apply right now.";

        const messageByCode: Record<string, string> = {
          SESSION_REQUIRED:
            "Your session is missing or expired. Please scan the QR again.",
          SESSION_EXPIRED:
            "Your session has expired. Please scan the QR again.",
          INVALID_FULL_NAME: "Please enter your full name.",
          INVALID_EMAIL: "Please enter a valid email address.",
          DISPOSABLE_EMAIL: "Disposable email addresses are not allowed.",
          INVALID_PHONE: "Please enter a valid phone number.",
          INVALID_ADDRESS: "Please enter your address.",
          EMAIL_ALREADY_ENTERED:
            "This email has already been entered for this campaign.",
          PHONE_ALREADY_ENTERED:
            "This phone number has already been entered for this campaign.",
          INTERNAL_ERROR: "Something went wrong. Please try again.",
        };

        setError(messageByCode[code] ?? fallback);
        return;
      }

      const message = typeof json?.message === "string" ? json.message : "";
      if (message === "entered" || message === "already_submitted") {
        sessionStorage.removeItem("tilt_lsid_fallback");
        const wonReward = json?.won_reward === true;
        setStep(wonReward ? "won" : "success");
        return;
      }

      setError("Unexpected server response. Please try again.");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // ── Success screen ───────────────────────────────────────────────────────
  if (step === "won") {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={riseVariants}
          style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "24px", textAlign: "center" }}
        >
          <motion.div
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            style={{
              width: "96px", height: "96px", borderRadius: "24px",
              background: "rgba(200,230,60,0.15)",
              border: "2px solid rgba(200,230,60,0.5)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 0 40px rgba(200,230,60,0.2)",
            }}
          >
            <span style={{ fontSize: "48px" }}>🍺</span>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
            <h1 style={{ color: "#c8e63c", fontSize: "28px", fontWeight: 900, textTransform: "uppercase", margin: 0 }}>
              You won a free beer!
            </h1>
            <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "14px", marginTop: "10px" }}>
              Show this screen to the outlet staff to claim your reward.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            style={{
              background: "rgba(200,230,60,0.08)",
              border: "1.5px solid rgba(200,230,60,0.3)",
              borderRadius: "16px", padding: "20px 28px", width: "100%", maxWidth: "320px",
            }}
          >
            <p style={{ color: "rgba(200,230,60,0.8)", fontSize: "10px", fontWeight: 900, textTransform: "uppercase", marginBottom: "8px" }}>
              Instant Reward
            </p>
            <p style={{ color: "#fff", fontSize: "18px", fontWeight: 900 }}>1× Free Beer 🍺</p>
            <p style={{ color: "rgba(255,255,255,0.3)", fontSize: "11px", marginTop: "6px" }}>
              Valid at this outlet only. Non-transferable.
            </p>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  // ── Success screen ───────────────────────────────────────────────────────
  if (step === "success") {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={riseVariants}
          className="relative z-10 w-full max-w-sm text-center"
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "24px",
          }}
        >
          <motion.div
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.4, ease: EASE }}
            style={{
              width: "80px",
              height: "80px",
              borderRadius: "20px",
              background: "rgba(200,230,60,0.12)",
              border: "1.5px solid rgba(200,230,60,0.35)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg
              style={{ width: "40px", height: "40px", color: "#c8e63c" }}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4.5 12.75l6 6 9-13.5"
              />
            </svg>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.4 }}
          >
            <h1
              style={{
                color: "#fff",
                fontSize: "22px",
                fontWeight: 900,
                letterSpacing: "0.05em",
                textTransform: "uppercase",
                margin: 0,
              }}
            >
              Application received!
            </h1>
            <p
              style={{
                color: "rgba(255,255,255,0.4)",
                fontSize: "14px",
                marginTop: "8px",
              }}
            >
              You&apos;re entered in the Tilt lottery for this campaign.
            </p>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  // ── Registration form ────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-14 relative overflow-hidden">
      {/* Ambient glow */}
      <div
        style={{
          position: "absolute",
          top: "-80px",
          right: "-80px",
          width: "400px",
          height: "400px",
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(28,74,30,0.4) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      <style>{pageCss}</style>

      <div className="relative z-10 w-full max-w-sm">
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <motion.div
          initial="hidden"
          animate="visible"
          custom={0}
          variants={riseVariants}
          style={{
            background: "linear-gradient(135deg, #1a4a1f 0%, #0e2b10 100%)",
            border: "1.5px solid rgba(200,230,60,0.2)",
            borderRadius: "18px 18px 0 0",
            padding: "28px 32px 24px",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: "50%",
              height: "2px",
              background:
                "linear-gradient(90deg, transparent, #d42b2b 20%, #d42b2b 80%, transparent)",
              opacity: 0.5,
            }}
          />

          <div className="flex flex-col items-center text-center gap-3 relative z-10">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.15, duration: 0.4, ease: EASE }}
              style={{
                width: "56px",
                height: "56px",
                background: "#c8e63c",
                borderRadius: "13px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 0 24px rgba(200,230,60,0.35)",
              }}
            >
              <span
                style={{
                  color: "#0e1f10",
                  fontWeight: 900,
                  fontSize: "30px",
                  lineHeight: 1,
                }}
              >
                T
              </span>
            </motion.div>

            <div>
              <h1
                style={{
                  color: "#fff",
                  fontSize: "24px",
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
                  color: "rgba(200,230,60,0.65)",
                  fontSize: "10px",
                  fontWeight: 700,
                  letterSpacing: "0.3em",
                  textTransform: "uppercase",
                  margin: "5px 0 0",
                }}
              >
                Lottery Application
              </p>
            </div>
          </div>
        </motion.div>

        {/* Red-stripe seam */}
        <div
          style={{
            height: "8px",
            background: "linear-gradient(135deg, #1a4a1f 0%, #0e2b10 100%)",
            position: "relative",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: 0,
              right: 0,
              height: "2px",
              background: "#d42b2b",
              transform: "translateY(-50%)",
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: "8px",
              background: "#0e1f10",
              borderRadius: "12px 12px 0 0",
            }}
          />
        </div>

        {/* ── Form body ───────────────────────────────────────────────────── */}
        <motion.div
          initial="hidden"
          animate="visible"
          custom={0.1}
          variants={riseVariants}
          style={{
            background: "#0e1f10",
            border: "1.5px solid rgba(200,230,60,0.12)",
            borderTop: "none",
            borderRadius: "0 0 18px 18px",
            padding: "24px 32px 32px",
          }}
        >
          {/* Error banner */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8, height: 0 }}
                animate={{ opacity: 1, y: 0, height: "auto" }}
                exit={{ opacity: 0, y: -8, height: 0 }}
                transition={{ duration: 0.25 }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  background: "rgba(212,43,43,0.12)",
                  border: "1px solid rgba(212,43,43,0.35)",
                  borderRadius: "10px",
                  padding: "10px 14px",
                  marginBottom: "20px",
                  overflow: "hidden",
                }}
              >
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
                    flexShrink: 0,
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
              </motion.div>
            )}
          </AnimatePresence>

          <form
            onSubmit={handleFormSubmit}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "16px",
            }}
          >
            {[
              {
                id: "full_name",
                label: "Full Name",
                type: "text",
                placeholder: "Your full name",
                autoComplete: "name",
              },
              {
                id: "email",
                label: "Email",
                type: "email",
                placeholder: "your@email.com",
                autoComplete: "email",
              },
              {
                id: "phone",
                label: "Phone Number",
                type: "tel",
                placeholder: "+977 98XXXXXXXX",
                autoComplete: "tel",
              },
            ].map((field, i) => (
              <motion.div
                key={field.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  delay: 0.15 + i * 0.06,
                  duration: 0.4,
                  ease: EASE,
                }}
              >
                <label htmlFor={field.id} className="tilt-label">
                  {field.label}
                </label>
                <input
                  id={field.id}
                  name={field.id}
                  type={field.type}
                  required
                  placeholder={field.placeholder}
                  autoComplete={field.autoComplete}
                  className={`tilt-input${fieldErrors[field.id] ? " tilt-input-error" : ""}`}
                  value={field.id === "phone" ? phoneValue : field.id === "email" ? emailValue : undefined}
                  onChange={field.id === "phone" ? handlePhoneChange : field.id === "email" ? handleEmailChange : undefined}
                  onBlur={field.id === "phone" ? handlePhoneBlur : field.id === "email" ? handleEmailBlur : undefined}
                />
                {fieldErrors[field.id] && (
                  <div className="tilt-field-error">{fieldErrors[field.id]}</div>
                )}
              </motion.div>
            ))}

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.33, duration: 0.4, ease: EASE }}
            >
              <label htmlFor="address" className="tilt-label">
                Address
              </label>
              <textarea
                id="address"
                name="address"
                required
                rows={3}
                placeholder="Your full address"
                className="tilt-input tilt-textarea"
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.39, duration: 0.4, ease: EASE }}
            >
              <button type="submit" disabled={isLoading} className="tilt-btn">
                {isLoading ? "Applying…" : "Apply"}
              </button>
            </motion.div>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
