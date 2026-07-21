"use client";

import { useCallback, useEffect, useMemo, useRef, useReducer, useState } from "react";
import { useRouter } from "next/navigation";
import OverviewTab, { type Trend } from "./_components/overview-tab";
import type { Event } from "@/src/types/db";

export interface GlobalActivityItem {
  id: number;
  action: string;
  description: string;
  logLevel: string;
  entityType: string;
  entityId: number | null;
  createdAt: string | null;
  admin: {
    id: number;
    name: string | null;
    email: string;
  };
}

export interface SystemStatus {
  db: { connected: boolean; latencyMs: number | null };
  api: { healthy: boolean; checkedAt: string };
  deployment: {
    version: string | null;
    commit: string | null;
    environment: string | null;
  };
  lastBackupAt: string | null;
}

interface SseLogRaw {
  id: number;
  admin_id: number;
  action: string;
  description: string;
  log_level: string;
  entity_type: string;
  entity_id: number | null;
  created_at: string | null;
  __replay?: boolean;
}

type DashboardDataState = {
  analytics: { totalPointsDistributed: number; activeUsers: number; pendingVerifications: number; tasksInProgress: number } | null;
  trends: Record<string, Trend | null>;
};
type DashboardDataAction =
  | { type: "SET_ANALYTICS"; analytics: DashboardDataState["analytics"]; trends: Record<string, Trend | null> };

function dashboardDataReducer(state: DashboardDataState, action: DashboardDataAction): DashboardDataState {
  switch (action.type) {
    case "SET_ANALYTICS":
      return { ...state, analytics: action.analytics, trends: action.trends };
  }
}

const AdminDashboardPage = () => {
  const router = useRouter();
  const [dataState, dataDispatch] = useReducer(dashboardDataReducer, {
    analytics: null,
    trends: {},
  });
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [systemStatusError, setSystemStatusError] = useState(false);
  const [events, setEvents] = useState<Event[]>([]);
  const [globalActivity, setGlobalActivity] = useState<GlobalActivityItem[]>(
    [],
  );
  const adminCacheRef = useRef<
    Map<number, { name: string | null; email: string }>
  >(new Map());

  function sseLogToGlobalItem(raw: SseLogRaw): GlobalActivityItem {
    const admin = adminCacheRef.current.get(raw.admin_id) ?? {
      name: null,
      email: `admin#${raw.admin_id}`,
    };
    return {
      id: raw.id,
      action: raw.action,
      description: raw.description,
      logLevel: raw.log_level,
      entityType: raw.entity_type,
      entityId: raw.entity_id,
      createdAt: raw.created_at,
      admin: { id: raw.admin_id, ...admin },
    };
  }

  const fetchSystemStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/system-status");
      const data = await res.json();
      if (res.ok) {
        setSystemStatus(data);
        setSystemStatusError(false);
      } else {
        setSystemStatusError(true);
      }
    } catch {
      setSystemStatusError(true);
    }
  }, []);

  const fetchEvents = useCallback(async () => {
    try {
      const response = await fetch(`/api/events?t=${Date.now()}`);

      const rawBody = await response.text();
      let data: { success?: boolean; events?: Event[]; error?: string } | null = null;
      if (rawBody) {
        try {
          data = JSON.parse(rawBody);
        } catch (parseErr) {
          console.error(
            "Failed to parse /api/events response as JSON:",
            parseErr,
            "Raw body:",
            rawBody.slice(0, 500),
          );
          return;
        }
      }

      if (!response.ok) {
        console.error(
          "GET /api/events returned an error:",
          response.status,
          data?.error ?? "(no error message in response)",
        );
        return;
      }

      if (data?.success) {
        setEvents(data.events ?? []);
      } else {
        console.error("GET /api/events responded without success:", data);
      }
    } catch (error) {
      console.error("Failed to fetch events:", error);
    }
  }, []);

  useEffect(() => {
    fetch("/api/admin/analytics")
      .then((r) => r.json())
      .then((d: { success?: boolean; data?: DashboardDataState["analytics"]; trends?: Record<string, Trend | null> }) => {
        if (d.success) {
          dataDispatch({ type: "SET_ANALYTICS", analytics: d.data ?? null, trends: d.trends ?? {} });
        }
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/set-state-in-effect -- standard fetch-on-mount
    fetchEvents();
    fetchSystemStatus();

    fetch("/api/admin/global-activity?limit=30")
      .then((r) => r.json())
      .then((d: { logs?: GlobalActivityItem[] }) => {
        if (!d.logs) return;
        for (const item of d.logs as GlobalActivityItem[]) {
          adminCacheRef.current.set(item.admin.id, {
            name: item.admin.name,
            email: item.admin.email,
          });
        }
        setGlobalActivity(d.logs);
      })
      .catch(() => {});
  }, [fetchEvents, fetchSystemStatus]);

  useEffect(() => {
    const es = new EventSource("/api/admin/activity-stream");

    es.addEventListener("log", (e: MessageEvent) => {
      try {
        const raw: SseLogRaw = JSON.parse(e.data);
        if (raw.__replay) return;
        const item = sseLogToGlobalItem(raw);
        setGlobalActivity((prev) => {
          if (prev.some((a) => a.id === item.id)) return prev;
          return [item, ...prev].slice(0, 100);
        });
      } catch {}
    });

    return () => es.close();
  }, []);

  const criticalAlerts = useMemo(
    () => globalActivity.filter((a) => a.logLevel === "CRITICAL").slice(0, 8),
    [globalActivity],
  );

  const stats = dataState.analytics
    ? [
        {
          label: "Total Points Distributed",
          value: dataState.analytics.totalPointsDistributed.toLocaleString(),
          growth: "Across all users",
          trend: dataState.trends.totalPointsDistributed ?? null,
        },
        {
          label: "Active Users",
          value: dataState.analytics.activeUsers.toLocaleString(),
          growth: "Last 30 days",
          trend: dataState.trends.activeUsers ?? null,
        },
        {
          label: "Pending Verifications",
          value: dataState.analytics.pendingVerifications.toLocaleString(),
          growth: "Awaiting review",
          trend: null,
        },
        {
          label: "Tasks In Progress",
          value: dataState.analytics.tasksInProgress.toLocaleString(),
          growth: "Currently assigned",
          trend: null,
        },
      ]
    : [
        { label: "Loading...", value: "—", growth: "", trend: null },
        { label: "Loading...", value: "—", growth: "", trend: null },
        { label: "Loading...", value: "—", growth: "", trend: null },
        { label: "Loading...", value: "—", growth: "", trend: null },
      ];

  return (
    <OverviewTab
      stats={stats}
      events={events}
      globalActivity={globalActivity}
      criticalAlerts={criticalAlerts}
      systemStatus={systemStatus}
      systemStatusError={systemStatusError}
      onViewAllEvents={() => router.push("/admin/dashboard/events")}
    />
  );
};

export default AdminDashboardPage;
