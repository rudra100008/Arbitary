"use client";

import { useEffect, useCallback, useRef, useReducer, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  CheckCircle,
  XCircle,
  Users,
  Eye,
} from "lucide-react";

interface AdminUser {
  id: number;
  name: string | null;
  email: string;
  role: string;
  points: number;
  completedTasksCount: number;
  isVerified: boolean;
  isFlagged: boolean;
  createdAt: string | null;
  lastLoginAt: string | null;
  provider: string;
}

interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "Never";
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffSec = Math.floor((now - then) / 1000);
  if (diffSec < 60) return "Just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 30) return `${diffDay}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function getInitials(name: string | null, email: string): string {
  if (name) return name.substring(0, 2).toUpperCase();
  return email.substring(0, 2).toUpperCase();
}

type UsersState = { users: AdminUser[]; pagination: Pagination | null; loading: boolean };
type UsersAction =
  | { type: "FETCH_START" }
  | { type: "FETCH_SUCCESS"; users: AdminUser[]; pagination: Pagination }
  | { type: "FETCH_ERROR" };

function usersReducer(state: UsersState, action: UsersAction): UsersState {
  switch (action.type) {
    case "FETCH_START":
      return { ...state, loading: true };
    case "FETCH_SUCCESS":
      return { users: action.users, pagination: action.pagination, loading: false };
    case "FETCH_ERROR":
      return { ...state, loading: false };
  }
}

