"use client";

import { useEffect, useState } from "react";
import {
  DEFAULT_DAILY_REWARD_TARGET,
  MIN_DAILY_REWARD_TARGET,
  MAX_DAILY_REWARD_TARGET,
} from "@/src/lib/tilt/reward-config";

export default function TiltAdminSettingsPage() {
  const [rewardTarget, setRewardTarget] = useState(DEFAULT_DAILY_REWARD_TARGET);
  const [rewardTargetInput, setRewardTargetInput] = useState(String(DEFAULT_DAILY_REWARD_TARGET));
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadRewardTarget = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch("/api/tilt/admin/settings/reward-target");
      if (!res.ok) throw new Error("Failed to load reward target");
      const data = (await res.json()) as { target?: number };
      if (typeof data.target === "number") {
        setRewardTarget(data.target);
        setRewardTargetInput(String(data.target));
      }
    } catch {
      setErrorMessage("Failed to load reward target.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    document.title = "Settings | Tilt Your Music";
    void loadRewardTarget();
  }, []);

  const handleSaveRewardTarget = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSuccessMessage(null);
    setErrorMessage(null);

    const parsedTarget = Number.parseInt(rewardTargetInput, 10);
    if (
      Number.isNaN(parsedTarget) ||
      parsedTarget < MIN_DAILY_REWARD_TARGET ||
      parsedTarget > MAX_DAILY_REWARD_TARGET
    ) {
      setErrorMessage(
        `Target must be an integer between ${MIN_DAILY_REWARD_TARGET} and ${MAX_DAILY_REWARD_TARGET}.`,
      );
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch("/api/tilt/admin/settings/reward-target", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target: parsedTarget }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; target?: number };
      if (!res.ok) {
        throw new Error(data.error || "Failed to update reward target");
      }

      const nextTarget = typeof data.target === "number" ? data.target : parsedTarget;
      setRewardTarget(nextTarget);
      setRewardTargetInput(String(nextTarget));
      setSuccessMessage("Daily reward target updated.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update reward target";
      setErrorMessage(message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-black uppercase tracking-tight text-white">Settings</h1>
        <p className="text-sm font-medium mt-1" style={{ color: "rgba(255,255,255,0.35)" }}>
          Tilt platform configuration
        </p>
      </div>

      <div
        className="rounded-2xl border p-6"
        style={{
          borderColor: "rgba(200,230,60,0.1)",
          background: "rgba(255,255,255,0.02)",
        }}
      >
        <h2 className="text-sm font-black uppercase tracking-[0.18em] text-white mb-1">
          Daily rewards
        </h2>
        <p className="text-xs mb-4" style={{ color: "rgba(255,255,255,0.45)" }}>
          Base value is {DEFAULT_DAILY_REWARD_TARGET}. Superadmin can change this target at any time.
        </p>

        <form
          onSubmit={handleSaveRewardTarget}
          className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3"
        >
          <div className="w-full sm:w-56">
            <label
              className="block mb-2 text-[10px] font-black uppercase tracking-[0.18em]"
              style={{ color: "rgba(200,230,60,0.55)" }}
            >
              Daily target
            </label>
            <input
              type="number"
              min={MIN_DAILY_REWARD_TARGET}
              max={MAX_DAILY_REWARD_TARGET}
              step={1}
              value={rewardTargetInput}
              onChange={(e) => setRewardTargetInput(e.target.value)}
              className="tilt-input"
              disabled={isLoading || isSaving}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading || isSaving}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
            style={{ background: "#c8e63c", color: "#0e1f10" }}
          >
            {isLoading ? "Loading..." : isSaving ? "Saving..." : "Save target"}
          </button>

          <div className="text-xs sm:ml-1" style={{ color: "rgba(255,255,255,0.45)" }}>
            Current: <span className="text-white font-bold">{rewardTarget}</span>
          </div>
        </form>

        {errorMessage ? (
          <p className="text-xs mt-2" style={{ color: "#fca5a5" }}>
            {errorMessage}
          </p>
        ) : null}

        {successMessage ? (
          <p className="text-xs mt-2" style={{ color: "#86efac" }}>
            {successMessage}
          </p>
        ) : null}
      </div>

      <style>{`
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
