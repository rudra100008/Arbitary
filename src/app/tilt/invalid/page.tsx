"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

const reasonCopy: Record<string, { title: string; message: string }> = {
  missing_token: {
    title: "Invalid QR Link",
    message:
      "This QR link is missing a token. Please scan a fresh QR code from the outlet dashboard.",
  },
  not_found: {
    title: "Token Not Found",
    message:
      "This token does not exist. Please scan a newly generated QR code.",
  },
  expired: {
    title: "Token Expired",
    message:
      "This QR token has expired. Please ask for a new QR and scan again.",
  },
  already_used: {
    title: "Token Already Used",
    message:
      "This QR token was already redeemed. For security, one token can only be used once.",
  },
  no_session: {
    title: "Session Missing",
    message:
      "Your lottery session is missing. Please scan a valid QR code to start again.",
  },
  invalid_session: {
    title: "Session Invalid",
    message:
      "Your lottery session is invalid or expired. Please scan the QR again.",
  },
  already_submitted: {
    title: "Entry Already Submitted",
    message:
      "This session has already submitted an entry. A single session cannot submit again.",
  },
  server_error: {
    title: "Temporary Error",
    message:
      "We could not validate your token right now. Please try scanning again.",
  },
};

export default function TiltInvalidPage() {
  const searchParams = useSearchParams();
  const reason = (searchParams.get("reason") || "").trim();

  const content =
    reasonCopy[reason] ?? {
      title: "Invalid Lottery Access",
      message:
        "Your lottery link could not be validated. Please scan a fresh QR code.",
    };

  return (
    <main
      className="min-h-screen flex items-center justify-center px-4 py-10 relative overflow-hidden"
      style={{ background: "#0e1f10" }}
    >
      <div
        style={{
          position: "absolute",
          top: "-120px",
          right: "-120px",
          width: "360px",
          height: "360px",
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(28,74,30,0.4) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />
      <section
        className="w-full max-w-md rounded-2xl border p-6 relative"
        style={{
          borderColor: "rgba(212,43,43,0.35)",
          background: "rgba(255,255,255,0.04)",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: "24px",
            right: "24px",
            top: "0",
            height: "2px",
            background:
              "linear-gradient(90deg, transparent, #d42b2b 25%, #d42b2b 75%, transparent)",
            opacity: 0.8,
          }}
        />
        <p
          className="text-[10px] font-black uppercase tracking-[0.2em] mb-2"
          style={{ color: "rgba(200,230,60,0.72)" }}
        >
          Lottery Access
        </p>

        <h1
          className="text-xl font-black uppercase tracking-tight"
          style={{ color: "#fff" }}
        >
          {content.title}
        </h1>

        <p className="text-sm mt-3" style={{ color: "rgba(255,255,255,0.75)" }}>
          {content.message}
        </p>

        {reason ? (
          <p
            className="text-[11px] mt-4"
            style={{ color: "rgba(255,255,255,0.45)" }}
          >
            Reason code: {reason}
          </p>
        ) : null}

        <div className="mt-6">
          <Link
            href="/tilt"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider"
            style={{ background: "#c8e63c", color: "#0e1f10" }}
          >
            Retry Lottery Form
          </Link>
        </div>
      </section>
    </main>
  );
}
