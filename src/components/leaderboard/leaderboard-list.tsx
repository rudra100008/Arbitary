"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import type { TopUser } from "@/src/db/user-queries";

interface LeaderboardListProps {
  users: TopUser[];
  currentUserId?: number;
}

// ─── Tier System ──────────────────────────────────────────────
type Tier = { label: string; icon: string; min: number; color: string };

const TIERS: Tier[] = [
  { label: "Diamond", icon: "💎", min: 1000, color: "#6366f1" },
  { label: "Gold", icon: "🥇", min: 500, color: "#FACC15" },
  { label: "Silver", icon: "🥈", min: 200, color: "#A8A8A8" },
  { label: "Bronze", icon: "🥉", min: 0, color: "#CD7F32" },
];

function getTier(points: number): Tier {
  for (const t of TIERS) {
    if (points >= t.min) return t;
  }
  return TIERS[TIERS.length - 1];
}

// ─── Helpers ──────────────────────────────────────────────────
function getInitials(name: string | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

const MEDAL_EMOJIS = ["🥇", "🥈", "🥉"];
const TOP_BORDER = ["border-[#FACC15]", "border-zinc-300", "border-amber-700"];

// ─── Sub-components ───────────────────────────────────────────

function Avatar({
  src,
  name,
  rank,
}: {
  src: string | null;
  name: string | null;
  rank: number;
}) {
  const isTop3 = rank <= 3;
  const border = isTop3 ? TOP_BORDER[rank - 1] : "border-black/10";

  if (src) {
    return (
      <img
        src={src}
        alt={name ?? "User"}
        className={`w-10 h-10 md:w-12 md:h-12 rounded-full object-cover border-2 ${border} flex-shrink-0`}
      />
    );
  }

  return (
    <div
      className={`w-10 h-10 md:w-12 md:h-12 rounded-full border-2 ${border} flex-shrink-0 bg-zinc-100 flex items-center justify-center text-xs font-black uppercase tracking-wider`}
    >
      {getInitials(name)}
    </div>
  );
}

function RankBadge({ rank }: { rank: number }) {
  if (rank <= 3) {
    return (
      <span className="text-xl md:text-2xl flex-shrink-0 w-8 text-center">
        {MEDAL_EMOJIS[rank - 1]}
      </span>
    );
  }
  return (
    <span className="text-sm md:text-base font-black text-zinc-400 w-8 text-center flex-shrink-0">
      #{rank}
    </span>
  );
}

function TierBadge({ points }: { points: number }) {
  const tier = getTier(points);
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border flex-shrink-0"
      style={{
        backgroundColor: `${tier.color}12`,
        borderColor: `${tier.color}30`,
        color: tier.color,
      }}
    >
      <span className="text-xs">{tier.icon}</span>
      {tier.label}
    </span>
  );
}

function StatPill({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color?: string;
}) {
  return (
    <span
      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-zinc-50 border border-black/5 text-xs font-bold uppercase tracking-wider"
      style={
        color
          ? {
              backgroundColor: `${color}15`,
              borderColor: `${color}30`,
              color,
            }
          : undefined
      }
    >
      {label === "tasks" && (
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      )}
      {label === "referrals" && (
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      )}
      <span>{value}</span>
      <span className="text-zinc-400 font-medium normal-case">{label}</span>
    </span>
  );
}

// ─── Shine overlay for top 3 ──────────────────────────────────
function ShineOverlay() {
  return (
    <motion.div
      className="pointer-events-none absolute inset-0 rounded-[inherit] overflow-hidden"
      aria-hidden
    >
      <motion.div
        className="absolute inset-0 w-[200%]"
        style={{
          background:
            "linear-gradient(105deg, transparent 30%, rgba(250,204,21,0.08) 45%, rgba(250,204,21,0.15) 50%, rgba(250,204,21,0.08) 55%, transparent 70%)",
        }}
        animate={{ x: ["-50%", "50%"] }}
        transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
      />
    </motion.div>
  );
}

// ─── Row component ────────────────────────────────────────────
function LeaderboardRow({
  user,
  rank,
  isCurrentUser,
  index,
}: {
  user: TopUser;
  rank: number;
  isCurrentUser: boolean;
  index: number;
}) {
  const isTop3 = rank <= 3;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: Math.min(index * 0.035, 1.2), ease: "easeOut", layout: { duration: 0.3 } }}
      className={[
        "relative grid grid-cols-[48px_1fr] md:grid-cols-[48px_48px_1fr_auto] gap-4 px-4 md:px-6 py-4 md:py-5 items-center transition-all duration-300",
        isCurrentUser ? "bg-[#FACC15]/10 border-b-2 border-[#FACC15]/30" : "",
        "hover:bg-zinc-50 hover:shadow-lg hover:scale-[1.005] hover:z-10",
        isTop3 ? "" : "border-b border-black/5",
      ].join(" ")}
      whileHover={
        isTop3
          ? { scale: 1.015, transition: { duration: 0.2 } }
          : { x: 4, transition: { duration: 0.15 } }
      }
    >
      {/* Gold/Silver/Bronze glow for top 3 */}
      {isTop3 && <ShineOverlay />}

      {/* Rank */}
      <RankBadge rank={rank} />

      {/* Avatar */}
      <Avatar src={user.image} name={user.name} rank={rank} />

      {/* Name + points + tier */}
      <div className="flex flex-col min-w-0 relative z-10">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={`font-black uppercase tracking-tight truncate text-sm md:text-base ${
              isCurrentUser ? "text-[#FACC15]" : isTop3 ? "text-black" : "text-zinc-700"
            }`}
          >
            {user.name ?? "Anonymous"}
            {isCurrentUser && (
              <span className="ml-1.5 text-[9px] font-black uppercase tracking-[0.15em] text-[#FACC15]">
                (You)
              </span>
            )}
          </span>
          <TierBadge points={user.points} />
        </div>
        <span className="text-xs font-bold text-zinc-400 flex items-center gap-1">
          <span className="text-[#FACC15]">✦</span>
          <span>{user.points.toLocaleString()} pts</span>
        </span>
      </div>

      {/* Task & Referral counts */}
      <div className="flex items-center gap-2 justify-start md:justify-end flex-wrap relative z-10">
        <StatPill label="tasks" value={user.tasks} color="#FACC15" />
        <StatPill label="referrals" value={user.referrals} />
      </div>
    </motion.div>
  );
}

