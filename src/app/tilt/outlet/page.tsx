"use client";

import { useEffect, useState } from "react";

export default function TiltOutletPage() {
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userAddress, setUserAddress] = useState("");
  const [scans, setScans] = useState(0);
  const [submissions, setSubmissions] = useState(0);
  const [rewardsToday, setRewardsToday] = useState(0);
  const [rewardTarget, setRewardTarget] = useState(10);

  useEffect(() => {
    document.title = "Dashboard | Tilt Your Music";

    fetch("/api/tilt/me")
      .then(async (r) => {
        if (!r.ok) return;
        const data = await r.json();
        if (data.user) {
          setUserName(data.user.name ?? "");
          setUserEmail(data.user.email ?? "");
          setUserAddress(data.user.address ?? "");
        }
      })
      .catch(() => {});

    fetch("/api/tilt/outlet/stats")
      .then(async (r) => {
        if (!r.ok) return;
        const data = await r.json();
        setScans(data.scans ?? 0);
        setSubmissions(data.submissions ?? 0);
        setRewardsToday(data.rewardsToday ?? 0);
        setRewardTarget(data.rewardTarget ?? 10);
      })
      .catch(() => {});
  }, []);

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
          Welcome, {userName || "Outlet"}
        </h1>
        <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.35)" }}>
          {userEmail}
        </p>
      </div>

      <div
        className="my-8 h-px"
        style={{
          background:
            "linear-gradient(90deg, rgba(212,43,43,0.4), rgba(212,43,43,0.1) 60%, transparent)",
        }}
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8 rise2">
        <div
          className="rounded-xl border px-5 py-4"
          style={{ borderColor: "rgba(200,230,60,0.1)", background: "rgba(255,255,255,0.02)" }}
        >
          <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: "rgba(200,230,60,0.45)" }}>
            Scans
          </p>
          <p className="text-2xl font-black text-white mt-1">{scans}</p>
        </div>
        <div
          className="rounded-xl border px-5 py-4"
          style={{ borderColor: "rgba(200,230,60,0.1)", background: "rgba(255,255,255,0.02)" }}
        >
          <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: "rgba(200,230,60,0.45)" }}>
            Submissions
          </p>
          <p className="text-2xl font-black text-white mt-1">{submissions}</p>
        </div>
        <div
          className="rounded-xl border px-5 py-4"
          style={{ borderColor: "rgba(200,230,60,0.1)", background: "rgba(255,255,255,0.02)" }}
        >
          <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: "rgba(200,230,60,0.45)" }}>
            Rewards Today
          </p>
          <p className="text-2xl font-black text-white mt-1">
            {rewardsToday}
            <span className="text-sm font-semibold ml-1" style={{ color: "rgba(255,255,255,0.25)" }}>
              / {rewardTarget}
            </span>
          </p>
          <div className="mt-3 h-1 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
            <div
              className="h-1 rounded-full transition-all duration-500"
              style={{
                width: `${Math.min((rewardsToday / rewardTarget) * 100, 100)}%`,
                background: rewardsToday >= rewardTarget ? "#d42b2b" : "#c8e63c",
              }}
            />
          </div>
          {rewardsToday >= rewardTarget && (
            <p className="text-[9px] mt-1.5 font-bold uppercase tracking-widest" style={{ color: "#d42b2b" }}>
              Today's limit reached
            </p>
          )}
        </div>
      </div>

      <div className="rise2">
        <div
          className="rounded-2xl border p-6"
          style={{
            borderColor: "rgba(200,230,60,0.1)",
            background: "rgba(255,255,255,0.02)",
          }}
        >
          <div className="flex items-center gap-3 mb-5">
            <div
              className="p-2 rounded-lg"
              style={{ background: "rgba(200,230,60,0.08)" }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#c8e63c"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold text-white">Business</p>
              <p
                className="text-[10px] font-semibold uppercase tracking-widest"
                style={{ color: "rgba(200,230,60,0.4)" }}
              >
                Outlet profile
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p
                className="text-[9px] font-bold uppercase tracking-widest mb-1"
                style={{ color: "rgba(255,255,255,0.2)" }}
              >
                Business Name
              </p>
              <p
                className="text-sm"
                style={{ color: "rgba(255,255,255,0.7)" }}
              >
                {userName || "—"}
              </p>
            </div>
            <div>
              <p
                className="text-[9px] font-bold uppercase tracking-widest mb-1"
                style={{ color: "rgba(255,255,255,0.2)" }}
              >
                Email
              </p>
              <p
                className="text-sm"
                style={{ color: "rgba(255,255,255,0.7)" }}
              >
                {userEmail || "—"}
              </p>
            </div>
            <div className="sm:col-span-2">
              <p
                className="text-[9px] font-bold uppercase tracking-widest mb-1"
                style={{ color: "rgba(255,255,255,0.2)" }}
              >
                Address
              </p>
              <p
                className="text-sm"
                style={{ color: "rgba(255,255,255,0.7)" }}
              >
                {userAddress || "—"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