export default function AdminUsersPage() {
  const router = useRouter();
  const [state, dispatch] = useReducer(usersReducer, { users: [], pagination: null, loading: true });
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [role, setRole] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchUsers = useCallback(async (q: string, p: number, r: string) => {
    dispatch({ type: "FETCH_START" });
    try {
      const params = new URLSearchParams({ page: String(p) });
      if (q) params.set("search", q);
      if (r) params.set("role", r);
      const res = await fetch(`/api/admin/users?${params}`);
      const data = await res.json();
      if (res.ok) {
        dispatch({ type: "FETCH_SUCCESS", users: data.users, pagination: data.pagination });
      } else {
        dispatch({ type: "FETCH_ERROR" });
      }
    } catch {
      // ignore — table will keep showing last-known data
    }
  }, []);

  useEffect(() => {
    fetchUsers(search, page, role);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, role]);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchUsers(value, 1, role);
    }, 350);
  };

  const handleRoleChange = (r: string) => {
    setRole(r);
    setPage(1);
  };

  const totalUsers = state.pagination?.total ?? 0;

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight">
            User Management
          </h1>
          <p className="text-sm text-zinc-400 font-medium mt-0.5">
            {state.pagination ? `${totalUsers.toLocaleString()} total users` : "Loading…"}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {(["", "user", "admin"] as const).map((r) => (
            <button
              key={r || "all"}
              onClick={() => handleRoleChange(r)}
              className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full transition-colors ${
                role === r
                  ? "bg-black text-[#FACC15]"
                  : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200"
              }`}
            >
              {r === "" ? "All" : r === "user" ? "Users" : "Admins"}
            </button>
          ))}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SummaryCard
          icon={<Users className="w-4 h-4" />}
          label="Total Users"
          value={totalUsers.toLocaleString()}
        />
        <SummaryCard
          icon={<CheckCircle className="w-4 h-4 text-green-500" />}
          label="Verified"
          value={state.users.filter((u) => u.isVerified).length.toLocaleString()}
          sub="this page"
        />
        <SummaryCard
          icon={<ShieldAlert className="w-4 h-4 text-red-500" />}
          label="Flagged"
          value={state.users.filter((u) => u.isFlagged).length.toLocaleString()}
          sub="this page"
          warn
        />
        <SummaryCard
          icon={<XCircle className="w-4 h-4 text-zinc-400" />}
          label="Unverified"
          value={state.users.filter((u) => !u.isVerified).length.toLocaleString()}
          sub="this page"
        />
      </div>

      {/* Search + Table */}
      <div className="bg-white rounded-[2rem] border border-black/5 shadow-sm overflow-hidden">
        <div className="p-4 md:p-6 border-b border-black/5">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search by name or email…"
              className="w-full pl-9 pr-4 py-2.5 text-sm bg-zinc-50 border border-black/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FACC15]/30 text-zinc-800 placeholder:text-zinc-400"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-black/5">
                <th className="text-left text-[10px] font-black uppercase tracking-[0.15em] text-zinc-400 px-6 py-3">
                  User
                </th>
                <th className="text-left text-[10px] font-black uppercase tracking-[0.15em] text-zinc-400 px-4 py-3 hidden md:table-cell">
                  Role
                </th>
                <th className="text-right text-[10px] font-black uppercase tracking-[0.15em] text-zinc-400 px-4 py-3">
                  Points
                </th>
                <th className="text-right text-[10px] font-black uppercase tracking-[0.15em] text-zinc-400 px-4 py-3 hidden sm:table-cell">
                  Tasks
                </th>
                <th className="text-left text-[10px] font-black uppercase tracking-[0.15em] text-zinc-400 px-4 py-3 hidden lg:table-cell">
                  Joined
                </th>
                <th className="text-left text-[10px] font-black uppercase tracking-[0.15em] text-zinc-400 px-4 py-3 hidden lg:table-cell">
                  Last Login
                </th>
                <th className="text-center text-[10px] font-black uppercase tracking-[0.15em] text-zinc-400 px-4 py-3">
                  Status
                </th>
                <th className="text-right text-[10px] font-black uppercase tracking-[0.15em] text-zinc-400 px-6 py-3">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {state.loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    {[...Array(8)].map((_, j) => (
                      <td key={j} className="px-4 py-4">
                        <div className="h-3 bg-zinc-100 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : state.users.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-16 text-sm text-zinc-400">
                    {search ? "No users match that search." : "No users found."}
                  </td>
                </tr>
              ) : (
                state.users.map((user) => (
                  <tr key={user.id} className="hover:bg-zinc-50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#FACC15] flex items-center justify-center shrink-0">
                          <span className="text-black font-black text-xs">
                            {getInitials(user.name, user.email)}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-xs text-zinc-800 truncate">
                            {user.name ?? (
                              <span className="text-zinc-400 italic">No name</span>
                            )}
                          </p>
                          <p className="text-[10px] text-zinc-400 truncate">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 hidden md:table-cell">
                      <span
                        className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-full ${
                          user.role.toLowerCase() === "admin" ||
                          user.role.toLowerCase() === "super_admin"
                            ? "bg-black text-[#FACC15]"
                            : "bg-zinc-100 text-zinc-500"
                        }`}
                      >
                        {user.role}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <span className="font-black text-sm">{user.points.toLocaleString()}</span>
                    </td>
                    <td className="px-4 py-4 text-right hidden sm:table-cell">
                      <span className="text-xs font-semibold text-zinc-500">
                        {user.completedTasksCount}
                      </span>
                    </td>
                    <td className="px-4 py-4 hidden lg:table-cell">
                      <span className="text-xs text-zinc-400">
                        {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "—"}
                      </span>
                    </td>
                    <td className="px-4 py-4 hidden lg:table-cell">
                      <span className="text-xs text-zinc-400">{timeAgo(user.lastLoginAt)}</span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-center gap-1.5">
                        {user.isVerified ? (
                          <span title="Verified" className="text-green-500">
                            <CheckCircle className="w-3.5 h-3.5" />
                          </span>
                        ) : (
                          <span title="Unverified" className="text-zinc-300">
                            <XCircle className="w-3.5 h-3.5" />
                          </span>
                        )}
                        {user.isFlagged && (
                          <span title="Flagged for fraud review" className="text-red-500">
                            <ShieldAlert className="w-3.5 h-3.5" />
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => router.push(`/admin/dashboard/users/${user.id}`)}
                        className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-zinc-500 bg-zinc-100 px-3 py-1.5 rounded-full hover:bg-black hover:text-[#FACC15] transition-colors"
                      >
                        <Eye className="w-3 h-3" />
                        View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {state.pagination && state.pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-black/5">
            <p className="text-[10px] font-medium text-zinc-400">
              Page {state.pagination.page} of {state.pagination.totalPages} ·{" "}
              {state.pagination.total.toLocaleString()} users
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-1.5 rounded-lg border border-black/10 text-zinc-500 hover:bg-zinc-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: Math.min(5, state.pagination!.totalPages) }, (_, i) => {
                const p =
                  Math.max(1, Math.min(state.pagination!.totalPages - 4, page - 2)) + i;
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`w-8 h-8 text-xs font-bold rounded-lg transition-colors ${
                      p === page
                        ? "bg-black text-[#FACC15]"
                        : "border border-black/10 text-zinc-500 hover:bg-zinc-50"
                    }`}
                  >
                    {p}
                  </button>
                );
              })}
              <button
                onClick={() => setPage((p) => Math.min(state.pagination!.totalPages, p + 1))}
                disabled={page >= state.pagination!.totalPages}
                className="p-1.5 rounded-lg border border-black/10 text-zinc-500 hover:bg-zinc-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  sub,
  warn,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  warn?: boolean;
}) {
  return (
    <div className="bg-zinc-50 rounded-[1.5rem] p-4 md:p-6">
      <div className="flex items-center gap-2 mb-2">
        <span className={warn ? "text-red-500" : "text-zinc-400"}>{icon}</span>
        <p className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-400">
          {label}
        </p>
      </div>
      <h3 className="text-2xl font-black">{value}</h3>
      {sub && <p className="text-[10px] text-zinc-400 font-medium mt-0.5">{sub}</p>}
    </div>
  );
}
