"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import OverviewTab from "./_components/overview-tab";
import type { Event } from "@/src/types/db";

export default function AdminOverview() {
  const router = useRouter();
  const [analytics, setAnalytics] = useState<{
    totalPointsDistributed: number;
    activeUsers: number;
    pendingVerifications: number;
  } | null>(null);
  const [events, setEvents] = useState<Event[]>([]);

  useEffect(() => {
    fetch("/api/admin/analytics")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setAnalytics(d.data);
      })
      .catch(() => {});
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const response = await fetch(`/api/events?t=${Date.now()}`);
      const data = await response.json();
      if (data.success) {
        setEvents(data.events);
      }
    } catch (error) {
      console.error("Failed to fetch events:", error);
    }
  };

  const stats = analytics
    ? [
        {
          label: "Total Points Distributed",
          value: analytics.totalPointsDistributed.toLocaleString(),
          growth: "Across all users",
        },
        {
          label: "Active Users",
          value: analytics.activeUsers.toLocaleString(),
          growth: "Last 30 days",
        },
        {
          label: "Pending Verifications",
          value: analytics.pendingVerifications.toLocaleString(),
          growth: "Awaiting review",
        },
      ]
    : [
        { label: "Loading...", value: "—", growth: "" },
        { label: "Loading...", value: "—", growth: "" },
        { label: "Loading...", value: "—", growth: "" },
      ];

  return (
    <OverviewTab
      stats={stats}
      events={events}
      onViewAllEvents={() => router.push("/admin/dashboard/events")}
    />
  );
}
