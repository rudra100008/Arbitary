"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

const menuItems: { label: string; href: string | null }[] = [
  { label: "Overview", href: "/admin/dashboard" },
  { label: "Manage Events", href: "/admin/dashboard/events" },
  { label: "Ticket Scanner", href: "/admin/tickets/scanner" },
  { label: "Manage Tasks", href: "/admin/dashboard/tasks" },
  { label: "User Submissions", href: "/admin/dashboard/submissions" },
  { label: "Fraud Detection", href: "/admin/dashboard/fraud" },
  { label: "Analytics", href: "/admin/dashboard/analytics" },
  { label: "Our Work", href: null },
  { label: "Team Members", href: null },
  { label: "Settings", href: null },
];

const AdminSidebar = () => {
  const pathname = usePathname();

  return (
    <aside className="w-72 bg-black text-white flex flex-col p-8 fixed inset-y-0 left-0 z-30 shadow-2xl">
      <div className="mb-12">
        <h2 className="text-2xl font-black tracking-tighter uppercase">
          ARBITARY<span className="text-[#FACC15]">.</span>
        </h2>
        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-1">
          Command Center
        </p>
      </div>
      <nav className="flex-1 space-y-2">
        {menuItems.map((item) => {
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

          const isActive =
            item.href === "/admin/dashboard"
              ? pathname === item.href
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.label}
              href={item.href}
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
      <button
        onClick={() => signOut({ callbackUrl: "/admin/login" })}
        className="mt-auto flex items-center px-6 py-4 rounded-2xl text-red-500 hover:bg-red-500/10 transition-all font-bold text-sm uppercase tracking-wider"
      >
        Logout
      </button>
    </aside>
  );
};

export default AdminSidebar;
