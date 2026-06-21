import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/src/services/auth.service";
import { db } from "@/src/db";
import { usersTable } from "@/src/db/schema";
import { desc, ilike, or, count, and, isNull, not, sql } from "drizzle-orm";

const PAGE_SIZE = 25;

export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const search = req.nextUrl.searchParams.get("search")?.trim() ?? "";
  const pageParam = Number(req.nextUrl.searchParams.get("page") ?? "1");
  const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;
  const offset = (page - 1) * PAGE_SIZE;
  const role = req.nextUrl.searchParams.get("role")?.trim() ?? "";

  const searchClause = search
    ? or(ilike(usersTable.name, `%${search}%`), ilike(usersTable.email, `%${search}%`))
    : undefined;

  // Role values in the `users` table are stored with inconsistent casing
  // across the codebase (default "user", OAuth signup "USER", seed script
  // "ADMIN"). We normalize with ilike() rather than relying on exact-case
  // eq() matches, and define "admin" as anything matching admin/super_admin
  // (case-insensitively) and "user" as everything else (including NULL),
  // so the two buckets are mutually exclusive and exhaustive — no account
  // can be miscounted or double-counted between them.
  const isAdminRole = sql`(${ilike(usersTable.role, "admin")} OR ${ilike(usersTable.role, "super_admin")})`;

  let roleClause;
  if (role === "admin") {
    roleClause = isAdminRole;
  } else if (role === "user") {
    roleClause = or(not(isAdminRole), isNull(usersTable.role));
  } else if (role) {
    // Fallback for any other explicit role value passed in.
    roleClause = ilike(usersTable.role, role);
  }

  const whereClause =
    searchClause && roleClause
      ? and(searchClause, roleClause)
      : searchClause ?? roleClause ?? undefined;

  const [[{ total }], users] = await Promise.all([
    db.select({ total: count() }).from(usersTable).where(whereClause),
    db
      .select({
        id: usersTable.id,
        name: usersTable.name,
        email: usersTable.email,
        role: usersTable.role,
        points: usersTable.points,
        completedTasksCount: usersTable.completedTasksCount,
        isVerified: usersTable.isVerified,
        isFlagged: usersTable.isFlagged,
        createdAt: usersTable.createdAt,
        lastLoginAt: usersTable.lastLoginAt,
        provider: usersTable.provider,
      })
      .from(usersTable)
      .where(whereClause)
      .orderBy(desc(usersTable.createdAt))
      .limit(PAGE_SIZE)
      .offset(offset),
  ]);

  return NextResponse.json({
    users,
    pagination: {
      page,
      pageSize: PAGE_SIZE,
      total: Number(total),
      totalPages: Math.ceil(Number(total) / PAGE_SIZE),
    },
  });
}