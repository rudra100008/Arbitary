"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface AdminSidebarProps {
  menuItems?: { label: string }[];
  activeTab?: string;
  isCreatingEvent?: boolean;
  onTabChange?: (tab: string) => void;
  isOpen?: boolean;
  onClose?: () => void;
}

const sidebarGroups = [
  {
    heading: "General",
    items: [
      {
        label: "Overview",
        href: "/admin/dashboard",
        icon: (
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
            />
          </svg>
        ),
      },
      {
        label: "Analytics",
        href: "/admin/dashboard/analytics",
        icon: (
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
        ),
      },
      // TEMPORARILY HIDDEN (client request): Ticket Scanner nav entry.
      // Do not delete — feature, route, and APIs remain fully intact and
      // reachable directly at /admin/tickets/scanner; only this sidebar
      // link is hidden. Restore by uncommenting this block.
      // {
      //   label: "Ticket Scanner",
      //   href: "/admin/tickets/scanner",
      //   icon: (
      //     <svg
      //       className="w-4 h-4"
      //       fill="none"
      //       stroke="currentColor"
      //       viewBox="0 0 24 24"
      //     >
      //       <path
      //         strokeLinecap="round"
      //         strokeLinejoin="round"
      //         strokeWidth={2}
      //         d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
      //       />
      //     </svg>
      //   ),
      // },
    ],
  },
  {
    heading: "Manage",
    items: [
      {
        label: "Manage Events",
        href: "/admin/dashboard/events",
        icon: (
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        ),
      },
      {
        label: "Manage Records",
        href: "/admin/dashboard/records",
        icon: (
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        ),
      },
      {
        label: "Manage Tasks",
        href: "/admin/dashboard/tasks",
        icon: (
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
            />
          </svg>
        ),
      },
      {
        label: "Manage Users",
        href: "/admin/dashboard/users",
        icon: (
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 20h5v-1a4 4 0 00-3-3.87M9 20H4v-1a4 4 0 014-4h2a4 4 0 014 4v1zm5.5-9a3.5 3.5 0 100-7 3.5 3.5 0 000 7zm-6-2a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
        ),
      },
      {
        label: "User Submissions",
        href: "/admin/dashboard/submissions",
        icon: (
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
            />
          </svg>
        ),
      },
      {
        label: "Participants",
        href: "/admin/dashboard/participants",
        icon: (
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <circle cx="12" cy="4" r="2" strokeWidth={2} />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 10c1.5-1.5 5-1.5 6 0l2 6-3 1-1-3-1 3-3-1zM9 17l-1.5 4M15 17l1.5 4"
            />
          </svg>
        ),
      },
      {
        label: "Fraud Detection",
        href: "/admin/dashboard/fraud",
        icon: (
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
            />
          </svg>
        ),
      },
    ],
  },
  {
    heading: "Company",
    items: [
      {
        label: "Our Work",
        href: "/admin/dashboard/partners",
        icon: (
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
        ),
      },
      {
        label: "Team Members",
        href: "/admin/dashboard/team-members",
        icon: (
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
        ),
      },
      {
        label: "About Content",
        href: "/admin/dashboard/about",
        icon: (
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        ),
      },
      {
        label: "Live Stream",
        href: "/admin/dashboard/live-stream",
        icon: (
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z"
            />
          </svg>
        ),
      },
      {
        label: "Settings",
        href: "/admin/dashboard/settings",

        icon: (
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
        ),
      },
    ],
  },
];

const AdminSidebar = ({
  activeTab,
  onTabChange,
  isOpen,
  onClose,
}: AdminSidebarProps) => {
  const pathname = usePathname();

  const renderItem = (item: (typeof sidebarGroups)[0]["items"][0]) => {
    const isDisabled = !item.href;

    const isActive =
      !isDisabled &&
      (activeTab
        ? activeTab === item.label
        : item.href === "/admin/dashboard"
          ? pathname === item.href
          : pathname.startsWith(item.href!));

    const baseClass = `w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200`;

    if (isDisabled) {
      return (
        <div
          key={item.label}
          className={`${baseClass} text-zinc-700 cursor-not-allowed`}
        >
          <span className="opacity-40">{item.icon}</span>
          {item.label}
          <span className="ml-auto text-[9px] font-semibold bg-zinc-800 text-zinc-600 px-1.5 py-0.5 rounded tracking-widest">
            SOON
          </span>
        </div>
      );
    }

    const activeClass = "bg-[#FACC15] text-black shadow-lg shadow-[#FACC15]/20";
    const inactiveClass = "text-zinc-500 hover:text-white hover:bg-white/5";

    if (onTabChange) {
      return (
        <button
          key={item.label}
          onClick={() => {
            onTabChange(item.label);
            onClose?.();
          }}
          className={`${baseClass} ${isActive ? activeClass : inactiveClass}`}
        >
          <span>{item.icon}</span>
          {item.label}
        </button>
      );
    }

    return (
      <Link
        key={item.label}
        href={item.href!}
        onClick={onClose}
        className={`${baseClass} ${isActive ? activeClass : inactiveClass}`}
      >
        <span>{item.icon}</span>
        {item.label}
      </Link>
    );
  };

  return (
    <>
      <div
        className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-30 lg:hidden transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />

      <aside
        className={`w-64 bg-zinc-950 border-r border-white/5 text-white flex flex-col fixed inset-y-0 left-0 z-40 transition-transform duration-300 lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-6 py-6 border-b border-white/5">
          <div>
            <h2 className="text-xl font-black tracking-tighter uppercase leading-none">
              ARBITRARY<span className="text-[#FACC15]">.</span>
            </h2>
            <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest mt-1">
              Command Center
            </p>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors"
            aria-label="Close sidebar"
          >
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6 [&::-webkit-scrollbar]:w-0 [scrollbar-width:none] [-ms-overflow-style:none]">
          {sidebarGroups.map((group) => (
            <div key={group.heading}>
              <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest px-4 mb-2">
                {group.heading}
              </p>
              <div className="space-y-0.5">{group.items.map(renderItem)}</div>
            </div>
          ))}
        </nav>

        <div className="px-3 py-4 border-t border-white/5">
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 hover:bg-white/[0.08] transition-colors cursor-pointer">
            <div className="w-8 h-8 rounded-lg bg-[#FACC15] flex items-center justify-center text-black font-black text-xs flex-shrink-0">
              AD
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-white truncate">Admin</p>
              <p className="text-[10px] text-zinc-500 truncate">
                admin@arbitrary.com
              </p>
            </div>
            <svg
              className="w-3.5 h-3.5 text-zinc-600 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 9l4-4 4 4m0 6l-4 4-4-4"
              />
            </svg>
          </div>
        </div>
      </aside>
    </>
  );
};

export default AdminSidebar;
