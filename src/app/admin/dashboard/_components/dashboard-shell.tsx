"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import AdminSidebar from "./admin-sidebar";
import ProfileDropdown from "@/src/components/ui/profile-dropdown";

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [sidebarOpen]);

  const labels: Record<string, string> = {
    "/admin/dashboard": "Overview",
    "/admin/dashboard/events": "Manage Events",
    "/admin/dashboard/records": "Manage Records",
    "/admin/dashboard/tasks": "Manage Tasks",
    "/admin/dashboard/submissions": "User Submissions",
    "/admin/dashboard/fraud": "Fraud Detection",
    "/admin/dashboard/analytics": "Analytics",
    "/admin/dashboard/partners": "Our Work",
    "/admin/dashboard/team-members": "Team Members",
    "/admin/dashboard/about": "About Content",
    "/admin/tickets/scanner": "Ticket Scanner",
    "/admin/profile": "Profile",
  };

  const activeLabel = Object.entries(labels).find(([path]) =>
    path === "/admin/dashboard" ? pathname === path : pathname.startsWith(path),
  )?.[1] ?? "Dashboard";

  return (
    <div className="min-h-screen bg-zinc-50 flex font-sans selection:bg-[#FACC15] selection:text-black">
      <AdminSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="flex-1 lg:ml-72 p-4 md:p-8 lg:p-12 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#FACC15]/5 rounded-full blur-[120px] -z-10" />

        <header className="flex justify-between items-center mb-8 lg:mb-16">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden w-10 h-10 rounded-xl bg-white border border-black/5 flex items-center justify-center shadow-sm hover:shadow-md transition-all"
              aria-label="Open sidebar"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div>
              <h1 className="text-2xl lg:text-4xl font-black uppercase tracking-tighter mb-1 lg:mb-2">
                {activeLabel}
              </h1>
              <p className="text-[10px] lg:text-sm font-bold text-zinc-400 uppercase tracking-widest">
                Arbitrary Agency / Control Panel
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 lg:gap-4">
            <button
              className="hidden lg:flex w-12 h-12 rounded-2xl bg-white border border-black/5 items-center justify-center shadow-sm hover:shadow-md transition-all"
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
