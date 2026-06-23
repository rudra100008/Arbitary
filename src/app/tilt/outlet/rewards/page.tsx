"use client";

import { useEffect, useState } from "react";

type DailyRow = { date: string; count: number };
type RewardStats = { target: number; totalAllTime: number; daily: DailyRow[] };

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric", year: "numeric",
  });
}

export default function TiltOutletRewardsPage() {
  const [stats, setStats] = useState<RewardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = "Reward Analytics | Tilt Your Music";
    fetch("/api/tilt/outlet/rewards")
      .then((r) => r.json())
      .then(setStats)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const todayStr = new Date().toISOString().slice(0, 10);
  const todayRow = stats?.daily.find((d) => d.date.startsWith(todayStr));
  const todayCount = todayRow?.count ?? 0;
  const remainingToday = stats ? Math.max(0, stats.target - todayCount) : 0;

  return (
    <div>
      <style>{`
        @keyframes riseUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .rise  { animation: riseUp 0.5s cubic-bezier(0.22,1,0.36,1) forwards; }
        .rise2 { animation: riseUp 0.5s cubic-bezier(0.22,1,0.36,1) 0.08s forwards; opacity: 0; }
      `}</style>

      <div className="rise">
        <h1 className="text-2xl font-black uppercase tracking-tight text-white">Reward Analytics</h1>
        <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.35)" }}>
          Daily breakdown of instant beer rewards claimed at your outlet.
        </p>
      </div>

      <div className="my-8 h-px" style={{ background: "linear-gradient(90deg, rgba(212,43,43,0.4), rgba(212,43,43,0.1) 60%, transparent)" }} />

      {loading ? (
        <div className="flex justify-center py-16">
          <div style={{ width: "36px", height: "36px", borderRadius: "50%", border: "3px solid rgba(200,230,60,0.15)", borderTop: "3px solid #c8e63c", animation: "spin 0.8s linear infinite" }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : !stats ? (
        <p className="text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>Failed to load data.</p>
      ) : (
        <div className="rise2 space-y-6">
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Won Today", value: todayCount },
              { label: "Remaining Today", value: remainingToday },
              { label: "Daily Target", value: stats.target },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-xl border px-5 py-4" style={{ borderColor: "rgba(200,230,60,0.1)", background: "rgba(255,255,255,0.02)" }}>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: "rgba(200,230,60,0.45)" }}>{label}</p>
                <p className="text-2xl font-black text-white mt-1">{value}</p>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border overflow-hidden" style={{ borderColor: "rgba(200,230,60,0.1)" }}>
            <div className="px-5 py-4 border-b" style={{ borderColor: "rgba(200,230,60,0.08)", background: "rgba(255,255,255,0.02)" }}>
              <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: "rgba(200,230,60,0.6)" }}>Daily Breakdown</p>
            </div>

            {stats.daily.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <p className="text-sm" style={{ color: "rgba(255,255,255,0.2)" }}>No rewards claimed yet.</p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(200,230,60,0.06)" }}>
                    {["Date", "Rewards Given", "Bar"].map((h) => (
                      <th key={h} className="px-5 py-3 text-left text-[9px] font-black uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.2)" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {stats.daily.map((row, i) => (
                    <tr key={row.date} style={{ borderBottom: i < stats.daily.length - 1 ? "1px solid rgba(255,255,255,0.03)" : "none" }}>
                      <td className="px-5 py-3.5 text-sm font-semibold" style={{ color: "rgba(255,255,255,0.7)" }}>{formatDate(row.date)}</td>
                      <td className="px-5 py-3.5">
                        <span className="text-sm font-black" style={{ color: "#c8e63c" }}>{row.count}</span>
                      </td>
                      <td className="px-5 py-3.5 w-40">
                        <div className="h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
                          <div className="h-1.5 rounded-full" style={{ width: `${(row.count / stats.target) * 100}%`, background: "#c8e63c" }} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
