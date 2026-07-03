"use client";
import { type ImageAnalysis } from "@/src/hooks/useScreenshotUpload";
import { useEffect, useState, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  useQuery,
  useMutation,
  useQueryClient,
  useInfiniteQuery,
  type InfiniteData,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { StatsHeader } from "@/src/components/user-dashboard/stats-header";
import { TaskList } from "@/src/components/user-dashboard/task-list";
import { ActivitySidebar } from "@/src/components/user-dashboard/activity-sidebar";
import { RewardProvider } from "@/src/components/rewards/reward-context";
import { UserTaskItem, DashboardResponse } from "@/src/services/task.service";
import { useSubmissionSSE } from "@/src/hooks/use-submission-sse";
import { isDailyTaskValid } from "@/src/lib/task-validity";

function nextMilestoneLabel(days: number) {
  if (days === 5) return "5-day";
  if (days === 7) return "7-day";
  if (days === 30) return "30-day";
  return `${days}-day`;
}

function formatTabLabel(tab: string) {
  if (tab === "all") return "All";
  if (tab === "social" || tab === "social_media") return "Social";
  if (tab === "share") return "Share";
  if (tab === "special") return "Special";
  if (tab === "VIDEO_WATCH") return "Watch Videos";
  if (tab === "SCREENSHOT_UPLOAD") return "Screenshot";
  return tab.replace(/_/g, " ");
}

export default function DashboardPage() {
  return (
    <RewardProvider>
      <DashboardInner />
    </RewardProvider>
  );
}

function DashboardInner() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("all");
  const [allTaskTypes, setAllTaskTypes] = useState<string[]>([]);
  const [expandedTasks, setExpandedTasks] = useState<Record<number, boolean>>(
    {},
  );

  const { data: featureFlags } = useQuery({
    queryKey: ["feature-flags"],
    queryFn: async () => {
      const res = await fetch("/api/feature-flags");
      const data = await res.json() as { flags: Record<string, boolean> };
      return data.flags;
    },
    staleTime: 30_000,
  });

  useEffect(() => {
    if (featureFlags && featureFlags.dashboard === false) {
      router.push("/");
    }
  }, [featureFlags, router]);
  const [justClaimedTaskId, setJustClaimedTaskId] = useState<number | null>(null);
  const [slideDirection, setSlideDirection] = useState<"left" | "right">(
    "right",
  );
  const [isAnimating, setIsAnimating] = useState(false);
  const [pillStyle, setPillStyle] = useState({ width: 0, left: 0 });
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  // Ref placed on the spacer div between heading and the task card.
  // We measure the task card's offsetTop relative to the grid container
  // so the sidebar spacer is always pixel-perfect regardless of gap/padding changes.
  const taskCardRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const [taskCardTop, setTaskCardTop] = useState(0);

  useEffect(() => {
    const measure = () => {
      if (!taskCardRef.current || !gridRef.current) return;
      const gridTop = gridRef.current.getBoundingClientRect().top;
      const cardTop = taskCardRef.current.getBoundingClientRect().top;
      setTaskCardTop(cardTop - gridTop);
    };

    measure();
    const observer = new ResizeObserver(measure);
    if (taskCardRef.current) observer.observe(taskCardRef.current);
    if (gridRef.current) observer.observe(gridRef.current);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  const queryClient = useQueryClient();

  useSubmissionSSE();

  const handleTabChange = (tab: string) => {
    if (tab === activeTab || isAnimating) return;
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

  const optimisticRemoveTask = async (taskId: number, tab: string) => {
    const qk = ["user-tasks", "dashboard", tab] as const;
    await queryClient.cancelQueries({ queryKey: qk });
    const previous = queryClient.getQueryData<InfiniteData<DashboardResponse>>(qk);
    if (previous) {
      queryClient.setQueryData<InfiniteData<DashboardResponse>>(qk, {
        ...previous,
        pages: previous.pages.map((page) => ({
          ...page,
          available: page.available.filter((t) => t.id !== taskId),
          inProgress: page.inProgress.filter((t) => t.id !== taskId),
          rejected: page.rejected.filter((t) => t.id !== taskId),
          completed: page.completed.filter((t) => t.id !== taskId),
          systemTasks: page.systemTasks.filter((t) => t.id !== taskId),
        })),
      });
    }
    return { previous, qk, tab };
  };
  const pickupMutation = useMutation({
    mutationFn: async ({
      taskId,
      tab: _tab,
    }: {
      taskId: number;
      tab: string;
    }) => {
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
    onSuccess: (_data, variables) => {
      toast.success("Task picked up!");
      setJustClaimedTaskId(variables.taskId);
      queryClient.invalidateQueries({
        queryKey: ["user-tasks", "dashboard", variables.tab],
        exact: true,
      });
    },
    onError: (err: Error) => {
      if (err.message?.toLowerCase().includes("already picked up")) {
        queryClient.invalidateQueries({ queryKey: ["user-tasks", "dashboard"] });
        toast.info("Resuming your task…");
        return;
      }
      toast.error(err.message || "Failed to pick up task");
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async ({
      taskId,
      tab: _tab,
    }: {
      taskId: number;
      tab: string;
    }) => {
      const res = await fetch(`/api/user/tasks?taskId=${taskId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Failed to cancel task");
      }
      return res.json();
    },
    onMutate: async ({ taskId, tab }) => {
      return optimisticRemoveTask(taskId, tab);
    },
    onError: (err: Error, variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(context.qk, context.previous);
      }
      toast.error(err.message || "Failed to cancel task");
    },
    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["user-tasks", "dashboard", variables.tab],
        exact: true,
      });
    },
  });

  const completeMutation = useMutation({
    mutationFn: async ({
      taskId,
      proofUrl,
      proofImageUrl,
      imageAnalysis,
      tab: _tab,
    }: {
      taskId: number;
      proofUrl: string;
      proofImageUrl?: string;
      imageAnalysis?: ImageAnalysis | null;
      tab: string;
    }) => {
      const res = await fetch("/api/user/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId,
          status: "Pending Verification",
          proofUrl,
          proofImageUrl,
          proofPhash: imageAnalysis?.phash ?? null,
          proofExifFlags: imageAnalysis?.exifFlags
            ? JSON.stringify(imageAnalysis.exifFlags)
            : null,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Failed to submit proof");
      }
      return res.json();
    },
    onMutate: async ({ taskId, tab }) => {
      return optimisticRemoveTask(taskId, tab);
    },
    onError: (err: Error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(context.qk, context.previous);
      }
      toast.error(err.message || "Failed to submit proof");
    },
    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["user-tasks", "dashboard", variables.tab],
        exact: true,
      });
    },
  });

  const claimDailyLogin = useMutation({
    mutationFn: async ({ tab: _tab }: { tab: string }) => {
      const res = await fetch("/api/user/tasks/daily-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Failed to claim daily login");
      }
      return res.json();
    },
    onSuccess: (data, variables) => {
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
      queryClient.invalidateQueries({
        queryKey: ["user-tasks", "dashboard", variables.tab],
        exact: true,
      });
      queryClient.invalidateQueries({ queryKey: ["user-points"], exact: true });
      queryClient.invalidateQueries({ queryKey: ["user-tasks", "completed"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const claimProfile = useMutation({
    mutationFn: async ({
      taskId,
      tab: _tab,
    }: {
      taskId: number;
      tab: string;
    }) => {
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
    onSuccess: (data, variables) => {
      toast.success(`Profile reward claimed! +${data.pointsAwarded} pts`);
      queryClient.invalidateQueries({
        queryKey: ["user-tasks", "dashboard", variables.tab],
        exact: true,
      });
      queryClient.invalidateQueries({ queryKey: ["user-points"], exact: true });
      queryClient.invalidateQueries({ queryKey: ["user-tasks", "completed"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const claimReferral = useMutation({
    mutationFn: async ({
      taskId,
      tab: _tab,
    }: {
      taskId: number;
      tab: string;
    }) => {
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
    onSuccess: (data, variables) => {
      toast.success(`Referral reward claimed! +${data.pointsAwarded} pts`);
      queryClient.invalidateQueries({
        queryKey: ["user-tasks", "dashboard", variables.tab],
        exact: true,
      });
      queryClient.invalidateQueries({ queryKey: ["user-points"], exact: true });
      queryClient.invalidateQueries({ queryKey: ["user-tasks", "completed"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const youtubeCompleteMutation = useMutation({
    mutationFn: async ({
      taskId,
      sessionId,
      fingerprint,
    }: {
      taskId: number;
      sessionId?: number;
      fingerprint?: string;
    }) => {
      const res = await fetch("/api/user/tasks/youtube-complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId, sessionId, fingerprint }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Failed to complete YouTube task");
      }
      return res.json();
    },
    onMutate: async ({ taskId }) => {
      const qk = ["user-tasks", "dashboard"] as const;
      await queryClient.cancelQueries({ queryKey: qk });
      const previous = queryClient.getQueryData<InfiniteData<DashboardResponse>>(qk);
      if (previous) {
        queryClient.setQueryData<InfiniteData<DashboardResponse>>(qk, {
          ...previous,
          pages: previous.pages.map((page) => ({
            ...page,
            available: page.available.filter((t) => t.id !== taskId),
            inProgress: page.inProgress.filter((t) => t.id !== taskId),
            rejected: page.rejected.filter((t) => t.id !== taskId),
            completed: page.completed.filter((t) => t.id !== taskId),
            systemTasks: page.systemTasks.filter((t) => t.id !== taskId),
          })),
        });
      }
      return { previous, qk };
    },
    onError: (err: Error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(context.qk, context.previous);
      }
      const msg = err.message || "Failed to complete task";
      toast.error(`Error: ${msg}`);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["user-tasks", "dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["user-tasks", "completed"] });
      queryClient.invalidateQueries({ queryKey: ["user-points"] });
    },
  });

  const handleModalComplete = (taskId: number, taskType?: string | null) => {
    queryClient.invalidateQueries({
      queryKey: ["user-tasks", "dashboard"],
    });
    queryClient.invalidateQueries({
      queryKey: ["user-tasks", "completed"],
    });
    queryClient.invalidateQueries({
      queryKey: ["user-points"],
    });
  };

  // ── Queries ────────────────────────────────────────────────────────────────
  const { data: pointsData } = useQuery<{
    points: number;
    completedTasksCount: number;
    currentStreak: number;
    longestStreak: number;
    claimedToday: boolean;
    monthlyPoints: number;
    tier: string;
  }>({
    queryKey: ["user-points"],
    queryFn: async () => {
      const res = await fetch("/api/user/points");
      if (!res.ok) throw new Error("Failed to fetch points");
      return res.json();
    },
  });

  // ── Dashboard (paginated available + full non-paginated buckets) ──
  const {
    data: dashboardData,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery<DashboardResponse>({
    queryKey: ["user-tasks", "dashboard", activeTab],
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams();
      if (activeTab !== "all") params.set("taskType", activeTab);
      if (pageParam) params.set("cursor", pageParam as string);
      params.set("limit", "10");
      const res = await fetch(`/api/user/tasks/dashboard?${params}`);
      if (!res.ok) throw new Error("Failed to fetch dashboard tasks");
      return res.json();
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.availableNextCursor,
  });

  // ── Completed tasks (sidecar query for sidebar) ──
  const { data: completedData } = useQuery<{
    tasks: UserTaskItem[];
    nextCursor: string | null;
  }>({
    queryKey: ["user-tasks", "completed"],
    queryFn: async () => {
      const res = await fetch("/api/user/tasks/completed?limit=50");
      if (!res.ok) throw new Error("Failed to fetch completed tasks");
      return res.json();
    },
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    for (const page of dashboardData?.pages ?? []) {
      if (page.availableTaskTypes && page.availableTaskTypes.length > 0) {
        setAllTaskTypes(page.availableTaskTypes);
        return;
      }
    }
  }, [dashboardData?.pages]);

  const tabs = ["all", ...allTaskTypes];

  const firstPage = dashboardData?.pages[0];
  const allAvailable = useMemo(
    () => dashboardData?.pages.flatMap((p) => p.available) ?? [],
    [dashboardData],
  );

  const inProgressTasks = firstPage?.inProgress ?? [];
  const availableTasks = allAvailable;
  const rejectedTasks = firstPage?.rejected ?? [];
  const systemTasks = firstPage?.systemTasks ?? [];

  const filteredCompletedTasks = useMemo(() => {
    const tasks = completedData?.tasks ?? [];
    if (!tasks) return [];
    return tasks.filter((t: UserTaskItem) =>
      isDailyTaskValid(t.taskType, t.userAssignedAt ?? t.completedAt),
    );
  }, [completedData]);

  // ── Pill position ─────────────────────────────────────────────────────────
  useEffect(() => {
    const activeEl = tabRefs.current[activeTab];
    if (activeEl) {
      setPillStyle({ width: activeEl.offsetWidth, left: activeEl.offsetLeft });
    }
  }, [activeTab, allTaskTypes.length]);

  const uniqueCompletedTasks = useMemo(
    () =>
      Array.from(
        new Map(filteredCompletedTasks.map((t) => [t.id, t])).values(),
      ),
    [filteredCompletedTasks],
  );

  const completedCount = uniqueCompletedTasks.length;
  const inProgressCount = inProgressTasks.length;
  const totalPoints = availableTasks.reduce(
    (sum: number, t: UserTaskItem) => sum + (t.points || 0),
    0,
  );

  const taskCount =
    inProgressTasks.length + availableTasks.length + rejectedTasks.length;

  const sidebarTasks = [
    ...inProgressTasks,
    ...availableTasks,
    ...rejectedTasks,
    ...systemTasks,
  ];

  useEffect(() => {
    document.title = "Dashboard | Arbitrary";
  }, []);

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
          : r
              .json()
              .then((d) => toast.error(d.error || "Failed to link referral")),
      )
      .catch(() => toast.error("Failed to link referral code"));
  }, []);

  useEffect(() => {
    const pendingTaskId = sessionStorage.getItem("facebook_pending_task_id");
    if (!pendingTaskId) return;
    sessionStorage.removeItem("facebook_pending_task_id");
    queryClient.invalidateQueries({ queryKey: ["user-tasks", "dashboard"] });
    toast.info("Facebook connected! Your task is ready to continue.");
  }, [queryClient]);

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

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 mb-20">
        {/* grid ref — used to measure task card's offsetTop inside the grid */}
        <div ref={gridRef} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
                    : `${formatTabLabel(activeTab)} tasks`}
                </span>
                <div className="h-px w-8 bg-gradient-to-l from-transparent to-slate-300" />
              </div>

              {/* Streak, login badges & tier */}
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
                  {pointsData.tier && (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-indigo-700 bg-indigo-100 px-2.5 py-1 rounded-full border border-indigo-200 capitalize">
                      {pointsData.tier}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* ── Tab pill strip ──────────────────────────────────────── */}
            <div className="flex p-1 bg-white border border-black/8 rounded-2xl w-fit relative shadow-sm overflow-x-auto max-w-full [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
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
                  {formatTabLabel(tab)}
                </button>
              ))}
            </div>

            {/* ── Main task card — ref sits here so we measure its top edge ── */}
            <div
              ref={taskCardRef}
              className="relative overflow-hidden bg-white border border-black/8 rounded-3xl shadow-sm"
            >
              <StatsHeader
                activeTab={formatTabLabel(activeTab)}
                taskCount={taskCount}
                totalPoints={totalPoints}
                inProgressCount={inProgressCount}
                completedCount={completedCount}
                monthlyPoints={pointsData?.monthlyPoints ?? 0}
                tier={pointsData?.tier ?? "bronze"}
              />
              <div className="fade-in-up" key={activeTab}>
                <TaskList
                  availableTasks={availableTasks}
                  inProgressTasks={inProgressTasks}
                  completedTasks={uniqueCompletedTasks}
                  rejectedTasks={rejectedTasks}
                  systemTasks={systemTasks}
                  isLoading={isLoading}
                  activeTab={activeTab}
                  isAnimating={isAnimating}
                  slideDirection={slideDirection}
                  expandedTasks={expandedTasks}
                  onToggleExpand={toggleExpand}
                  justClaimedTaskId={justClaimedTaskId}
                  onScrollComplete={() => setJustClaimedTaskId(null)}
                  onPickup={(id) =>
                    pickupMutation.mutate({ taskId: id, tab: activeTab })
                  }
                  onCancel={(id) =>
                    cancelMutation.mutate({ taskId: id, tab: activeTab })
                  }
                  onComplete={(id, proofUrl, proofImageUrl, imageAnalysis) => {
                    if (imageAnalysis?.isDuplicateImage) {
                      toast.error(
                        "This image has already been submitted as proof. Please upload a different screenshot.",
                      );
                      return;
                    }
                    completeMutation.mutate({
                      taskId: id,
                      proofUrl,
                      proofImageUrl,
                      imageAnalysis,
                      tab: activeTab,
                    });
                  }}
                  onClaimDailyLogin={(_id) =>
                    claimDailyLogin.mutate({ tab: activeTab })
                  }
                  onClaimProfile={(id) =>
                    claimProfile.mutate({ taskId: id, tab: activeTab })
                  }
                  onClaimReferral={(id) =>
                    claimReferral.mutate({ taskId: id, tab: activeTab })
                  }
                  pickupPending={pickupMutation.isPending}
                  pickupVariable={pickupMutation.variables?.taskId ?? undefined}
                  cancelPending={cancelMutation.isPending}
                  cancelVariable={cancelMutation.variables?.taskId ?? undefined}
                  onYoutubeComplete={(vars) =>
                    youtubeCompleteMutation.mutate(vars)
                  }
                  onModalComplete={handleModalComplete}
                  onLoadMore={() => fetchNextPage()}
                  hasMore={hasNextPage}
                  loadingMore={isFetchingNextPage}
                />
              </div>
            </div>
          </div>

          {/* ── Right column ────────────────────────────────────────────── */}
          <div className="hidden lg:block lg:col-span-1">
            {/*
              Spacer = exact pixel distance from the grid top to the task card's top edge.
              Measured live via ResizeObserver so it stays correct at every viewport width
              and regardless of how many badge rows the heading renders.
            */}
            <div style={{ height: taskCardTop }} aria-hidden="true" />
            <div className="sticky top-6 max-h-[calc(100vh-5rem)] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] overflow-x-hidden pb-6 pr-1">
              <ActivitySidebar
                tasks={sidebarTasks}
                completedTasks={uniqueCompletedTasks}
                isLoading={isLoading}
                totalPoints={totalPoints}
                completedCount={completedCount}
                pointsData={pointsData}
                onCancel={(id) =>
                  cancelMutation.mutate({ taskId: id, tab: activeTab })
                }
                cancelPending={cancelMutation.isPending}
                cancelVariable={cancelMutation.variables?.taskId ?? undefined}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
