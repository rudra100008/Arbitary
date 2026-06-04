"use client";

import { useEffect, useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import Footer from "@/src/components/ui/footer";
import Header from "@/src/components/ui/header";
import { StatsHeader } from "@/src/components/user-dashboard/stats-header";
import { TaskList } from "@/src/components/user-dashboard/task-list";
import { ActivitySidebar } from "@/src/components/user-dashboard/activity-sidebar";

function nextMilestoneLabel(days: number) {
  if (days === 5) return "5-day";
  if (days === 7) return "7-day";
  if (days === 30) return "30-day";
  return `${days}-day`;
}

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState("all");
  const [expandedTasks, setExpandedTasks] = useState<Record<number, boolean>>(
    {},
  );
  const [slideDirection, setSlideDirection] = useState<"left" | "right">(
    "right",
  );
  const [isAnimating, setIsAnimating] = useState(false);
  const [pillStyle, setPillStyle] = useState({ width: 0, left: 0 });
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const queryClient = useQueryClient();

  const handleTabChange = (tab: string) => {
    if (tab === activeTab || isAnimating) return;
    const tabs = getTabs();
    const tabOrder = tabs.indexOf(tab);
    const currentOrder = tabs.indexOf(activeTab);
    setSlideDirection(tabOrder > currentOrder ? "left" : "right");
    setIsAnimating(true);
    setTimeout(() => {
      setActiveTab(tab);
      setIsAnimating(false);
    }, 220);
  };

  const toggleExpand = (e: React.MouseEvent, taskId: number) => {
    e.stopPropagation();
    setExpandedTasks((prev) => ({ ...prev, [taskId]: !prev[taskId] }));
  };

  // ── Mutations ──────────────────────────────────────────────────────────────
  const pickupMutation = useMutation({
    mutationFn: async (taskId: number) => {
      const res = await fetch("/api/user/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Failed to pick up task");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Task picked up!");
      queryClient.invalidateQueries({ queryKey: ["user-tasks"] });
    },
    onError: (err: Error) =>
      toast.error(err.message || "Failed to pick up task"),
  });

  const cancelMutation = useMutation({
    mutationFn: async (taskId: number) => {
      const res = await fetch(`/api/user/tasks?taskId=${taskId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Failed to cancel task");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Task cancelled!");
      queryClient.invalidateQueries({ queryKey: ["user-tasks"] });
    },
    onError: (err: Error) =>
      toast.error(err.message || "Failed to cancel task"),
  });

  const completeMutation = useMutation({
    mutationFn: async ({
      taskId,
      proofUrl,
      proofImageUrl,
    }: {
      taskId: number;
      proofUrl: string;
      proofImageUrl?: string;
    }) => {
      const res = await fetch("/api/user/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId,
          status: "Pending Verification",
          proofUrl,
          proofImageUrl,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Failed to submit proof");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Proof submitted! Pending verification.");
      queryClient.invalidateQueries({ queryKey: ["user-tasks"] });
    },
    onError: (err: Error) =>
      toast.error(err.message || "Failed to submit proof"),
  });

  const claimDailyLogin = useMutation({
    mutationFn: async (taskId: number) => {
      const res = await fetch("/api/user/tasks/daily-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Failed to claim daily login");
      }
      return res.json();
    },
    onSuccess: (data) => {
      const msg =
        data.bonusPoints > 0
          ? data.message
          : `Daily login claimed! +${data.pointsAwarded} pts`;
      toast.success(msg);
      if (data.streak) {
        const next = data.nextMilestone
          ? ` Next milestone at ${nextMilestoneLabel(data.nextMilestone.days)}: +${data.nextMilestone.bonus} pts`
          : " All milestones reached!";
        setTimeout(
          () => toast.info(`🔥 ${data.streak}-day streak!${next}`),
          500,
        );
      }
      queryClient.invalidateQueries({ queryKey: ["user-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["user-points"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const claimProfile = useMutation({
    mutationFn: async (taskId: number) => {
      const res = await fetch("/api/user/tasks/claim-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Failed to claim profile reward");
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast.success(`Profile reward claimed! +${data.pointsAwarded} pts`);
      queryClient.invalidateQueries({ queryKey: ["user-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["user-points"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const claimReferral = useMutation({
    mutationFn: async (taskId: number) => {
      const res = await fetch("/api/user/tasks/claim-referral", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Failed to claim referral reward");
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast.success(`Referral reward claimed! +${data.pointsAwarded} pts`);
      queryClient.invalidateQueries({ queryKey: ["user-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["user-points"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // ── Queries ────────────────────────────────────────────────────────────────
  const { data: pointsData } = useQuery<{
    points: number;
    completedTasksCount: number;
    currentStreak: number;
    longestStreak: number;
    claimedToday: boolean;
  }>({
    queryKey: ["user-points"],
    queryFn: async () => {
      const res = await fetch("/api/user/points");
      if (!res.ok) throw new Error("Failed to fetch points");
      return res.json();
    },
  });

  const { data: allTasks = [], isLoading } = useQuery({
    queryKey: ["user-tasks"],
    queryFn: async () => {
      const res = await fetch("/api/user/tasks");
      if (!res.ok) throw new Error("Failed to fetch tasks");
      return res.json();
    },
  });

  const getTabs = () => {
    const taskTypes = [
      ...new Set(allTasks.map((t: any) => t.taskType).filter(Boolean)),
    ] as string[];
    return ["all", ...taskTypes];
  };

  const tabs = getTabs();

  // ── Pill position (ref-based, fixes the slider) ───────────────────────────
  useEffect(() => {
    const activeEl = tabRefs.current[activeTab];
    if (activeEl) {
      setPillStyle({ width: activeEl.offsetWidth, left: activeEl.offsetLeft });
    }
  }, [activeTab, tabs.length]);

  const tasks = allTasks.filter(
    (t: any) =>
      (activeTab === "all" || t.taskType === activeTab) &&
      t.platform !== "system",
  );
  const systemTasks = allTasks.filter((t: any) => t.platform === "system");

  const completedStatuses = new Set([
    "verified",
    "pending verification",
    "completed",
  ]);
  const completedTasks = tasks.filter(
    (t: any) =>
      t.userStatus && completedStatuses.has(t.userStatus.toLowerCase()),
  );
  const inProgressTasks = tasks.filter(
    (t: any) => t.userStatus?.toLowerCase() === "in progress",
  );
  const rejectedTasks = tasks.filter(
    (t: any) => t.userStatus?.toLowerCase() === "rejected",
  );
  const availableTasks = tasks.filter((t: any) => !t.userStatus);

  const completedCount = completedTasks.length;
  const inProgressCount = inProgressTasks.length;
  const totalPoints = tasks.reduce(
    (sum: number, t: any) => sum + (t.points || 0),
    0,
  );

  useEffect(() => {
    document.title = "Dashboard | Arbitary";
  }, []);

  // Bind referral code from OAuth signup if one was stashed in sessionStorage
  useEffect(() => {
    const code = sessionStorage.getItem("pendingRefCode");
    if (!code) return;
    sessionStorage.removeItem("pendingRefCode");
    fetch("/api/referral/bind", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    })
      .then((r) =>
        r.ok
          ? toast.success("Referral code linked!")
          : r.json().then((d) => toast.error(d.error || "Failed to link referral")),
      )
      .catch(() => toast.error("Failed to link referral code"));
  }, []);

  return (
    <div className="bg-[#F5F5F0] pt-24 text-black min-h-screen flex flex-col selection:bg-[#FACC15] selection:text-black">
      <style>{`
        @keyframes slideInFromRight { from{opacity:0;transform:translateX(40px)} to{opacity:1;transform:translateX(0)} }
        @keyframes slideInFromLeft  { from{opacity:0;transform:translateX(-40px)} to{opacity:1;transform:translateX(0)} }
        @keyframes slideOutToLeft   { from{opacity:1;transform:translateX(0)} to{opacity:0;transform:translateX(-40px)} }
        @keyframes slideOutToRight  { from{opacity:1;transform:translateX(0)} to{opacity:0;transform:translateX(40px)} }
        .slide-in-right { animation: slideInFromRight 0.22s ease-out forwards; }
        .slide-in-left  { animation: slideInFromLeft  0.22s ease-out forwards; }
        .slide-out-left { animation: slideOutToLeft   0.18s ease-in  forwards; }
        .slide-out-right{ animation: slideOutToRight  0.18s ease-in  forwards; }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .fade-in-up { animation: fadeInUp 0.3s ease-out forwards; }
      `}</style>

      <Header />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 mb-20">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ── Left column ─────────────────────────────────────────────── */}
          <div className="lg:col-span-2 flex flex-col gap-5">
            {/* Page heading */}
            <div className="flex flex-col items-center gap-1.5 py-2">
              <h1 className="text-3xl font-black uppercase tracking-[0.18em] text-slate-900">
                Tasks
              </h1>
              <div className="flex items-center gap-2">
                <div className="h-px w-8 bg-gradient-to-r from-transparent to-slate-300" />
                <span className="text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-400">
                  {activeTab === "all"
                    ? "All tasks overview"
                    : `${activeTab} tasks`}
                </span>
                <div className="h-px w-8 bg-gradient-to-l from-transparent to-slate-300" />
              </div>

              {/* Streak & login badges */}
              {pointsData && (
                <div className="flex items-center gap-2 mt-1 flex-wrap justify-center">
                  {pointsData.claimedToday && (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full border border-emerald-200">
                      <svg
                        className="w-3.5 h-3.5"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                      Login claimed
                    </span>
                  )}
                  {pointsData.currentStreak > 0 && (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-orange-700 bg-orange-100 px-2.5 py-1 rounded-full border border-orange-200">
                      🔥 {pointsData.currentStreak}-day streak
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* ── Tab pill strip ──────────────────────────────────────── */}
            <div className="flex p-1 bg-white border border-black/8 rounded-2xl w-fit relative shadow-sm">
              {/* Sliding pill — positioned by real DOM measurements */}
              <div
                className="absolute top-1 bottom-1 rounded-xl bg-slate-900 shadow-sm transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
                style={{
                  width: pillStyle.width,
                  transform: `translateX(${pillStyle.left}px)`,
                }}
              />
              {tabs.map((tab) => (
                <button
                  key={tab}
                  ref={(el) => {
                    tabRefs.current[tab] = el;
                  }}
                  onClick={() => handleTabChange(tab)}
                  className={`relative z-10 px-5 py-2 text-sm font-semibold rounded-xl
                              transition-colors duration-200 capitalize whitespace-nowrap
                              ${activeTab === tab ? "text-white" : "text-slate-400 hover:text-slate-600"}`}
                >
                  {tab === "all" ? "All" : tab}
                </button>
              ))}
            </div>

            {/* ── Main task card ───────────────────────────────────────── */}
            <div className="relative overflow-hidden bg-white border border-black/8 rounded-3xl shadow-sm">
              <StatsHeader
                activeTab={activeTab}
                taskCount={tasks.length}
                totalPoints={totalPoints}
                inProgressCount={inProgressCount}
                completedCount={completedCount}
              />
              <div className="fade-in-up" key={activeTab}>
                <TaskList
                  availableTasks={availableTasks}
                  inProgressTasks={inProgressTasks}
                  rejectedTasks={rejectedTasks}
                  completedTasks={completedTasks}
                  systemTasks={systemTasks}
                  isLoading={isLoading}
                  activeTab={activeTab}
                  isAnimating={isAnimating}
                  slideDirection={slideDirection}
                  expandedTasks={expandedTasks}
                  onToggleExpand={toggleExpand}
                  onPickup={(id) => pickupMutation.mutate(id)}
                  onCancel={(id) => cancelMutation.mutate(id)}
                  onComplete={(id, proofUrl, proofImageUrl) =>
                    completeMutation.mutate({ taskId: id, proofUrl, proofImageUrl })
                  }
                  onClaimDailyLogin={(id) => claimDailyLogin.mutate(id)}
                  onClaimProfile={(id) => claimProfile.mutate(id)}
                  onClaimReferral={(id) => claimReferral.mutate(id)}
                  pickupPending={pickupMutation.isPending}
                  pickupVariable={pickupMutation.variables}
                  cancelPending={cancelMutation.isPending}
                  cancelVariable={cancelMutation.variables}
                />
              </div>
            </div>
          </div>

          {/* ── Right column ────────────────────────────────────────────── */}
          <div className="hidden lg:block lg:col-span-1">
            {/* Matches left column heading height: title + subtitle + badges + gaps ≈ 168px */}
            <div className="h-[168px]" aria-hidden="true" />
            <div className="sticky top-6 max-h-[calc(100vh-5rem)] overflow-y-auto overflow-x-hidden pb-6 pr-1">
              <ActivitySidebar
                tasks={tasks}
                isLoading={isLoading}
                totalPoints={totalPoints}
                completedCount={completedCount}
                pointsData={pointsData}
                onCancel={(id) => cancelMutation.mutate(id)}
                cancelPending={cancelMutation.isPending}
                cancelVariable={cancelMutation.variables}
              />
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
