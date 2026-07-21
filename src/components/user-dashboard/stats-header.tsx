// stats-header.tsx — cleaner, more refined dark header with milestone tracker
import { AnimatedCounter } from "@/src/components/rewards/animated-counter";
import {
  getCurrentMonthlyTier,
  getNextTier,
  getPrevThreshold,
} from "@/src/lib/gamification";

type StatsHeaderProps = {
  activeTab: string;
  taskCount: number;
  totalPoints: number;
  inProgressCount: number;
  completedCount: number;
  monthlyPoints: number;
};

export function StatsHeader({
  activeTab,
  taskCount,
  totalPoints,
  inProgressCount,
  completedCount,
  monthlyPoints,
}: StatsHeaderProps) {
  const tabLabel =
    activeTab === "all"
      ? "All Tasks"
      : `${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Tasks`;

  return (
    <>
      <div className="relative bg-slate-900 px-6 pt-6 pb-10 overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute -right-12 -top-12 w-52 h-52 rounded-full bg-white/[0.04] pointer-events-none" />
        <div className="absolute right-20 -bottom-8 w-32 h-32 rounded-full bg-[#FACC15]/[0.06] pointer-events-none" />

        {/* Header row */}
        <div className="relative z-10 flex items-start justify-between mb-5">
          <div>
            <p className="text-white/40 text-[10px] font-bold uppercase tracking-[0.2em] mb-1">
              {activeTab === "all" ? "All" : activeTab}
            </p>
            <h2 className="text-white text-2xl font-black">{tabLabel}</h2>
          </div>
          <span className="text-[10px] font-black text-white/50 bg-white/10 border border-white/10 px-3 py-1.5 rounded-full uppercase tracking-wider mt-1">
            {taskCount} {taskCount === 1 ? "task" : "tasks"}
          </span>
        </div>

        {/* Stats row */}
        <div className="relative z-10 grid grid-cols-3 gap-1.5 sm:gap-2.5">
          {[
            {
              label: "Points",
              value: totalPoints,
              color: "text-white",
              icon: "✦",
              isAnimated: true,
            },
            {
              label: "In Progress",
              value: inProgressCount,
              color: "text-amber-300",
              icon: "◎",
            },
            {
              label: "Completed",
              value: completedCount,
              color: "text-emerald-300",
              icon: "✓",
            },
          ].map(({ label, value, color, icon, isAnimated }) => (
            <div
              key={label}
              className="bg-white/8 backdrop-blur-sm rounded-2xl px-4 py-3 border border-white/10"
            >
              <div className="flex items-center gap-1 mb-1">
                <span className={`text-[10px] ${color} opacity-60`}>
                  {icon}
                </span>
                <p className="text-white/40 text-[9px] uppercase tracking-wider font-bold">
                  {label}
                </p>
              </div>
              <p className={`${color} text-xl font-black tabular-nums`}>
                {isAnimated ? (
                  <AnimatedCounter value={value} />
                ) : typeof value === "number" ? (
                  value.toLocaleString()
                ) : (
                  value
                )}
              </p>
            </div>
          ))}
        </div>

        {/* Milestone tracker */}
        <div className="relative z-10 mt-4 bg-white/8 backdrop-blur-sm rounded-2xl px-4 py-3 border border-white/10">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-white/40 text-[9px] uppercase tracking-wider font-bold">
              Monthly Milestone
            </p>
            <span className="text-[10px] font-bold text-[#FACC15]">
              {monthlyPoints} pts
            </span>
          </div>
          {(() => {
            const next = getNextTier(monthlyPoints);
            if (!next) {
              return (
                <p className="text-white/30 text-[10px]">
                  Max tier reached — Arbitrary Elite 🏆
                </p>
              );
            }
            const prev = getPrevThreshold(monthlyPoints);
            const currentMonthlyTier = getCurrentMonthlyTier(monthlyPoints);
            const progress = Math.min(
              ((monthlyPoints - prev) / (next.threshold - prev)) * 100,
              100,
            );
            return (
              <>
                <div className="relative w-full h-1.5 rounded-full bg-white/10 overflow-hidden mb-1.5">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#FACC15] to-orange-400 transition-all duration-700"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[9px] text-white/30">
                    {currentMonthlyTier}
                  </span>
                  <span className="text-[9px] text-[#FACC15]/70">
                    {monthlyPoints}/{next.threshold} pts to {next.name}
                  </span>
                </div>
              </>
            );
          })()}
        </div>
      </div>

      {/* Smooth wave transition from dark to white */}
      <div className="relative h-5 bg-slate-900">
        <svg
          className="absolute bottom-0 w-full h-5"
          viewBox="0 0 800 20"
          preserveAspectRatio="none"
        >
          <path d="M0,20 Q200,0 400,10 Q600,20 800,0 L800,20 Z" fill="white" />
        </svg>
      </div>
    </>
  );
}
