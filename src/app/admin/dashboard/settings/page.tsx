"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const FEATURES = [
  { key: "dashboard", label: "Dashboard", description: "Hide the user dashboard and redirect to homepage" },
  { key: "leaderboard", label: "Leaderboard", description: "Hide the leaderboard and redirect to homepage" },
  { key: "facebook", label: "Facebook Tasks", description: "Disable Facebook-based task verification" },
  { key: "instagram", label: "Instagram Tasks", description: "Disable Instagram-based task verification" },
];

export default function SettingsPage() {
  const queryClient = useQueryClient();

  const { data: flags } = useQuery({
    queryKey: ["feature-flags"],
    queryFn: async () => {
      const res = await fetch("/api/feature-flags");
      const data = await res.json() as { flags: Record<string, boolean> };
      return data.flags;
    },
  });

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

  return (
    <div>
      <h1 className="text-3xl font-black uppercase tracking-tight mb-8">
        Settings
      </h1>

      <div className="max-w-lg bg-white rounded-2xl border border-black/5 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-black/5">
          <h2 className="text-sm font-black uppercase tracking-wider text-zinc-600">
            Feature Toggles
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Enable or disable features across the site. Disabled features are
            hidden from the nav bar and redirect users to the homepage, or
            block the relevant integrations.
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
                    toggleMutation.mutate({ key: feature.key, enabled: !enabled })
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
