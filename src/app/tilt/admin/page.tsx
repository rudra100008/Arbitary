"use client";

import { useState, useEffect, useMemo } from "react";
import {
  MIN_DAILY_REWARD_TARGET,
  MAX_DAILY_REWARD_TARGET,
} from "@/src/lib/tilt/reward-config";

interface OutletRow {
  id: number | null;
  name: string | null;
  email: string;
  role: string | null;
  address: string | null;
  scanCount: number;
  submissionCount: number;
  dailyRewardTarget: number | null;
  operatingHoursStart: string | null;
  operatingHoursEnd: string | null;
  createdAt: Date | null;
  status: "active" | "invited";
}

function toTimeInput(value: string | null): string {
  if (!value) return "";
  return value.slice(0, 5);
}

export default function TiltAdminPage() {
  const [users, setUsers] = useState<OutletRow[]>([]);
  const [totalSubmissions, setTotalSubmissions] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<{
    type: "invite" | "user";
    id: number;
    email: string;
  } | null>(null);

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteError, setInviteError] = useState("");
  const [isInviting, setIsInviting] = useState(false);
  const [outletTargetInputs, setOutletTargetInputs] = useState<Record<number, string>>({});
  const [outletStartInputs, setOutletStartInputs] = useState<Record<number, string>>({});
  const [outletEndInputs, setOutletEndInputs] = useState<Record<number, string>>({});
  const [savingOutletId, setSavingOutletId] = useState<number | null>(null);
  const [outletTargetError, setOutletTargetError] = useState<string | null>(null);
  const [outletTargetMessage, setOutletTargetMessage] = useState<string | null>(null);

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/tilt/admin/users");
      if (!res.ok) return;
      const data = await res.json();
      setUsers(data.users ?? []);
      const nextInputs: Record<number, string> = {};
      const nextStartInputs: Record<number, string> = {};
      const nextEndInputs: Record<number, string> = {};
      for (const user of (data.users ?? []) as OutletRow[]) {
        if (user.status === "active" && user.id) {
          if (typeof user.dailyRewardTarget === "number") {
            nextInputs[user.id] = String(user.dailyRewardTarget);
          }
          nextStartInputs[user.id] = toTimeInput(user.operatingHoursStart);
          nextEndInputs[user.id] = toTimeInput(user.operatingHoursEnd);
        }
      }
      setOutletTargetInputs(nextInputs);
      setOutletStartInputs(nextStartInputs);
      setOutletEndInputs(nextEndInputs);
      if (typeof data.totalSubmissions === "number") {
        setTotalSubmissions(data.totalSubmissions);
      }
    } catch {
      // silent
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    document.title = "Outlets | Tilt Your Music";
    void loadUsers();
  }, []);

  const handleSaveOutletTarget = async (outletId: number) => {
    setOutletTargetError(null);
    setOutletTargetMessage(null);

    const parsedTarget = Number.parseInt(outletTargetInputs[outletId] ?? "", 10);
    if (
      Number.isNaN(parsedTarget) ||
      parsedTarget < MIN_DAILY_REWARD_TARGET ||
      parsedTarget > MAX_DAILY_REWARD_TARGET
    ) {
      setOutletTargetError(
        `Target must be an integer between ${MIN_DAILY_REWARD_TARGET} and ${MAX_DAILY_REWARD_TARGET}.`,
      );
      return;
    }

    setSavingOutletId(outletId);
    try {
      const res = await fetch("/api/tilt/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outletId: String(outletId),
          target: parsedTarget,
          operatingHoursStart: outletStartInputs[outletId],
          operatingHoursEnd: outletEndInputs[outletId],
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        dailyRewardTarget?: number;
        operatingHoursStart?: string | null;
        operatingHoursEnd?: string | null;
      };

      if (!res.ok) {
        throw new Error(data.error || "Failed to update outlet target");
      }

      const nextTarget = typeof data.dailyRewardTarget === "number" ? data.dailyRewardTarget : parsedTarget;
      setUsers((prev) =>
        prev.map((u) =>
          u.id === outletId
            ? {
                ...u,
                dailyRewardTarget: nextTarget,
                operatingHoursStart:
                  typeof data.operatingHoursStart === "string"
                    ? data.operatingHoursStart
                    : u.operatingHoursStart,
                operatingHoursEnd:
                  typeof data.operatingHoursEnd === "string"
                    ? data.operatingHoursEnd
                    : u.operatingHoursEnd,
              }
            : u,
        ),
      );
      setOutletTargetInputs((prev) => ({ ...prev, [outletId]: String(nextTarget) }));
      if (typeof data.operatingHoursStart === "string") {
        setOutletStartInputs((prev) => ({
          ...prev,
          [outletId]: toTimeInput(data.operatingHoursStart ?? null),
        }));
      }
      if (typeof data.operatingHoursEnd === "string") {
        setOutletEndInputs((prev) => ({
          ...prev,
          [outletId]: toTimeInput(data.operatingHoursEnd ?? null),
        }));
      }
      setOutletTargetMessage("Outlet reward target updated.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update outlet target";
      setOutletTargetError(message);
    } finally {
      setSavingOutletId(null);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    const { type, id } = confirmDelete;
    setConfirmDelete(null);
    try {
      const res = await fetch("/api/tilt/admin/users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, id }),
      });
      if (res.ok) {
        await loadUsers();
      }
    } catch {
      // silent
    }
  };

  const handleInvite = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setInviteError("");

    if (!inviteEmail.trim()) {
      setInviteError("Email is required.");
      return;
    }

    setIsInviting(true);
    try {
      const res = await fetch("/api/tilt/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail }),
      });
      const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (!res.ok) {
        setInviteError(
          typeof json.error === "string" ? json.error : "Failed to invite.",
        );
        return;
      }
      setInviteEmail("");
      await loadUsers();
    } catch {
      setInviteError("Network error.");
    } finally {
      setIsInviting(false);
    }
  };

  const filtered = useMemo(() => {
    if (!search.trim()) return users;
    const q = search.toLowerCase();
    return users.filter(
      (u) =>
        (u.name && u.name.toLowerCase().includes(q)) ||
        u.email.toLowerCase().includes(q),
    );
  }, [users, search]);

  const activeCount = users.filter((u) => u.status === "active").length;
  const invitedCount = users.filter((u) => u.status === "invited").length;

  const formatDate = (d: Date | string | null) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-black uppercase tracking-tight text-white">
          Outlets
        </h1>
        <p
          className="text-sm font-medium mt-1"
          style={{ color: "rgba(255,255,255,0.35)" }}
        >
          {isLoading
            ? "Loading…"
            : `${users.length} total`}
        </p>
      </div>

      {/* Invite form */}
      <div
        className="rounded-2xl border p-6 mb-8"
        style={{
          borderColor: "rgba(200,230,60,0.1)",
          background: "rgba(255,255,255,0.02)",
        }}
      >
        <h2 className="text-sm font-black uppercase tracking-[0.18em] text-white mb-4">
          Invite outlet
        </h2>
        <form
          onSubmit={handleInvite}
          className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3"
        >
          <div className="flex-1">
            <label
              className="block mb-2 text-[10px] font-black uppercase tracking-[0.18em]"
              style={{ color: "rgba(200,230,60,0.55)" }}
            >
              Email
            </label>
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              className="tilt-input"
              placeholder="outlet@example.com"
              required
            />
          </div>
          <button
            type="submit"
            disabled={isInviting}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
            style={{ background: "#c8e63c", color: "#0e1f10" }}
          >
            {isInviting ? "Inviting…" : "Invite"}
          </button>
        </form>
        {inviteError ? (
          <p className="text-xs mt-2" style={{ color: "#fca5a5" }}>
            {inviteError}
          </p>
        ) : null}
      </div>

      {/* Stat row */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-8">
        <div
          className="rounded-xl border px-5 py-4"
          style={{
            borderColor: "rgba(200,230,60,0.1)",
            background: "rgba(255,255,255,0.02)",
          }}
        >
          <p
            className="text-[10px] font-bold uppercase tracking-[0.2em]"
            style={{ color: "rgba(200,230,60,0.45)" }}
          >
            Total
          </p>
          <p className="text-2xl font-black text-white mt-1">
            {users.length}
          </p>
        </div>
        <div
          className="rounded-xl border px-5 py-4"
          style={{
            borderColor: "rgba(200,230,60,0.1)",
            background: "rgba(255,255,255,0.02)",
          }}
        >
          <p
            className="text-[10px] font-bold uppercase tracking-[0.2em]"
            style={{ color: "rgba(200,230,60,0.45)" }}
          >
            Active
          </p>
          <p className="text-2xl font-black text-white mt-1">
            {activeCount}
          </p>
        </div>
        <div
          className="rounded-xl border px-5 py-4"
          style={{
            borderColor: "rgba(200,230,60,0.1)",
            background: "rgba(255,255,255,0.02)",
          }}
        >
          <p
            className="text-[10px] font-bold uppercase tracking-[0.2em]"
            style={{ color: "rgba(200,230,60,0.45)" }}
          >
            Invited
          </p>
          <p className="text-2xl font-black text-white mt-1">
            {invitedCount}
          </p>
        </div>
        <div
          className="rounded-xl border px-5 py-4"
          style={{
            borderColor: "rgba(200,230,60,0.1)",
            background: "rgba(255,255,255,0.02)",
          }}
        >
          <p
            className="text-[10px] font-bold uppercase tracking-[0.2em]"
            style={{ color: "rgba(200,230,60,0.45)" }}
          >
            Submissions
          </p>
          <p className="text-2xl font-black text-white mt-1">
            {totalSubmissions}
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <svg
          className="absolute left-3.5 top-1/2 -translate-y-1/2"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="rgba(200,230,60,0.3)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
        <input
          type="text"
          placeholder="Search outlets…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: "100%",
            padding: "10px 14px 10px 38px",
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(200,230,60,0.1)",
            borderRadius: "10px",
            color: "#fff",
            fontSize: "13px",
            outline: "none",
            fontFamily: "inherit",
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = "rgba(200,230,60,0.3)";
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = "rgba(200,230,60,0.1)";
          }}
        />
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "50%",
              border: "2px solid rgba(200,230,60,0.15)",
              borderTop: "2px solid #c8e63c",
              animation: "spin 0.8s linear infinite",
            }}
          />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          {search ? (
            <>
              <p
                className="text-lg font-bold"
                style={{ color: "rgba(255,255,255,0.15)" }}
              >
                No outlets match &ldquo;{search}&rdquo;
              </p>
              <p
                className="text-sm mt-2"
                style={{ color: "rgba(255,255,255,0.2)" }}
              >
                Try a different name or email
              </p>
            </>
          ) : (
            <>
              <p
                className="text-lg font-bold"
                style={{ color: "rgba(255,255,255,0.15)" }}
              >
                No outlets yet
              </p>
              <p
                className="text-sm mt-2"
                style={{ color: "rgba(255,255,255,0.2)" }}
              >
                Invite an outlet above to get started
              </p>
            </>
          )}
        </div>
      ) : (
        <div
          className="overflow-x-auto rounded-2xl border"
          style={{ borderColor: "rgba(200,230,60,0.08)" }}
        >
          <table className="w-full text-left" style={{ minWidth: "800px" }}>
            <thead>
              <tr style={{ background: "rgba(200,230,60,0.03)" }}>
                <Th>Outlet</Th>
                <Th>Email</Th>
                <Th>Address</Th>
                <Th>Scans</Th>
                <Th>Submissions</Th>
                <Th>Daily Target</Th>
                <Th>Hours</Th>
                <Th>Status</Th>
                <Th>Joined</Th>
                <Th>Actions</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr
                  key={u.email}
                  className="transition-all duration-150"
                  style={{ borderTop: "1px solid rgba(200,230,60,0.05)" }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background =
                      "rgba(200,230,60,0.03)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  <Td>
                    <span className="font-bold text-white">
                      {u.name ?? "—"}
                    </span>
                  </Td>
                  <Td>
                    <span style={{ color: "rgba(200,230,60,0.7)" }}>
                      {u.email}
                    </span>
                  </Td>
                  <Td>{u.address ?? "—"}</Td>
                  <Td>
                    <span className="font-semibold text-white">
                      {u.scanCount}
                    </span>
                  </Td>
                  <Td>
                    <span className="font-semibold text-white">
                      {u.submissionCount}
                    </span>
                  </Td>
                  <Td>
                    {u.status === "active" && u.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={MIN_DAILY_REWARD_TARGET}
                          max={MAX_DAILY_REWARD_TARGET}
                          step={1}
                          value={outletTargetInputs[u.id] ?? String(u.dailyRewardTarget ?? "")}
                          onChange={(e) =>
                            setOutletTargetInputs((prev) => ({
                              ...prev,
                              [u.id!]: e.target.value,
                            }))
                          }
                          className="tilt-input w-20 px-2 py-1 text-xs"
                          disabled={savingOutletId === u.id}
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveOutletTarget(u.id!)}
                          disabled={savingOutletId === u.id}
                          className="px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider disabled:opacity-60"
                          style={{
                            background: "rgba(200,230,60,0.18)",
                            color: "#d9f99d",
                          }}
                        >
                          {savingOutletId === u.id ? "Saving" : "Save"}
                        </button>
                      </div>
                    ) : (
                      "—"
                    )}
                  </Td>
                  <Td>
                    {u.status === "active" && u.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="time"
                          value={outletStartInputs[u.id] ?? toTimeInput(u.operatingHoursStart)}
                          onChange={(e) =>
                            setOutletStartInputs((prev) => ({
                              ...prev,
                              [u.id!]: e.target.value,
                            }))
                          }
                          className="tilt-input w-28 px-2 py-1 text-xs"
                          disabled={savingOutletId === u.id}
                        />
                        <span style={{ color: "rgba(255,255,255,0.4)" }}>to</span>
                        <input
                          type="time"
                          value={outletEndInputs[u.id] ?? toTimeInput(u.operatingHoursEnd)}
                          onChange={(e) =>
                            setOutletEndInputs((prev) => ({
                              ...prev,
                              [u.id!]: e.target.value,
                            }))
                          }
                          className="tilt-input w-28 px-2 py-1 text-xs"
                          disabled={savingOutletId === u.id}
                        />
                      </div>
                    ) : (
                      "—"
                    )}
                  </Td>
                  <Td>
                    {u.status === "active" ? (
                      <span
                        className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider"
                        style={{ color: "#c8e63c" }}
                      >
                        <span
                          style={{
                            width: "5px",
                            height: "5px",
                            borderRadius: "50%",
                            background: "#c8e63c",
                            display: "inline-block",
                            boxShadow: "0 0 6px rgba(200,230,60,0.5)",
                          }}
                        />
                        Active
                      </span>
                    ) : (
                      <span
                        className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider"
                        style={{ color: "#fbbf24" }}
                      >
                        <span
                          style={{
                            width: "5px",
                            height: "5px",
                            borderRadius: "50%",
                            background: "#fbbf24",
                            display: "inline-block",
                            boxShadow: "0 0 6px rgba(251,191,36,0.4)",
                          }}
                        />
                        Invited
                      </span>
                    )}
                  </Td>
                  <Td>{formatDate(u.createdAt)}</Td>
                  <Td>
                    {u.status === "invited" ? (
                      <button
                        type="button"
                        onClick={() =>
                          setConfirmDelete({
                            type: "invite",
                            id: u.id!,
                            email: u.email,
                          })
                        }
                        className="px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider"
                        style={{
                          background: "rgba(212,43,43,0.12)",
                          color: "#fca5a5",
                        }}
                      >
                        Revoke
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() =>
                          setConfirmDelete({
                            type: "user",
                            id: u.id!,
                            email: u.email,
                          })
                        }
                        className="px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider"
                        style={{
                          background: "rgba(212,43,43,0.12)",
                          color: "#fca5a5",
                        }}
                      >
                        Remove
                      </button>
                    )}
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Confirmation dialog */}
      {confirmDelete ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setConfirmDelete(null)}
        >
          <div
            className="rounded-2xl border p-8 max-w-sm w-full mx-4"
            style={{
              borderColor: "rgba(212,43,43,0.3)",
              background: "#0e1f10",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-white font-bold text-lg mb-2">
              {confirmDelete.type === "invite"
                ? "Revoke invite?"
                : "Remove outlet?"}
            </p>
            <p
              className="text-sm mb-6"
              style={{ color: "rgba(255,255,255,0.55)" }}
            >
              {confirmDelete.type === "invite"
                ? `This will remove the invitation for ${confirmDelete.email}.`
                : `This will permanently delete the account for ${confirmDelete.email}. This cannot be undone.`}
            </p>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setConfirmDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider"
                style={{
                  background: "rgba(255,255,255,0.08)",
                  color: "#fff",
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider"
                style={{ background: "#d42b2b", color: "#fff" }}
              >
                {confirmDelete.type === "invite" ? "Revoke" : "Remove"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {outletTargetError ? (
        <p className="text-xs mt-4" style={{ color: "#fca5a5" }}>
          {outletTargetError}
        </p>
      ) : null}

      {outletTargetMessage ? (
        <p className="text-xs mt-4" style={{ color: "#86efac" }}>
          {outletTargetMessage}
        </p>
      ) : null}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .tilt-input {
          width: 100%;
          padding: 10px 12px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(200,230,60,0.15);
          border-radius: 10px;
          color: #fff;
          font-size: 13px;
          outline: none;
          transition: border-color 0.2s, background 0.2s;
        }
        .tilt-input:focus {
          border-color: rgba(200,230,60,0.5);
          background: rgba(200,230,60,0.06);
        }
      `}</style>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th
      className="px-5 py-3.5 text-[10px] font-bold uppercase tracking-[0.2em]"
      style={{ color: "rgba(200,230,60,0.4)" }}
    >
      {children}
    </th>
  );
}

function Td({ children }: { children: React.ReactNode }) {
  return (
    <td
      className="px-5 py-4 text-sm font-medium"
      style={{ color: "rgba(255,255,255,0.6)" }}
    >
      {children}
    </td>
  );
}
