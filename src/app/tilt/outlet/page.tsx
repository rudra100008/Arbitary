"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Registration {
  name: string;
  email: string;
  phone: string;
  address: string;
  submittedAt?: string;
}

export default function TiltOutletPage() {
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [registration, setRegistration] = useState<Registration | null>(null);
  const [submittedAt, setSubmittedAt] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Dashboard | Tiltyourmusic";

    fetch("/api/tilt/me")
      .then(async (r) => {
        if (!r.ok) return;
        const data = await r.json();
        if (data.user) {
          setUserName(data.user.name ?? "");
          setUserEmail(data.user.email ?? "");
        }
        if (data.registration) {
          setRegistration(data.registration);
          setSubmittedAt(data.registration.submittedAt ?? null);
        }
      })
      .catch(() => {});
  }, []);

  const formatDate = (d: string | null) => {
    if (!d) return "";
    return new Date(d).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
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
              <p className="text-sm font-bold text-white">Registration</p>
              <p
                className="text-[10px] font-semibold uppercase tracking-widest"
                style={{ color: "rgba(200,230,60,0.4)" }}
              >
                {registration ? "Completed" : "Not yet submitted"}
              </p>
            </div>
          </div>

          {registration ? (
            <>
              <div
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider mb-4"
                style={{
                  background: "rgba(200,230,60,0.08)",
                  border: "1px solid rgba(200,230,60,0.15)",
                  color: "#c8e63c",
                }}
              >
                <span
                  style={{
                    width: "5px",
                    height: "5px",
                    borderRadius: "50%",
                    background: "#c8e63c",
                    display: "inline-block",
                    boxShadow: "0 0 6px rgba(200,230,60,0.5)",
                  }}
                />
                Registered — {formatDate(submittedAt)}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
                <div>
                  <p
                    className="text-[9px] font-bold uppercase tracking-widest mb-1"
                    style={{ color: "rgba(255,255,255,0.2)" }}
                  >
                    Phone
                  </p>
                  <p
                    className="text-sm"
                    style={{ color: "rgba(255,255,255,0.7)" }}
                  >
                    {registration.phone}
                  </p>
                </div>
                <div>
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
                    {registration.address}
                  </p>
                </div>
              </div>

              <Link
                href="/tilt"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all duration-200 hover:scale-[1.02]"
                style={{
                  background: "rgba(200,230,60,0.08)",
                  border: "1px solid rgba(200,230,60,0.15)",
                  color: "#c8e63c",
                }}
              >
                Edit Registration →
              </Link>
            </>
          ) : (
            <div>
              <p
                className="text-sm mb-4"
                style={{ color: "rgba(255,255,255,0.4)" }}
              >
                Complete your registration to get started.
              </p>
              <Link
                href="/tilt"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 hover:scale-[1.02]"
                style={{ background: "#c8e63c", color: "#0e1f10" }}
              >
                Complete Registration →
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
