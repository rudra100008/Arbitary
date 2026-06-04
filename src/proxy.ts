import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

export async function proxy(request: NextRequest) {
  const token = await getToken({ req: request });
  
  const pathname = request.nextUrl.pathname;
  
  const isAuthPage = pathname === "/admin/login";
  const isAdminDashboard = pathname.startsWith("/admin/dashboard");
  const isUserDashboard = pathname.startsWith("/dashboard");

  // Protect Admin Dashboard
  if (isAdminDashboard) {
    if (!token) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
    // Check if the user is actually an admin
    if (token.role !== "admin") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  // Prevent logged-in users from accessing the admin login page
  if (isAuthPage && token) {
    if (token.role === "admin") {
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
  matcher: ["/admin/:path*", "/dashboard/:path*"],
};
