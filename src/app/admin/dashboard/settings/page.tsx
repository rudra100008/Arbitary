"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

const FEATURES = [
  {
    key: "dashboard",
    label: "Dashboard",
    description: "Hide the user dashboard and redirect to homepage",
  },
  {
    key: "leaderboard",
    label: "Leaderboard",
    description: "Hide the leaderboard and redirect to homepage",
  },
  {
    key: "facebook",
    label: "Facebook Tasks",
    description: "Disable Facebook-based task verification",
  },
  {
    key: "instagram",
    label: "Instagram Tasks",
    description: "Disable Instagram-based task verification",
  },
];

interface FbStatus {
  connected: boolean;
  pageName: string | null;
  connectedAt: string | null;
  daysUntilDataAccessExpires: number | null;
}

export default function SettingsPage() {
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [fbDisconnecting, setFbDisconnecting] = useState(false);

  const { data: flags } = useQuery({
    queryKey: ["feature-flags"],
    queryFn: async () => {
      const res = await fetch("/api/feature-flags");
      const data = (await res.json()) as { flags: Record<string, boolean> };
      return data.flags;
    },
  });

  const { data: fbStatus, isLoading: fbLoading } = useQuery({
    queryKey: ["fb-status"],
    queryFn: async () => {
      const res = await fetch("/api/admin/facebook/status");
      if (!res.ok) return null;
      return (await res.json()) as FbStatus;
    },
  });

  useEffect(() => {
    if (searchParams.get("connected") === "1") {
      toast.success("Facebook Page connected successfully!");
      queryClient.invalidateQueries({ queryKey: ["fb-status"] });
      queryClient.invalidateQueries({ queryKey: ["platform-flags"] });
    }
    if (searchParams.get("error")) {
      const errorMap: Record<string, string> = {
        no_code: "Facebook OAuth did not return an authorization code.",
        csrf_failed: "Security check failed. Please try again.",
        server_config: "Facebook OAuth is not configured on the server.",
        token_exchange_failed:
          "Failed to exchange authorization code for a token.",
        long_token_failed: "Failed to obtain a long-lived token.",
        pages_fetch_failed: "Failed to fetch your Facebook Pages.",
        no_pages: "No Facebook Pages found on your account.",
        no_fb_pages: "No Facebook Pages found on your account.",
        unexpected: "An unexpected error occurred. Please try again.",
        stash_expired: "Session expired. Please restart the connection flow.",
        stash_corrupted:
          "Session data was corrupted. Please restart the flow.",
      };
      const msg =
        errorMap[searchParams.get("error")!] || "Facebook connection failed.";
      toast.error(msg);
    }
  }, [searchParams, queryClient]);

  const toggleMutation = useMutation({
    mutationFn: async ({ key, enabled }: { key: string; enabled: boolean }) => {
      const res = await fetch("/api/admin/feature-flags", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, enabled }),
      });
      if (!res.ok) throw new Error("Failed to update");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feature-flags"] });
      toast.success("Feature flag updated");
    },
    onError: () => {
      toast.error("Failed to update feature flag");
    },
  });

  const handleDisconnect = async () => {
    setFbDisconnecting(true);
    try {
      const res = await fetch("/api/admin/facebook/disconnect", {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to disconnect");
      }
      toast.success("Facebook Page disconnected.");
      queryClient.setQueryData(["fb-status"], {
        connected: false,
        pageName: null,
        connectedAt: null,
        daysUntilDataAccessExpires: null,
      });
      queryClient.invalidateQueries({ queryKey: ["platform-flags"] });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to disconnect";
      toast.error(message);
    } finally {
      setFbDisconnecting(false);
    }
  };

  const showDataWarning =
    fbStatus?.connected &&
    fbStatus.daysUntilDataAccessExpires !== null &&
    fbStatus.daysUntilDataAccessExpires < 14;

  return (
    <div>
      {/* ── Connected Accounts ──────────────────────────────────── */}
      <div className="max-w-lg bg-white rounded-2xl border border-black/5 shadow-sm overflow-hidden mb-6">
        <div className="p-6 border-b border-black/5">
          <h2 className="text-sm font-black uppercase tracking-wider text-zinc-600">
            Connected Accounts
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Connect your Facebook Page to power social post browsing and
            Instagram task verification from the admin dashboard.
          </p>
        </div>

        <div className="p-6">
          {fbLoading ? (
            <div className="flex items-center gap-2 py-2">
              <div className="w-4 h-4 border-2 border-black/10 border-t-black rounded-full animate-spin" />
              <span className="text-xs text-zinc-400">
                Loading connection status...
              </span>
            </div>
          ) : fbStatus?.connected ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between px-4 py-3 bg-zinc-50 border border-black/5 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-[#1877F2] shadow-sm shrink-0">
                    <svg
                      className="w-4 h-4 text-white"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                    </svg>
                  </div>
                  <div>
                    <span className="text-sm font-bold text-zinc-700">
                      {fbStatus.pageName}
                    </span>
                    <span className="ml-2 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-green-100 text-green-700">
                      Active
                    </span>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Connected{" "}
                      {fbStatus.connectedAt
                        ? new Date(fbStatus.connectedAt).toLocaleDateString()
                        : ""}
                      {fbStatus.daysUntilDataAccessExpires !== null && (
                        <span className="ml-1">
                          | Data access expires in{" "}
                          {fbStatus.daysUntilDataAccessExpires} days
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {showDataWarning && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                  <p className="text-xs text-amber-800">
                    <strong>Warning:</strong> Your Facebook data access token
                    expires in{" "}
                    <strong>
                      {fbStatus.daysUntilDataAccessExpires} days
                    </strong>
                    . Reconnect before it expires to avoid interruptions.
                  </p>
                </div>
              )}

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    window.location.href = "/api/admin/facebook/connect";
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider bg-black text-white hover:bg-black/80 active:scale-95 transition-all duration-200"
                >
                  Reconnect / Switch Account
                </button>
                <button
                  disabled={fbDisconnecting}
                  onClick={handleDisconnect}
                  className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider border transition-all duration-200 ${
                    fbDisconnecting
                      ? "border-black/10 text-black/30 cursor-wait"
                      : "border-red-200 text-red-500 hover:bg-red-50 active:scale-95"
                  }`}
                >
                  {fbDisconnecting ? "Disconnecting..." : "Disconnect"}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => {
                  window.location.href = "/api/admin/facebook/connect";
                }}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold uppercase tracking-wider bg-[#1877F2] text-white hover:bg-[#166FE5] active:scale-95 transition-all duration-200 shadow-sm"
              >
                <svg
                  className="w-4 h-4"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
                Connect Facebook Account
              </button>
              <p className="text-xs text-zinc-400">
                No Facebook Page connected yet.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Feature Toggles ──────────────────────────────────────── */}
      <div className="max-w-lg bg-white rounded-2xl border border-black/5 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-black/5">
          <h2 className="text-sm font-black uppercase tracking-wider text-zinc-600">
            Feature Toggles
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Enable or disable features across the site. Disabled features are
            hidden from the nav bar and redirect users to the homepage, or block
            the relevant integrations.
          </p>
        </div>

        <div className="divide-y divide-black/5">
          {FEATURES.map((feature) => {
            const enabled = flags?.[feature.key] ?? true;
            return (
              <div
                key={feature.key}
                className="flex items-center justify-between px-6 py-4"
              >
                <div>
                  <span className="text-sm font-bold text-zinc-700">
                    {feature.label}
                  </span>
                  <span
                    className={`ml-2 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                      enabled
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {enabled ? "On" : "Off"}
                  </span>
                  {feature.description && (
                    <p className="text-xs text-zinc-400 mt-0.5">
                      {feature.description}
                    </p>
                  )}
                </div>
                <button
                  onClick={() =>
                    toggleMutation.mutate({
                      key: feature.key,
                      enabled: !enabled,
                    })
                  }
                  disabled={toggleMutation.isPending}
                  className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${
                    enabled ? "bg-[#FACC15]" : "bg-zinc-300"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                      enabled ? "translate-x-6" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
