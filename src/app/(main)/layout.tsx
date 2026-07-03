"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useDailyLogin } from "@/src/hooks/useDailyLogin";
import { useNotificationSSE } from "@/src/hooks/use-notification-sse";
import Header from "@/src/components/ui/header";
import Footer from "@/src/components/ui/footer";
import PromoBanner from "@/src/components/ui/promo-banner";
import { usePathname } from "next/navigation";

/** Routes inside (main) that render their own Footer (or none at all). */
const NO_FOOTER_ROUTES = ["/profile", "/dashboard", "/records"];

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  // Redirect unauthenticated users to login
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  // Redirect admin-level users to the admin dashboard.
  // Role values in the `users` table are stored inconsistently in casing
  // (e.g. "user" by default, "USER" from OAuth signup, "ADMIN" from the seed
  // script), so we normalize to uppercase before comparing rather than
  // relying on an exact-case match. See PR notes for the full list of
  // role-casing inconsistencies found across the codebase.
  useEffect(() => {
    if (status !== "authenticated") return;
    const userRole = (session?.user?.role ?? "").toString().toUpperCase();
    if (userRole === "ADMIN" || userRole === "SUPER_ADMIN") {
      router.push("/admin/dashboard");
    }
  }, [status, session, router]);

  // Backfill redirect: existing users who signed up before the
  // age-verification requirement was introduced have no dateOfBirth on
  // file. Send them to complete it before they can use the rest of the
  // app. Skipped for admins (handled by the redirect above) and while
  // already on the backfill page itself.
  useEffect(() => {
    if (status !== "authenticated") return;
    const userRole = (session?.user?.role ?? "").toString().toUpperCase();
    if (userRole === "ADMIN" || userRole === "SUPER_ADMIN") return;
    if (pathname.startsWith("/complete-birthday")) return;
    if (!session?.user?.dateOfBirth) {
      router.push("/complete-birthday");
    }
  }, [status, session, pathname, router]);

  // Real-time notifications — start SSE FIRST so the connection is open
  // before useDailyLogin fires and the server calls NotificationService.deliver().
  // This ensures the notification lands in the bell in real-time on the very
  // first login of the day (including right after signup).
  useNotificationSSE({ enabled: status === "authenticated" });

  // Auto daily-login: fires once per day, only for authenticated users.
  // We wait for status === "authenticated" (not just session?.user?.id) so that
  // the SSE connection above has already been established before the API call
  // goes out — otherwise the server sees no live listener and can only fall
  // back to email for the notification.
  const userId =
    status === "authenticated" ? (session?.user?.id ?? null) : null;
  useDailyLogin({ userId });

  const showFooter = !NO_FOOTER_ROUTES.some((route) =>
    pathname.startsWith(route),
  );

  return (
    <>
      <PromoBanner />
      <Header />
      {/* Spacer pushes content below fixed banner + fixed header.
          --banner-h is set by PromoBanner (0px when dismissed).
          Header is h-20 (80px) unscrolled. */}
      <div style={{ paddingTop: "calc(var(--banner-h, 0px) + 80px)" }} />
      {children}
      {showFooter && <Footer />}
    </>
  );
}
