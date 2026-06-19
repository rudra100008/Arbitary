"use client";

import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useEffect, useState, useMemo } from "react";

import ProfileSidebar from "./_components/profile-sidebar";
import ProfileTab from "./_components/profile-tab";
import SettingsTab from "./_components/settings-tab";
import TasksTab from "./_components/tasks-tab";
import ReferralTab from "./_components/referral-tab";
import { toast } from "sonner";
import { useMutation, useQuery } from "@tanstack/react-query";

type Tab = "profile" | "settings" | "tasks" | "referrals";

const TAB_TITLES: Record<Tab, string> = {
  profile: "Profile",
  settings: "Settings",
  tasks: "Tasks",
  referrals: "Referrals",
};

// Map the API response (Title Case userStatus, points, completedAt)
// to the TasksTab Task interface (lowercase status, points, completedAt).
interface ApiTask {
  id: number;
  title: string;
  points: number;
  userStatus: string | null;
  completedAt: string | null;
  taskType: string | null;
  platform: string | null;
  difficulty: string | null;
}

interface ProfileTask {
  id: number;
  title: string;
  points: number;
  status: string;
  completedAt: string | null;
  taskType: string | null;
  platform: string | null;
  difficulty: string;
}

export default function ProfilePage() {
  const { data: session, status, update } = useSession();
  const [activeTab, setActiveTab] = useState<Tab>("profile");
  const [isEditing, setIsEditing] = useState(false);

  // Edit form state
  const [form, setForm] = useState({
    name: session?.user?.name || "",
    phone: "",
    bio: "",
    location: "",
  });

  const user = session?.user;
  const initials = user?.name?.[0]?.toUpperCase() || "U";

  // ── Read ?tab= query param to auto-select a tab on mount ──
  const searchParams = useSearchParams();
  useEffect(() => {
    const tab = searchParams.get("tab") as Tab | null;
    const validTabs: Tab[] = ["profile", "settings", "tasks", "referrals"];
    if (tab && validTabs.includes(tab)) {
      setActiveTab(tab);
    }
  }, []);

  // ── Fetch the logged-in user's points and total completed tasks from DB ──
  const { data: pointsData } = useQuery<{
    points: number;
    completedTasksCount: number;
    currentStreak: number;
    tier: string;
  }>({
    queryKey: ["user-points"],
    queryFn: async () => {
      const res = await fetch("/api/user/points");
      if (!res.ok) throw new Error("Failed to fetch points");
      return res.json();
    },
    enabled: !!session?.user,
  });
  const totalPoints = pointsData?.points ?? 0;
  const totalCompleted = pointsData?.completedTasksCount ?? 0;
  const currentStreak = pointsData?.currentStreak ?? 0;
  const tier = pointsData?.tier ?? "bronze";

  // ── Fetch the logged-in user's tasks ──
  const { data: apiTasksData, isLoading: tasksLoading } = useQuery<{
    tasks: ApiTask[];
  }>({
    queryKey: ["profile-user-tasks"],
    queryFn: async () => {
      const res = await fetch("/api/user/tasks?limit=100");
      if (!res.ok) throw new Error("Failed to fetch tasks");
      return res.json();
    },
    enabled: !!session?.user,
  });
  const apiTasks = apiTasksData?.tasks ?? [];

  // Filter to tasks the user has actually interacted with and map to ProfileTask
  const tasks: ProfileTask[] = useMemo(
    () =>
      apiTasks
        .filter((t) => t.userStatus !== null) // only tasks the user picked up
        .map((t) => ({
          id: t.id,
          title: t.title,
          points: t.points,
          status: (t.userStatus ?? "").toLowerCase(),
          completedAt: t.completedAt,
          taskType: t.taskType,
          platform: t.platform,
          difficulty: t.difficulty ?? "easy",
        })),
    [apiTasks],
  );

  // ── Fetch tasks completed today ──
  const { data: todayTasksData } = useQuery<{ count: number }>({
    queryKey: ["tasks-completed-today"],
    queryFn: async () => {
      const res = await fetch("/api/user/tasks/completed-today");
      if (!res.ok) throw new Error("Failed to fetch today's tasks");
      return res.json();
    },
    enabled: !!session?.user,
  });
  const completedToday = todayTasksData?.count ?? 0;

  // Use the database counter for total completed tasks (more accurate)
  const completedCount = totalCompleted;

  useEffect(() => {
    document.title = `${TAB_TITLES[activeTab]} | Arbitrary`;
  }, [activeTab]);

  useEffect(() => {
    if (session?.user) {
      setForm({
        name: session?.user.name ?? "",
        phone: session?.user.phoneNumber ?? "",
        bio: session?.user?.bio ?? "",
        location: session?.user?.location ?? "",
      });
    }
  }, [session?.user]);

  const updateProfileMutation = useMutation({
    mutationFn: async (profileData: typeof form) => {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profileData),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Profile updated!");
      setIsEditing(false);
      update();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleSave = () => updateProfileMutation.mutate(form);

  const handleDiscard = () => {
    setForm({
      name: session?.user?.name ?? "",
      phone: session?.user?.phoneNumber ?? "",
      bio: session?.user?.bio ?? "",
      location: session?.user?.location ?? "",
    });
    setIsEditing(false);
    updateProfileMutation.reset();
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gray-200 border-t-slate-900 rounded-full animate-spin" />
      </div>
    );
  }
  return (
    <div className="min-h-screen pt-24 bg-slate-50 selection:bg-[#FACC15] selection:text-black">
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .fade-in-up { animation: fadeInUp 0.3s ease-out forwards; }
      `}</style>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6">
          {/* ── Left sidebar ── */}
          <ProfileSidebar
            user={user}
            initials={initials}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            totalPoints={totalPoints}
            completedCount={completedCount}
            completedToday={completedToday}
            totalTasks={tasks.length}
            tier={tier}
            currentStreak={currentStreak}
          />

          {/* ── Right content ── */}
          <div className="fade-in-up" key={activeTab}>
            {activeTab === "profile" && (
              <ProfileTab
                user={user}
                isEditing={isEditing}
                isSaving={updateProfileMutation.isPending}
                form={form}
                onFormChange={setForm}
                onEditToggle={() =>
                  isEditing ? handleSave() : setIsEditing(true)
                }
                onDiscard={handleDiscard}
                saveError={updateProfileMutation.error?.message ?? null}
              />
            )}

            {activeTab === "settings" && (
              <SettingsTab
                userEmail={user?.email}
                provider={user?.provider}
                googleId={user?.googleId}
                facebookId={session?.user?.facebookId}
                instagramUsername={session?.user?.instagramUsername}
                onUpdateSession={update}
              />
            )}

            {activeTab === "tasks" && (
              <TasksTab
                tasks={tasks}
                totalPoints={totalPoints}
                completedCount={completedCount}
                isLoading={tasksLoading}
              />
            )}

            {activeTab === "referrals" && <ReferralTab />}
          </div>
        </div>
      </div>
    </div>
  );
}
