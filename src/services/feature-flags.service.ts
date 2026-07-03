import { cache } from "react";
import { db } from "@/src/db";
import { featureFlagsTable } from "@/src/db/schema";
import { eq } from "drizzle-orm";
import { ServiceResult, ok } from "./result";

export const TOGGLEABLE_PLATFORMS = ["facebook", "instagram"] as const;
export type TogglePlatform = (typeof TOGGLEABLE_PLATFORMS)[number];

export type PlatformFlags = Record<TogglePlatform, boolean>;

const DEFAULT_FLAGS: PlatformFlags = {
  facebook: true,
  instagram: true,
};

function isTogglePlatform(key: string): key is TogglePlatform {
  return (TOGGLEABLE_PLATFORMS as readonly string[]).includes(key);
}

export const FeatureFlagsService = {
  async getAll(): Promise<Record<string, boolean>> {
    const rows = await db.select().from(featureFlagsTable);
    const flags: Record<string, boolean> = {};
    for (const row of rows) {
      flags[row.key] = row.enabled;
    }
    return flags;
  },

  async getPlatformFlags(): Promise<ServiceResult<PlatformFlags>> {
    const rows = await db.select().from(featureFlagsTable);
    const flags: PlatformFlags = { ...DEFAULT_FLAGS };
    for (const row of rows) {
      if (isTogglePlatform(row.key)) {
        flags[row.key] = row.enabled;
      }
    }
    return ok(flags);
  },

  /** @deprecated Use getPlatformFlags() */
  getFlags: async (): Promise<ServiceResult<PlatformFlags>> => {
    const rows = await db.select().from(featureFlagsTable);
    const flags: PlatformFlags = { ...DEFAULT_FLAGS };
    for (const row of rows) {
      if (isTogglePlatform(row.key)) {
        flags[row.key] = row.enabled;
      }
    }
    return ok(flags);
  },

  isEnabled: cache(async (key: string): Promise<boolean> => {
    const [row] = await db
      .select({ enabled: featureFlagsTable.enabled })
      .from(featureFlagsTable)
      .where(eq(featureFlagsTable.key, key))
      .limit(1);
    if (row) return row.enabled;
    return isTogglePlatform(key) ? DEFAULT_FLAGS[key] : true;
  }),

  /** @deprecated Use isEnabled() */
  isPlatformEnabled: cache(async (platform: TogglePlatform): Promise<boolean> => {
    const [row] = await db
      .select({ enabled: featureFlagsTable.enabled })
      .from(featureFlagsTable)
      .where(eq(featureFlagsTable.key, platform))
      .limit(1);
    return row ? row.enabled : DEFAULT_FLAGS[platform];
  }),

  async setEnabled(
    key: string,
    enabled: boolean,
    adminId?: number,
  ): Promise<void> {
    const existing = await db
      .select({ id: featureFlagsTable.id })
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
  },

  /** @deprecated Use setEnabled() */
  setFlag: async (
    key: TogglePlatform,
    enabled: boolean,
    adminId?: number,
  ): Promise<ServiceResult<{ key: TogglePlatform; enabled: boolean }>> => {
    const existing = await db
      .select({ id: featureFlagsTable.id })
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
};
