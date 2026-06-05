import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

export async function proxy(request: NextRequest) {
  try {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

    const pathname = request.nextUrl.pathname;

    const isAuthPage = pathname === "/admin/login";
    const isAdminDashboard = pathname.startsWith("/admin/dashboard");
    const isUserDashboard = pathname.startsWith("/dashboard");

    // Protect Admin Dashboard
    if (isAdminDashboard) {
      if (!token) {
        return NextResponse.redirect(new URL("/admin/login", request.url));
      }
      if (token.role !== "admin") {
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
    }

    // Prevent logged-in users from accessing the admin login page
    if (isAuthPage && token) {
      if (token.role === "admin") {
        return NextResponse.redirect(new URL("/admin/dashboard", request.url));
      }
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    // Protect User Dashboard
    if (isUserDashboard && !token) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  } catch {
    // Allow request through if middleware fails
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/dashboard/:path*"],
};
