// stats-header.tsx — cleaner, more refined dark header
import { AnimatedCounter } from "@/src/components/rewards/animated-counter";

type StatsHeaderProps = {
  activeTab: string;
  taskCount: number;
  totalPoints: number;
  inProgressCount: number;
  completedCount: number;
};

export function StatsHeader({
  activeTab,
  taskCount,
  totalPoints,
  inProgressCount,
  completedCount,
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
        <div className="relative z-10 grid grid-cols-3 gap-2.5">
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
                ) : (
                  typeof value === "number" ? value.toLocaleString() : value
                )}
              </p>
            </div>
          ))}
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
