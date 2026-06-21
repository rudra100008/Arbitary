/**
 * One-off data-fix script: normalizes the `users.role` column to a
 * consistent uppercase form ("USER" / "ADMIN" / "SUPER_ADMIN").
 *
 * Background: role values have been written inconsistently across the
 * codebase over time — the schema default is lowercase "user", the OAuth
 * signup path writes "USER", and the seed script writes "ADMIN". This
 * caused exact-case role checks (e.g. `role === "ADMIN"`) to silently fail
 * for some accounts. The application code has already been updated to
 * compare roles case-insensitively, so this script is not required for
 * correctness — it just cleans up the underlying data so the column itself
 * reads consistently (e.g. in admin tooling, exports, direct DB queries).
 *
 * This does NOT change the schema (column stays varchar(50), no migration
 * file needed) — it's a data-only UPDATE, safe to re-run (idempotent).
 *
 * Usage:
 *   npx tsx src/scripts/normalize-user-roles.ts
 *   npx tsx src/scripts/normalize-user-roles.ts --dry-run
 */
import "dotenv/config";
import { db } from "@/src/db";
import { usersTable } from "@/src/db/schema";
import { and, eq, ilike, isNull, not, or, sql, SQL } from "drizzle-orm";

const isAdminRole: SQL = or(
    ilike(usersTable.role, "admin"),
    ilike(usersTable.role, "super_admin"),
)!;
const isSuperAdminRole = ilike(usersTable.role, "super_admin");

async function roleDistribution() {
    return db
        .select({ role: usersTable.role, count: sql<number>`count(*)::int` })
        .from(usersTable)
        .groupBy(usersTable.role);
}

async function normalizeUserRoles() {
    const dryRun = process.argv.includes("--dry-run");
    console.log(`🚀 Normalizing user roles${dryRun ? " (dry run)" : ""}...`);
    console.log("Current role distribution:", await roleDistribution());

    if (dryRun) {
        console.log("Dry run only — no changes written.");
        return;
    }

    // 1. super_admin (any case) -> "SUPER_ADMIN". Checked first since it also
    //    matches the broader "admin" pattern below.
    await db
        .update(usersTable)
        .set({ role: "SUPER_ADMIN" })
        .where(and(isSuperAdminRole, not(eq(usersTable.role, "SUPER_ADMIN"))));

    // 2. admin (any case, excluding super_admin) -> "ADMIN"
    await db
        .update(usersTable)
        .set({ role: "ADMIN" })
        .where(
            and(isAdminRole, not(isSuperAdminRole), not(eq(usersTable.role, "ADMIN"))),
        );

    // 3. Everything else (standard accounts, including NULL/blank) -> "USER"
    await db
        .update(usersTable)
        .set({ role: "USER" })
        .where(
            and(
                or(isNull(usersTable.role), not(isAdminRole)),
                not(eq(usersTable.role, "USER")),
            ),
        );

    console.log("✅ Done.");
    console.log("New role distribution:", await roleDistribution());
}

normalizeUserRoles()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error("❌ Script failed:", err);
        process.exit(1);
    });