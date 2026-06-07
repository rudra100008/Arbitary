import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

export async function proxy(request: NextRequest) {
  const token = await getToken({ req: request });

  const pathname = request.nextUrl.pathname;

  const isAuthPage = pathname === "/admin/login";
  const isAdminDashboard = pathname.startsWith("/admin/dashboard");
  const isAdminApi = pathname.startsWith("/api/admin");
  const isUserDashboard = pathname.startsWith("/dashboard");

  // Protect Admin API Endpoints
  if (isAdminApi) {
    if (!token) {
      return NextResponse.json(
        { error: "Unauthorized: Please log in" },
        { status: 401 }
      );
    }
    if (token.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden: Admins only" },
        { status: 403 }
      );
    }
  }

  // Protect Admin Dashboard
  if (isAdminDashboard) {
    if (!token) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
    if (token.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  // Prevent logged-in users from accessing the admin login page
  if (isAuthPage && token) {
    if (token.role === "ADMIN") {
      return NextResponse.redirect(new URL("/admin/dashboard", request.url));
    } else {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  // Protect User Dashboard
  if (isUserDashboard && !token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/dashboard/:path*", "/api/admin/:path*"],
};
