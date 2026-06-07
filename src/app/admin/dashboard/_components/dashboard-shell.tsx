"use client";

import { usePathname } from "next/navigation";
import AdminSidebar from "./admin-sidebar";
import ProfileDropdown from "@/src/components/ui/profile-dropdown";

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const labels: Record<string, string> = {
    "/admin/dashboard": "Overview",
    "/admin/dashboard/events": "Manage Events",
    "/admin/dashboard/tasks": "Manage Tasks",
    "/admin/dashboard/submissions": "User Submissions",
    "/admin/dashboard/fraud": "Fraud Detection",
    "/admin/dashboard/analytics": "Analytics",
  };

  const activeLabel = Object.entries(labels).find(([path]) =>
    path === "/admin/dashboard" ? pathname === path : pathname.startsWith(path),
  )?.[1] ?? "Dashboard";

  return (
    <div className="min-h-screen bg-zinc-50 flex font-sans selection:bg-[#FACC15] selection:text-black">
      <AdminSidebar />

      <main className="flex-1 ml-72 p-12 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#FACC15]/5 rounded-full blur-[120px] -z-10" />

        <header className="flex justify-between items-center mb-16">
          <div>
            <h1 className="text-4xl font-black uppercase tracking-tighter mb-2">
              {activeLabel}
            </h1>
            <p className="text-sm font-bold text-zinc-400 uppercase tracking-widest">
              Arbitary Agency / Control Panel
            </p>
          </div>
          <div className="flex items-center gap-4">
            <button
              className="w-12 h-12 rounded-2xl bg-white border border-black/5 flex items-center justify-center shadow-sm hover:shadow-md transition-all"
              aria-label="Notifications"
            >
              🔔
            </button>
            <div className="flex items-center justify-center">
              <ProfileDropdown redirectUrl="/admin/login" />
            </div>
          </div>
        </header>

        {children}
      </main>
    </div>
  );
}
