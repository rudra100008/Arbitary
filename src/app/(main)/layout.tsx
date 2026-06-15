"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useDailyLogin } from "@/src/hooks/useDailyLogin";
import { useNotificationSSE } from "@/src/hooks/use-notification-sse";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Redirect unauthenticated users to login
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  // Auto daily-login: fires once per day, only for authenticated users.
  // userId comes from the session — undefined while loading, null when signed out.
  const userId = (session?.user as any)?.id ?? null;
  useDailyLogin({ userId });

  // Real-time notifications (rejection/approval, points, new tasks, etc.)
  useNotificationSSE({ enabled: status === "authenticated" });

  return <>{children}</>;
}
