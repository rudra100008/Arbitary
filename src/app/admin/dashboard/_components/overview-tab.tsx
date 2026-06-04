"use client";

interface OverviewTabProps {
  stats: { label: string; value: string; growth: string }[];
  events: any[];
  onViewAllEvents: () => void;
}

const OverviewTab = ({ stats, events, onViewAllEvents }: OverviewTabProps) => (
  <div className="animate-fade-in">
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="bg-white p-8 rounded-[2rem] border border-black/5 shadow-sm hover:shadow-xl transition-all duration-500 group"
        >
          <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] mb-4">
            {stat.label}
          </p>
          <h3 className="text-4xl font-black mb-2 group-hover:text-[#FACC15] transition-colors">
            {stat.value}
          </h3>
          <p className="text-xs font-bold text-green-500 uppercase tracking-tight">
            {stat.growth}
          </p>
        </div>
      ))}
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div className="bg-white p-10 rounded-[2.5rem] border border-black/5 shadow-sm">
        <div className="flex justify-between items-center mb-8">
          <h3 className="text-xl font-black uppercase tracking-tight">
            Recent Events
          </h3>
          <button
            onClick={onViewAllEvents}
            className="text-[10px] font-black uppercase tracking-widest text-[#FACC15] bg-black px-4 py-2 rounded-full hover:bg-[#FACC15] hover:text-black transition-all"
          >
            View All
          </button>
        </div>
        <div className="space-y-6">
          {events.slice(0, 3).map((event: any) => (
            <div
              key={event.id}
              className="flex items-center justify-between p-4 rounded-2xl hover:bg-zinc-50 transition-all border border-transparent hover:border-black/5 group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-zinc-100 group-hover:bg-[#FACC15]/20 transition-colors" />
                <div>
                  <p className="font-bold text-sm uppercase tracking-tight">
                    {event.title}
                  </p>
                  <p className="text-[10px] text-zinc-400 font-bold uppercase">
                    {event.date}
                  </p>
                </div>
              </div>
              <span
                className={`text-[10px] font-black uppercase px-3 py-1 rounded-full ${event.status === "Success" ? "text-green-500 bg-green-50" : "text-[#FACC15] bg-[#FACC15]/10"}`}
              >
                {event.status}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-black text-white p-10 rounded-[2.5rem] relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 p-8">
          <div className="w-20 h-20 bg-[#FACC15] rounded-full blur-[60px] opacity-20" />
        </div>
        <h3 className="text-xl font-black uppercase tracking-tight mb-4 text-[#FACC15]">
          System Status
        </h3>
        <p className="text-zinc-500 text-sm font-medium leading-relaxed mb-8">
          All systems are operational. The database is synchronized and the
          API is serving requests at optimal speeds.
        </p>
        <div className="space-y-4">
          <div className="flex items-center gap-4 text-xs font-bold uppercase tracking-widest">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            Database Connection: Stable
          </div>
          <div className="flex items-center gap-4 text-xs font-bold uppercase tracking-widest text-zinc-400">
            <div className="w-2 h-2 bg-zinc-500 rounded-full" />
            Last Backup: 2h ago
          </div>
        </div>
      </div>
    </div>
  </div>
);

export default OverviewTab;
