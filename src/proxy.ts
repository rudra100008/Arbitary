/// <reference types="next" />
import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

const authRoutes = ["/login", "/signup"];
const protectedRoutes = ["/dashboard", "/profile"];

const lotteryFormPath = "/lottery/form";
const lotteryInvalidPath = "/tilt/invalid";

type SessionCheckResponse =
  | { valid: false }
  | { valid: true; submitted: boolean };

function isLotteryProtectedPath(pathname: string) {
  return pathname === lotteryFormPath;
}

function redirectLotteryInvalid(request: NextRequest, reason: string) {
  return NextResponse.redirect(
    new URL(`${lotteryInvalidPath}?reason=${reason}`, request.url),
  );
}

async function guardLotterySession(
  request: NextRequest,
  pathname: string,
): Promise<NextResponse | null> {
  const sidFromCookie = request.cookies.get("lsid")?.value?.trim() ?? "";
  const sidFromQuery = request.nextUrl.searchParams.get("sid")?.trim() ?? "";
  const sid = sidFromCookie || sidFromQuery;

  if (!sid) {
    return redirectLotteryInvalid(request, "no_session");
  }

  const sessionCheckUrl = new URL("/api/tilt/session-check", request.url);
  sessionCheckUrl.searchParams.set("sid", sid);

  try {
    // Edge runtime proxy cannot use Drizzle directly, so it validates via an internal API fetch.
    const checkResponse = await fetch(sessionCheckUrl.toString(), {
      method: "GET",
      cache: "no-store",
    });

    if (!checkResponse.ok) {
      return redirectLotteryInvalid(request, "invalid_session");
    }

    const sessionState =
      (await checkResponse.json()) as SessionCheckResponse | null;

    if (!sessionState?.valid) {
      return redirectLotteryInvalid(request, "invalid_session");
    }

    if (pathname === lotteryFormPath && sessionState.submitted) {
      return redirectLotteryInvalid(request, "already_submitted");
    }

    // One-hop bootstrap: if sid arrived via query (cookie missing), validate then mint cookie and clean URL.
    if (!sidFromCookie && sidFromQuery) {
      const cleanUrl = new URL(request.url);
      cleanUrl.searchParams.delete("sid");

      const response = NextResponse.redirect(cleanUrl);
      response.cookies.set("lsid", sidFromQuery, {
        httpOnly: true,
        secure: request.nextUrl.protocol === "https:",
        sameSite: "strict",
        maxAge: 1800,
        path: "/",
      });

      return response;
    }

    return null;
  } catch {
    return redirectLotteryInvalid(request, "invalid_session");
  }
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (isLotteryProtectedPath(pathname)) {
    const lotteryGuardResponse = await guardLotterySession(request, pathname);
    return lotteryGuardResponse ?? NextResponse.next();
  }

  try {
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });

    const role = ((token?.role as string) || "").toLowerCase();

    const isAuthRoute = authRoutes.includes(pathname);
    const isProtectedRoute = protectedRoutes.some(
      (route) => pathname === route || pathname.startsWith(route + "/"),
    );
    const isAdminApi = pathname.startsWith("/api/admin");
    const isAdminRoute = pathname.startsWith("/admin") && !isAdminApi;
    const isAdminLoginPage = pathname === "/admin/login";

    // Redirect logged-in users away from auth pages (login/signup)
    if (isAuthRoute && token) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    // Protect user routes (dashboard, profile)
    if (isProtectedRoute && !token) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    // Protect Admin API Endpoints
    if (isAdminApi) {
      if (!token) {
        return NextResponse.json(
          { error: "Unauthorized: Please log in" },
          { status: 401 },
        );
      }
      if (role !== "admin" && role !== "super_admin") {
        return NextResponse.json(
          { error: "Forbidden: Admins only" },
          { status: 403 },
        );
      }
    }

    // Protect Admin pages (all /admin/* except login)
    if (isAdminRoute && !isAdminLoginPage) {
      if (!token) {
        const loginUrl = new URL("/admin/login", request.url);
        loginUrl.searchParams.set("callbackUrl", pathname);
        return NextResponse.redirect(loginUrl);
      }
      if (role !== "admin" && role !== "super_admin") {
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
    }

    // Prevent logged-in users from accessing the admin login page
    if (isAdminLoginPage && token) {
      if (role === "admin" || role === "super_admin") {
        return NextResponse.redirect(new URL("/admin/dashboard", request.url));
      }
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  } catch {
    // Fail closed: on error, deny access to protected routes
    const isProtected = protectedRoutes.some(
      (route) => pathname === route || pathname.startsWith(route + "/"),
    );
    const isAdminApi = pathname.startsWith("/api/admin");
    const isAdminRoute = pathname.startsWith("/admin");

    if (isAdminApi) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (isAdminRoute) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
    if (isProtected) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/login",
    "/signup",
    "/profile/:path*",
    "/dashboard/:path*",
    "/admin/:path*",
    "/api/admin/:path*",
    "/lottery/form",
  ],
};
