"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

interface AdminSidebarProps {
  menuItems?: { label: string }[];
  activeTab?: string;
  isCreatingEvent?: boolean;
  onTabChange?: (tab: string) => void;
  isOpen?: boolean;
  onClose?: () => void;
}

const sidebarItems: { label: string; href: string | null }[] = [
  { label: "Overview", href: "/admin/dashboard" },
  { label: "Manage Events", href: "/admin/dashboard/events" },
  { label: "Manage Records", href: "/admin/dashboard/records" },
  { label: "Ticket Scanner", href: "/admin/tickets/scanner" },
  { label: "Manage Tasks", href: "/admin/dashboard/tasks" },
  { label: "User Submissions", href: "/admin/dashboard/submissions" },
  { label: "Fraud Detection", href: "/admin/dashboard/fraud" },
  { label: "Analytics", href: "/admin/dashboard/analytics" },
  { label: "Our Work", href: "/admin/dashboard/partners" },
  { label: "Team Members", href: "/admin/dashboard/team-members" },
  { label: "About Content", href: "/admin/dashboard/about" },
  { label: "Settings", href: null },
];

const AdminSidebar = ({ activeTab, onTabChange, isOpen, onClose }: AdminSidebarProps) => {
  const pathname = usePathname();

  return (
    <>
      <div
        className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-30 lg:hidden transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />
      <aside
        className={`w-72 bg-black text-white flex flex-col p-8 fixed inset-y-0 left-0 z-40 shadow-2xl transition-transform duration-300 lg:translate-x-0 max-h-screen overflow-y-hidden hover:overflow-y-auto [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-zinc-700 [&::-webkit-scrollbar-thumb]:rounded-full [scrollbar-width:thin] [scrollbar-color:#52525b_transparent] ${
          isOpen ? "translate-x-0 overflow-y-auto" : "-translate-x-full"
        }`}
      >
        <div className="flex items-start justify-between mb-10">
          <div>
            <h2 className="text-2xl font-black tracking-tighter uppercase">
              ARBITRARY<span className="text-[#FACC15]">.</span>
            </h2>
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-1">
              Command Center
            </p>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
            aria-label="Close sidebar"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <nav className="flex-1 space-y-2 overflow-y-auto">
          {sidebarItems.map((item) => {
            if (!item.href) {
              return (
                <div
                  key={item.label}
                  className="w-full flex items-center px-6 py-4 rounded-2xl text-zinc-700 font-bold text-sm uppercase tracking-wider cursor-not-allowed"
                >
                  {item.label}
                </div>
              );
            }

            const isActive = activeTab
              ? activeTab === item.label
              : item.href === "/admin/dashboard"
                ? pathname === item.href
                : pathname.startsWith(item.href);

            if (onTabChange) {
              return (
                <button
                  key={item.label}
                  onClick={() => {
                    onTabChange(item.label);
                    onClose?.();
                  }}
                  className={`w-full flex items-center px-6 py-4 rounded-2xl transition-all duration-300 font-bold text-sm uppercase tracking-wider ${
                    isActive
                      ? "bg-[#FACC15] text-black shadow-lg shadow-[#FACC15]/20"
                      : "text-zinc-500 hover:text-white hover:bg-white/5"
                  }`}
                >
                  {item.label}
                </button>
              );
            }

            return (
              <Link
                key={item.label}
                href={item.href}
                onClick={onClose}
                className={`w-full flex items-center px-6 py-4 rounded-2xl transition-all duration-300 font-bold text-sm uppercase tracking-wider ${
                  isActive
                    ? "bg-[#FACC15] text-black shadow-lg shadow-[#FACC15]/20"
                    : "text-zinc-500 hover:text-white hover:bg-white/5"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
};

export default AdminSidebar;
