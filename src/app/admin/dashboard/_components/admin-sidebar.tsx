"use client";

import { signOut } from "next-auth/react";

interface AdminSidebarProps {
  menuItems: { label: string }[];
  activeTab: string;
  isCreatingEvent: boolean;
  onTabChange: (tab: string) => void;
}

const AdminSidebar = ({
  menuItems,
  activeTab,
  isCreatingEvent,
  onTabChange,
}: AdminSidebarProps) => (
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
      {menuItems.map((item) => (
        <button
          key={item.label}
          onClick={() => onTabChange(item.label)}
          className={`w-full flex items-center px-6 py-4 rounded-2xl transition-all duration-300 font-bold text-sm uppercase tracking-wider ${
            activeTab === item.label && !isCreatingEvent
              ? "bg-[#FACC15] text-black shadow-lg shadow-[#FACC15]/20"
              : "text-zinc-500 hover:text-white hover:bg-white/5"
          }`}
        >
          {item.label}
        </button>
      ))}
    </nav>
    <button
      onClick={() => signOut({ callbackUrl: "/admin/login" })}
      className="mt-auto flex items-center px-6 py-4 rounded-2xl text-red-500 hover:bg-red-500/10 transition-all font-bold text-sm uppercase tracking-wider"
    >
      Logout
    </button>
  </aside>
);

export default AdminSidebar;
