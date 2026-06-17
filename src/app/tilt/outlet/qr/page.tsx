"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

export default function TiltOutletQrPage() {
  const [qrLoading, setQrLoading] = useState(false);
  const [qrError, setQrError] = useState("");
  const [qrExpiresAt, setQrExpiresAt] = useState("");
  const [qrImageDataUrl, setQrImageDataUrl] = useState("");

  useEffect(() => {
    document.title = "Generate QR | Tiltyourmusic";
  }, []);

  const formatDateTime = (d: string) => {
    if (!d) return "";
    return new Date(d).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const handleGenerateQr = async () => {
    setQrLoading(true);
    setQrError("");

    try {
      const res = await fetch("/api/tilt/qr", {
        method: "POST",
      });

      const json = (await res.json().catch(() => ({}))) as Record<
        string,
        unknown
      >;

      if (!res.ok) {
        const code = typeof json.code === "string" ? json.code : "";
        const fallback =
          typeof json.error === "string"
            ? json.error
            : "Unable to generate QR right now.";

        const messageByCode: Record<string, string> = {
          UNAUTHORIZED: "Your outlet session has expired. Please log in again.",
          OUTLET_NOT_FOUND:
            "Could not resolve your outlet account from session.",
          NO_ACTIVE_CAMPAIGN: "No active lottery campaign right now.",
          CAMPAIGN_INACTIVE: "Active campaign is no longer valid. Try again.",
          INTERNAL_ERROR: "Something went wrong while generating QR.",
        };

        setQrError(messageByCode[code] ?? fallback);
        return;
      }

      const generatedQrUrl = typeof json.qr_url === "string" ? json.qr_url : "";
      const expiresAt =
        typeof json.expires_at === "string" ? json.expires_at : "";

      if (!generatedQrUrl || !expiresAt) {
        setQrError("Invalid response from QR generation endpoint.");
        return;
      }

      const QRCode = await import("qrcode");
      const imageDataUrl = await QRCode.toDataURL(generatedQrUrl, {
        width: 300,
        margin: 1,
        color: { dark: "#0e1f10", light: "#ffffff" },
      });

      setQrExpiresAt(expiresAt);
      setQrImageDataUrl(imageDataUrl);
    } catch {
      setQrError("Network error while generating QR. Please try again.");
    } finally {
      setQrLoading(false);
    }
  };

  return (
    <div>
      <style>{`
                @keyframes riseUp {
                    from { opacity: 0; transform: translateY(20px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
                .rise  { animation: riseUp 0.5s cubic-bezier(0.22,1,0.36,1) forwards; }
                .rise2 { animation: riseUp 0.5s cubic-bezier(0.22,1,0.36,1) 0.08s forwards; opacity: 0; }
            `}</style>

      <div className="rise">
        <h1 className="text-2xl font-black uppercase tracking-tight text-white">
          Generate QR
        </h1>
        <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.35)" }}>
          One click generates a fresh single-use QR token for the current active
          lottery campaign.
        </p>
      </div>

      <div
        className="my-8 h-px"
        style={{
          background:
            "linear-gradient(90deg, rgba(212,43,43,0.4), rgba(212,43,43,0.1) 60%, transparent)",
        }}
      />

      <div
        className="rise2 rounded-2xl border p-6"
        style={{
          borderColor: "rgba(200,230,60,0.1)",
          background: "rgba(255,255,255,0.02)",
        }}
      >
        {qrError ? (
          <div
            className="text-xs px-3 py-2 rounded-lg mb-4"
            style={{
              color: "#fca5a5",
              border: "1px solid rgba(239,68,68,0.35)",
              background: "rgba(239,68,68,0.08)",
            }}
          >
            {qrError}
          </div>
        ) : null}

        <button
          type="button"
          onClick={handleGenerateQr}
          disabled={qrLoading}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ background: "#c8e63c", color: "#0e1f10" }}
        >
          {qrLoading ? "Generating…" : "Generate QR"}
        </button>

        {qrImageDataUrl ? (
          <div className="mt-6 grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4 items-start">
            <div
              className="rounded-xl p-3 border"
              style={{
                background: "#fff",
                borderColor: "rgba(200,230,60,0.2)",
              }}
            >
              <Image
                src={qrImageDataUrl}
                alt="Generated lottery QR"
                width={300}
                height={300}
                unoptimized
                className="w-full h-auto rounded"
              />
            </div>

            <div className="space-y-3">
              <div>
                <p
                  className="text-[9px] font-bold uppercase tracking-widest mb-1"
                  style={{ color: "rgba(255,255,255,0.2)" }}
                >
                  QR expires
                </p>
                <p
                  className="text-xs"
                  style={{ color: "rgba(255,255,255,0.75)" }}
                >
                  {formatDateTime(qrExpiresAt)}
                </p>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
