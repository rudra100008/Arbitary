"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";

export default function TiltOutletLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthed, setIsAuthed] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    fetch("/api/tilt/me")
      .then(async (r) => {
        if (r.status === 401) {
          router.replace("/tilt/login");
          return;
        }
        const data = await r.json();
        if (data.user?.role === "SUPERADMIN") {
          router.replace("/tilt/admin");
          return;
        }
        setIsAuthed(true);
        setIsChecking(false);
      })
      .catch(() => router.replace("/tilt/login"));
  }, [router]);

  const handleLogout = async () => {
    await fetch("/api/tilt/logout", { method: "POST" });
    router.push("/tilt/login");
  };

  if (isChecking) {
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

  if (!isAuthed) return null;

  const isOverview = pathname === "/tilt/outlet";
  const isQrGenerator = pathname === "/tilt/outlet/qr";

  return (
    <div
      className="tilt-noise min-h-screen flex"
      style={{ background: "#0e1f10" }}
    >
      <style>{`
                @keyframes spin { to { transform: rotate(360deg); } }
                @keyframes glowPulse {
                    0%, 100% { opacity: 0.3; }
                    50%      { opacity: 0.8; }
                }
                .red-glow { animation: glowPulse 2.5s ease-in-out infinite; }
            `}</style>

      {/* Sidebar */}
      <aside
        className="w-64 shrink-0 flex flex-col relative"
        style={{ background: "#0a170c" }}
      >
        {/* Red stripe accent edge */}
        <div
          className="absolute right-0 top-0 bottom-0 w-px"
          style={{
            background:
              "linear-gradient(180deg, transparent, rgba(212,43,43,0.3) 20%, rgba(212,43,43,0.5) 50%, rgba(212,43,43,0.3) 80%, transparent)",
          }}
        />

        {/* Brand */}
        <div className="px-6 pt-10 pb-6 relative">
          <div
            className="absolute top-0 left-6 right-6 h-0.5 rounded-full red-glow"
            style={{
              background: "#d42b2b",
              boxShadow: "0 0 8px rgba(212,43,43,0.4)",
            }}
          />
          <Link href="/tilt/outlet" className="flex items-center gap-3 group">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-xl font-black transition-transform duration-200 group-hover:scale-105"
              style={{
                background: "#c8e63c",
                color: "#0e1f10",
                boxShadow: "0 0 20px rgba(200,230,60,0.2)",
              }}
            >
              T
            </div>
            <div>
              <p className="text-white font-black text-sm uppercase tracking-wider">
                Tilt Your Music
              </p>
              <p
                className="text-[10px] font-semibold uppercase tracking-widest"
                style={{ color: "rgba(200,230,60,0.5)" }}
              >
                Outlet Dashboard
              </p>
            </div>
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          <p
            className="px-4 pb-2 text-[9px] font-bold uppercase tracking-[0.25em]"
            style={{ color: "rgba(200,230,60,0.25)" }}
          >
            Overview
          </p>
          <Link
            href="/tilt/outlet"
            className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold uppercase tracking-wider transition-all duration-200 ${
              isOverview
                ? "text-black"
                : "text-white/40 hover:text-white hover:bg-white/4"
            }`}
            style={
              isOverview
                ? {
                    background: "#c8e63c",
                    color: "#0e1f10",
                    boxShadow: "0 0 20px rgba(200,230,60,0.15)",
                  }
                : {}
            }
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
            </svg>
            Overview
          </Link>

          <Link
            href="/tilt/outlet/qr"
            className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold uppercase tracking-wider transition-all duration-200 ${
              isQrGenerator
                ? "text-black"
                : "text-white/40 hover:text-white hover:bg-white/4"
            }`}
            style={
              isQrGenerator
                ? {
                    background: "#c8e63c",
                    color: "#0e1f10",
                    boxShadow: "0 0 20px rgba(200,230,60,0.15)",
                  }
                : {}
            }
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 3h6v6H3zM15 3h6v6h-6zM3 15h6v6H3z" />
              <path d="M15 15h3v3h-3zM18 18h3v3h-3z" />
            </svg>
            Generate QR
          </Link>
        </nav>

        {/* Logout */}
        <div className="px-3 pb-8">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-4 py-2.5 rounded-xl text-sm font-bold uppercase tracking-wider
                                   text-white/20 hover:text-white hover:bg-white/4 transition-all duration-200"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto px-8 py-10">{children}</div>
      </main>
    </div>
  );
}
