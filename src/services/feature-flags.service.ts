import { db } from "@/src/db";
import { featureFlagsTable } from "@/src/db/schema";
import { eq } from "drizzle-orm";

export const FeatureFlagsService = {
  async getAll(): Promise<Record<string, boolean>> {
    const rows = await db.select().from(featureFlagsTable);
    const flags: Record<string, boolean> = {};
    for (const row of rows) {
      flags[row.key] = row.enabled;
    }
    return flags;
  },

  async isEnabled(key: string): Promise<boolean> {
    const [row] = await db
      .select({ enabled: featureFlagsTable.enabled })
      .from(featureFlagsTable)
      .where(eq(featureFlagsTable.key, key))
      .limit(1);
    return row?.enabled ?? true;
  },

  async setEnabled(key: string, enabled: boolean): Promise<void> {
    await db
      .update(featureFlagsTable)
      .set({ enabled, updatedAt: new Date() })
      .where(eq(featureFlagsTable.key, key));
  },
};
