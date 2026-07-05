"use client";

import React, { useState, useRef, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { User, LogOut } from "lucide-react";

const ProfileDropdown = ({ redirectUrl }: { redirectUrl: string }) => {
  const { data: session, status } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const isAdmin =
    session?.user?.role === "ADMIN" || session?.user?.role === "admin";

  // ── Points via react-query ──────────────────────────────────────────────
  const { data: pointsData } = useQuery({
    queryKey: ["user-points"],
    queryFn: async () => {
      const res = await fetch("/api/user/points");
      if (!res.ok) throw new Error("Failed to fetch points");
      return res.json() as Promise<{ points: number }>;
    },
    enabled: status === "authenticated",
    refetchInterval: 30_000,
    staleTime: 10_000,
  });

  // ── Rank via react-query (only for non-admin users) ─────────────────────
  const { data: rankData } = useQuery({
    queryKey: ["user-rank"],
    queryFn: async () => {
      const res = await fetch("/api/user/rank");
      if (!res.ok) throw new Error("Failed to fetch rank");
      return res.json() as Promise<{ rank: number | null }>;
    },
    enabled: status === "authenticated" && !isAdmin,
    // Rank changes less often than points — refresh every 2 minutes
    refetchInterval: 120_000,
    staleTime: 60_000,
  });

  const points = pointsData?.points ?? null;
  const rank = rankData?.rank ?? null;
  // ───────────────────────────────────────────────────────────────────────

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const queryClient = useQueryClient();

  const handleLogout = async () => {
    setIsOpen(false);
    queryClient.clear();
    await signOut({ redirect: false });
    router.push(redirectUrl);
  };

  const handleProfileClick = () => {
    setIsOpen(false);
    if (isAdmin) {
      router.push("/admin/profile");
    } else {
      router.push("/profile");
    }
  };

  if (status === "loading") {
    return <div className="w-10 h-10 rounded-full bg-gray-200 animate-pulse" />;
  }
  if (status === "unauthenticated") {
    return (
      <div className="flex items-center gap-1.5 sm:gap-2">
        <Link
          href="/login"
          className="px-2.5 py-1.5 sm:px-5 sm:py-2 text-xs sm:text-sm font-semibold text-gray-700 hover:text-gray-900
                   bg-white border border-white/90 hover:border-gray-300 rounded-xl shadow-sm hover:shadow-md
                   transition-all duration-200 hover:bg-gray-100 hover:-translate-y-px whitespace-nowrap"
        >
          Sign in
        </Link>
        <Link
          href="/signup"
          className="px-2.5 py-1.5 sm:px-5 sm:py-2 text-xs sm:text-sm font-bold text-black bg-[#FACC15] hover:bg-[#eab308]
                   rounded-xl transition-all duration-200 hover:scale-[1.03] active:scale-[0.97] shadow-sm whitespace-nowrap"
        >
          Sign up
        </Link>
      </div>
    );
  }

  const initials = session?.user?.name?.substring(0, 2).toUpperCase() || "AD";

  return (
    <>
      <style>{`
        @keyframes dropdownIn {
          from { opacity: 0; transform: translateY(-6px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)   scale(1); }
        }
        .dropdown-in { animation: dropdownIn 0.18s cubic-bezier(0.34,1.3,0.64,1) forwards; }
      `}</style>

      <div ref={dropdownRef} className="relative pointer-events-auto">
        {/* Avatar trigger */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`relative flex items-center justify-center w-10 h-10 rounded-full overflow-hidden
                      ring-2 transition-all duration-300
                      ${
                        isOpen
                          ? "ring-[#FACC15] shadow-lg shadow-yellow-400/20"
                          : "ring-transparent hover:ring-[#FACC15]/60 hover:shadow-md hover:shadow-yellow-400/10"
                      }`}
        >
          {session?.user?.image ? (
            <Image
              src={session.user.image}
              alt={session.user.name || "User"}
              fill
              sizes="40px"
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full bg-slate-900 flex items-center justify-center">
              <span className="text-[#FACC15] font-black text-sm">
                {initials}
              </span>
            </div>
          )}
        </button>

        {/* Points badge on avatar */}
        {points !== null && !isAdmin && (
          <span className="absolute -top-2 -right-3 text-[10px] font-bold text-white bg-blue-600 px-2 py-0.5 rounded-full shadow-sm shadow-blue-500/30 whitespace-nowrap">
            {points} pts
          </span>
        )}

        {/* Dropdown */}
        {isOpen && (
          <div
            className="dropdown-in absolute right-0 mt-3 w-64 z-[10000]
                          bg-white rounded-2xl shadow-2xl shadow-black/10
                          border border-gray-100 overflow-hidden"
          >
            {/* Dark header */}
            <div className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-5 py-4 overflow-hidden">
              <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-white/5" />
              <div className="absolute right-8 -bottom-4 w-14 h-14 rounded-full bg-white/5" />

              <div className="relative z-10 flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl overflow-hidden shrink-0 ring-2 ring-white/10 relative">
                  {session?.user?.image ? (
                    <Image
                      src={session.user.image}
                      alt={session.user.name || "User"}
                      fill
                      sizes="40px"
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-[#FACC15] flex items-center justify-center">
                      <span className="text-black font-black text-base">
                        {initials}
                      </span>
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-white font-bold text-sm truncate leading-tight">
                    {session?.user?.name || "User"}
                  </p>
                  <p className="text-white/40 text-xs truncate mt-0.5">
                    {session?.user?.email}
                  </p>
                </div>
              </div>

              {/* Points + rank row — only for regular users */}
              {!isAdmin && (
                <div className="relative z-10 mt-3 flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-bold text-white/70 bg-white/10 px-2.5 py-1 rounded-full">
                    ✦ {points ?? 0} pts
                  </span>
                  {rank !== null && (
                    <span className="text-[10px] font-bold text-[#FACC15] bg-[#FACC15]/10 border border-[#FACC15]/20 px-2.5 py-1 rounded-full">
                      #{rank} ranked
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Curved connector */}
            <div className="h-3 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative">
              <div className="absolute inset-x-0 bottom-0 h-3 bg-white rounded-t-2xl" />
            </div>

            {/* Menu items */}
            <div className="px-2 pb-2">
              <button
                onClick={handleProfileClick}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl
                           text-gray-700 hover:bg-gray-50 hover:text-gray-900
                           transition-all duration-150 group"
              >
                <div className="w-7 h-7 rounded-lg bg-gray-100 group-hover:bg-slate-900 flex items-center justify-center transition-colors duration-150 shrink-0">
                  <User className="w-3.5 h-3.5 text-gray-500 group-hover:text-white transition-colors" />
                </div>
                <span className="text-sm font-semibold">View Profile</span>
              </button>

              <div className="my-1.5 mx-3 border-t border-gray-100" />

              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl
                           text-red-500 hover:bg-red-50 hover:text-red-600
                           transition-all duration-150 group"
              >
                <div className="w-7 h-7 rounded-lg bg-red-50 group-hover:bg-red-500 flex items-center justify-center transition-colors duration-150 shrink-0">
                  <LogOut className="w-3.5 h-3.5 text-red-400 group-hover:text-white transition-colors" />
                </div>
                <span className="text-sm font-semibold">Logout</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default ProfileDropdown;
