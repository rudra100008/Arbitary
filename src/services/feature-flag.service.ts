import { cache } from "react";
import { db } from "@/src/db";
import { featureFlagsTable } from "@/src/db/schema";
import { eq } from "drizzle-orm";
import { ServiceResult, ok } from "./result";

/**
 * Platforms that can currently be toggled off/on by an admin. Add new keys
 * here (and nowhere else) to extend feature-flag coverage to another
 * integration.
 */
export const TOGGLEABLE_PLATFORMS = ["facebook", "instagram"] as const;
export type TogglePlatform = (typeof TOGGLEABLE_PLATFORMS)[number];

export type PlatformFlags = Record<TogglePlatform, boolean>;

// Platforms default to enabled if no row exists yet (e.g. before the first
// admin ever visits the settings page / before the migration has run in a
// given environment) — same "fail open to existing behavior" approach the
// rest of the app uses for other optional config rows.
const DEFAULT_FLAGS: PlatformFlags = {
  facebook: true,
  instagram: true,
};

function isTogglePlatform(key: string): key is TogglePlatform {
  return (TOGGLEABLE_PLATFORMS as readonly string[]).includes(key);
}

export const FeatureFlagService = {
  /** All toggleable platform flags, merged with defaults for missing rows. */
  async getFlags(): Promise<ServiceResult<PlatformFlags>> {
    const rows = await db.select().from(featureFlagsTable);
    const flags: PlatformFlags = { ...DEFAULT_FLAGS };
    for (const row of rows) {
      if (isTogglePlatform(row.key)) {
        flags[row.key] = row.enabled;
      }
    }
    return ok(flags);
  },

  async setFlag(
    key: TogglePlatform,
    enabled: boolean,
    adminId?: number,
  ): Promise<ServiceResult<{ key: TogglePlatform; enabled: boolean }>> {
    const existing = await db
      .select()
      .from(featureFlagsTable)
      .where(eq(featureFlagsTable.key, key))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(featureFlagsTable)
        .set({ enabled, updatedAt: new Date(), updatedByAdminId: adminId ?? null })
        .where(eq(featureFlagsTable.key, key));
    } else {
      await db
        .insert(featureFlagsTable)
        .values({ key, enabled, updatedByAdminId: adminId ?? null });
    }

    return ok({ key, enabled });
  },

  /**
   * Server-only, single choke-point check for "is this platform currently
   * enabled?". Wrapped in React's `cache()` so multiple checks within the
   * same request (e.g. auth.ts + a route handler + task.service) only hit
   * the DB once. No cross-request caching — a toggle takes effect on the
   * very next request, same as AboutService.getLiveStreamId().
   */
  isPlatformEnabled: cache(async (platform: TogglePlatform): Promise<boolean> => {
    const [row] = await db
      .select({ enabled: featureFlagsTable.enabled })
      .from(featureFlagsTable)
      .where(eq(featureFlagsTable.key, platform))
      .limit(1);
    return row ? row.enabled : DEFAULT_FLAGS[platform];
  }),
};
