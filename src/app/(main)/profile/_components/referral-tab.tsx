"use client";

import React, { useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import SectionHeader from "./section-header";
import html2canvas from "html2canvas";

interface ReferralData {
  code: string;
  link: string;
  totalReferred: number;
  converted: number;
  pointsEarned: number;
}

interface UserProfile {
  referredBy: number | null;
  referredByName: string | null;
}

export default function ReferralTab() {
  const [bindCode, setBindCode] = useState("");
  const cardRef = useRef<HTMLDivElement>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const queryClient = useQueryClient();

  const { data: refData, isLoading: statsLoading } = useQuery<ReferralData>({
    queryKey: ["referral-stats"],
    queryFn: async () => {
      const res = await fetch("/api/referral");
      if (!res.ok) throw new Error("Failed to fetch referral data");
      return res.json();
    },
  });

  const { data: profile } = useQuery<UserProfile>({
    queryKey: ["user-profile"],
    queryFn: async () => {
      const res = await fetch("/api/user/profile");
      if (!res.ok) throw new Error("Failed to fetch profile");
      return res.json();
    },
  });

  const isBound = !!profile?.referredBy;

  const bindMutation = useMutation({
    mutationFn: async (code: string) => {
      const res = await fetch("/api/referral/bind", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Failed to bind");
      return d;
    },
    onSuccess: (d) => {
      toast.success(d.message);
      setBindCode("");
      queryClient.invalidateQueries({ queryKey: ["referral-stats"] });
      queryClient.invalidateQueries({ queryKey: ["user-profile"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied to clipboard!");
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      toast.success("Copied to clipboard!");
    }
  };

  const handleDownload = async () => {
    if (!cardRef.current) return;
    try {
      const canvas = await html2canvas(cardRef.current, {
        scale: 2,
        backgroundColor: "#0f172a",
        useCORS: true,
        allowTaint: false,
      });
      canvas.toBlob((blob) => {
        if (!blob) {
          const link = document.createElement("a");
          link.download = "arbitary-referral-code.png";
          link.href = canvas.toDataURL("image/png");
          link.click();
          toast.success("Referral card downloaded!");
          return;
        }
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.download = "arbitary-referral-code.png";
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
        toast.success("Referral card downloaded!");
      });
    } catch (err) {
      console.error("html2canvas error:", err);
      toast.error("Failed to generate image");
    }
  };

  useEffect(() => {
    if (refData?.code && !qrDataUrl) {
      import("qrcode").then((QRCode) => {
        QRCode.toDataURL(
          refData.link,
          { width: 200, margin: 1, color: { dark: "#0f172a", light: "#ffffff" } },
          (err, url) => {
            if (!err) setQrDataUrl(url);
          },
        );
      });
    }
  }, [refData, qrDataUrl]);

  if (statsLoading) {
    return (
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <SectionHeader label="Referrals" title="Invite &amp; Earn" />
        <div className="p-6 flex justify-center">
          <div className="w-6 h-6 border-2 border-gray-200 border-t-slate-900 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
      <SectionHeader label="Referrals" title="Invite &amp; Earn" />

      <div className="p-6 flex flex-col gap-6">
        {/* ── Invite Link ── */}
        {refData?.code && (
          <div className="flex flex-col gap-1.5">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Your Invite Link
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-sm font-mono bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 truncate select-all">
                {refData.link}
              </code>
              <button
                onClick={() => handleCopy(refData.link)}
                className="shrink-0 px-4 py-2.5 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-slate-800 transition-colors"
              >
                Copy
              </button>
            </div>
          </div>
        )}

        {/* ── Bind Code ── */}
        <div className="flex flex-col gap-1.5">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
            Referrer Code
          </p>
          {isBound ? (
            <div className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 border border-emerald-200 rounded-xl">
              <svg className="w-4 h-4 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span className="text-sm font-semibold text-emerald-800">
                Referred by {profile?.referredByName || `User #${profile?.referredBy}`}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <input
                value={bindCode}
                onChange={(e) => setBindCode(e.target.value.toUpperCase())}
                placeholder="Enter referral code"
                maxLength={20}
                className="flex-1 text-sm px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/8 transition-all uppercase"
              />
              <button
                onClick={() => bindMutation.mutate(bindCode)}
                disabled={bindMutation.isPending || !bindCode.trim()}
                className="shrink-0 px-5 py-2.5 bg-[#FACC15] text-black text-xs font-bold rounded-xl hover:bg-[#eab308] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {bindMutation.isPending ? "..." : "Link"}
              </button>
            </div>
          )}
        </div>

        {/* ── Stats ── */}
        {refData && (
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Total Referred", value: refData.totalReferred },
              { label: "Converted", value: refData.converted },
              { label: "Points Earned", value: refData.pointsEarned },
            ].map((s) => (
              <div key={s.label} className="bg-slate-50 rounded-xl px-4 py-3 border border-slate-100">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{s.label}</p>
                <p className="text-xl font-black text-slate-900 mt-0.5">{s.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* ── Shareable Card ── */}
        {refData?.code && (
          <div className="flex flex-col gap-3">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Platform Pass
            </p>
            <div
              ref={cardRef}
              className="relative overflow-hidden rounded-2xl p-6"
              style={{
                background: "linear-gradient(135deg, #0f172a, #1e293b, #0f172a)",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
            >
              <div
                className="absolute -right-10 -top-10 w-40 h-40 rounded-full"
                style={{ background: "rgba(255,255,255,0.05)" }}
              />
              <div
                className="absolute -left-4 -bottom-6 w-24 h-24 rounded-full"
                style={{ background: "rgba(250,204,21,0.06)" }}
              />

              <div className="relative z-10 flex flex-col items-center gap-4">
                {/* Brand */}
                <div className="flex items-center gap-2">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ background: "#FACC15" }}
                  >
                    <span className="font-black text-sm" style={{ color: "#000000" }}>A</span>
                  </div>
                  <span className="font-black text-sm tracking-[0.15em]" style={{ color: "#ffffff" }}>ARBITARY</span>
                </div>

                <p className="text-xs text-center leading-relaxed max-w-xs" style={{ color: "rgba(255,255,255,0.6)" }}>
                  Join the platform and start earning rewards through tasks, streaks, and referrals.
                </p>

                {/* QR Code */}
                {qrDataUrl && (
                  <div
                    className="rounded-xl p-2"
                    style={{ background: "#ffffff", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)" }}
                  >
                    <img src={qrDataUrl} alt="Referral QR" crossOrigin="anonymous" className="w-24 h-24" />
                  </div>
                )}

                {/* Referral Code */}
                <div
                  className="rounded-xl px-5 py-2.5"
                  style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.1)" }}
                >
                  <p className="text-[10px] font-bold uppercase tracking-wider text-center mb-1" style={{ color: "rgba(255,255,255,0.4)" }}>
                    Referral Code
                  </p>
                  <p className="font-mono font-black text-xl tracking-[0.3em] text-center select-all" style={{ color: "#ffffff" }}>
                    {refData.code}
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={handleDownload}
              className="self-start px-5 py-2.5 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-slate-800 transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download PNG
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