// ─── Sticky current-user row ──────────────────────────────────
function CurrentUserStickyRow({
  user,
  rank,
}: {
  user: TopUser;
  rank: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 1.5, ease: "easeOut" }}
      className="sticky bottom-0 grid grid-cols-[48px_1fr] md:grid-cols-[48px_48px_1fr_auto] gap-4 px-4 md:px-6 py-4 md:py-5 items-center bg-white/90 backdrop-blur-xl border-t-2 border-[#FACC15]/40 shadow-[0_-8px_30px_rgba(250,204,21,0.12)]"
    >
      {/* Rank */}
      <RankBadge rank={rank} />

      {/* Avatar */}
      <Avatar src={user.image} name={user.name} rank={rank} />

      {/* Name + points */}
      <div className="flex flex-col min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-black uppercase tracking-tight truncate text-sm md:text-base text-[#FACC15]">
            {user.name ?? "Anonymous"}
            <span className="ml-1.5 text-[9px] font-black uppercase tracking-[0.15em]">
              (You)
            </span>
          </span>
          <TierBadge points={user.points} />
        </div>
        <span className="text-xs font-bold text-zinc-400 flex items-center gap-1">
          <span className="text-[#FACC15]">✦</span>
          <span>{user.points.toLocaleString()} pts</span>
        </span>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-2 justify-start md:justify-end flex-wrap">
        <StatPill label="tasks" value={user.tasks} color="#FACC15" />
        <StatPill label="referrals" value={user.referrals} />
      </div>
    </motion.div>
  );
}

// ─── Main component ───────────────────────────────────────────
export default function LeaderboardList({
  users,
  currentUserId,
}: LeaderboardListProps) {
  const [search, setSearch] = useState("");

  // Compute ranks (1-indexed)
  const rankedUsers = useMemo(
    () => users.map((u, i) => ({ ...u, rank: i + 1 })),
    [users],
  );

  // Filtered list based on search
  const filtered = useMemo(() => {
    if (!search.trim()) return rankedUsers;
    const q = search.toLowerCase();
    return rankedUsers.filter(
      (u) =>
        u.name?.toLowerCase().includes(q) ||
        u.id.toString().includes(q),
    );
  }, [rankedUsers, search]);

  // Current user data
  const currentUserData = useMemo(() => {
    if (!currentUserId) return null;
    // Find the user and their true rank in the full list
    const idx = rankedUsers.findIndex((u) => u.id === currentUserId);
    if (idx === -1) return null;
    return rankedUsers[idx];
  }, [rankedUsers, currentUserId]);

  // Is current user visible in the filtered list?
  const currentUserVisible =
    currentUserData && filtered.some((u) => u.id === currentUserId);

  return (
    <div className="w-full flex flex-col">
      {/* ── Search bar ─────────────────────────────────────── */}
      <div className="sticky top-0 z-20 bg-white/90 backdrop-blur-xl border-b border-black/5 px-4 md:px-6 py-4">
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="text"
            placeholder="Search by name or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-zinc-50 border border-black/10 rounded-xl text-sm font-medium text-black placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#FACC15]/40 focus:border-[#FACC15]/50 transition-all"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-black transition-colors"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* ── Header row ─────────────────────────────────────── */}
      <div className="hidden md:grid grid-cols-[48px_48px_1fr_auto] gap-4 px-6 py-4 border-b border-black/5 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
        <span />
        <span />
        <span>User</span>
        <span className="pr-2">Stats</span>
      </div>

      {/* ── Rows ───────────────────────────────────────────── */}
      <div className="divide-y divide-black/5">
        {filtered.map((user, index) => (
          <LeaderboardRow
            key={user.id}
            user={user}
            rank={user.rank}
            index={index}
            isCurrentUser={user.id === currentUserId}
          />
        ))}
      </div>

      {/* ── Empty state ────────────────────────────────────── */}
      {filtered.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-20 text-zinc-400"
        >
          <p className="text-4xl mb-4">🔍</p>
          <p className="font-black uppercase tracking-widest text-sm">
            No users match &quot;{search}&quot;
          </p>
        </motion.div>
      )}

      {/* ── Current user sticky row (if not visible in list) ─ */}
      {currentUserData && !currentUserVisible && (
        <CurrentUserStickyRow
          user={currentUserData}
          rank={currentUserData.rank}
        />
      )}
    </div>
  );
}
