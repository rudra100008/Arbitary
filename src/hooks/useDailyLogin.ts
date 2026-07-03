"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { NOTIFICATIONS_QUERY_KEY } from "@/src/hooks/use-notifications";

interface UseDailyLoginOptions {
  /** Authenticated user id. Pass null/undefined when user is not logged in. */
  userId: number | null | undefined;
}

function nextMilestoneLabel(days: number): string {
  if (days === 5) return "5-day";
  if (days === 7) return "7-day";
  if (days === 30) return "30-day";
  return `${days}-day`;
}

export function useDailyLogin({ userId }: UseDailyLoginOptions) {
  // Prevent double-firing in React StrictMode (double-mount in dev)
  const firedRef = useRef(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId) return;
    if (firedRef.current) return;

    const today = new Date().toISOString().split("T")[0]; // "YYYY-MM-DD"
    const storageKey = `daily_login_claimed:${userId}`;

    try {
      const lastClaimed = localStorage.getItem(storageKey);
      if (lastClaimed === today) return; // Already claimed today in this browser
    } catch {
      // localStorage may be unavailable (private mode, etc.) — still attempt
    }

    firedRef.current = true;

    (async () => {
      try {
        const res = await fetch("/api/user/tasks/daily-login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });

        if (res.status === 429) {
          const body = await res.json().catch(() => null);

          if (body?.code === "ALREADY_CLAIMED") {
            // Already claimed server-side today — persist locally so we
            // don't bother re-checking on subsequent page loads today.
            try {
              localStorage.setItem(storageKey, today);
            } catch { }
            return;
          }

          // Rate-limited (e.g. rapid reloads) or an older/unrecognized
          // response shape — this is NOT a real claim. Don't mark it as
          // claimed in localStorage, or the reward would be silently
          // skipped for the rest of the day. Reset the flag so the next
          // mount/navigation can retry.
          console.error(
            "Daily login claim was rate-limited or returned an unexpected 429; will retry.",
            body,
          );
          firedRef.current = false;
          return;
        }

        if (!res.ok) {
          // Non-429 error: reset flag so it can retry next navigation
          firedRef.current = false;
          console.error(
            "Daily login claim failed:",
            res.status,
            await res.text().catch(() => ""),
          );
          return;
        }

        const data = await res.json();

        // Persist claim date so subsequent route visits skip the request
        try {
          localStorage.setItem(storageKey, today);
        } catch { }

        // Refresh the notification bell — the server already persisted the
        // notification via NotificationService.deliver(); if SSE delivered it
        // the cache is already updated, but if the SSE connection wasn't open
        // yet (e.g. right after signup) we invalidate to fetch it from the DB.
        queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });

        // Also refresh points so the UI reflects the new balance immediately
        queryClient.invalidateQueries({ queryKey: ["user-points"] });

        // Show reward toast
        const msg =
          data.bonusPoints > 0
            ? data.message
            : `Daily login reward! +${data.pointsAwarded ?? 5} pts`;
        toast.success(msg);

        if (data.streak) {
          const nextInfo = data.nextMilestone
            ? ` Next milestone at ${nextMilestoneLabel(data.nextMilestone.days)}: +${data.nextMilestone.bonus} pts`
            : " All milestones reached!";
          setTimeout(
            () => toast.info(`🔥 ${data.streak}-day streak!${nextInfo}`),
            600,
          );
        }
      } catch (err) {
        // Network error — silently reset so it can retry
        console.error("Daily login claim network error:", err);
        firedRef.current = false;
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);
}