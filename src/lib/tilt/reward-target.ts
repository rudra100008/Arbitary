import { eq } from "drizzle-orm";
import { tiltDb } from "@/src/db/tilt-db";
import { tiltOutletRewardTargetsTable, tiltSettingsTable } from "@/src/db/tilt-schema";
import {
  DEFAULT_DAILY_REWARD_TARGET,
  MIN_DAILY_REWARD_TARGET,
  MAX_DAILY_REWARD_TARGET,
} from "./reward-config";

const DAILY_REWARD_TARGET_KEY = "daily_reward_target";

function normalizeDailyRewardTarget(raw: number): number {
  if (!Number.isFinite(raw)) return DEFAULT_DAILY_REWARD_TARGET;
  const value = Math.trunc(raw);
  if (value < MIN_DAILY_REWARD_TARGET) return MIN_DAILY_REWARD_TARGET;
  if (value > MAX_DAILY_REWARD_TARGET) return MAX_DAILY_REWARD_TARGET;
  return value;
}

export async function getDailyRewardTarget(): Promise<number> {
  try {
    const [row] = await tiltDb
      .select({ value: tiltSettingsTable.value })
      .from(tiltSettingsTable)
      .where(eq(tiltSettingsTable.key, DAILY_REWARD_TARGET_KEY))
      .limit(1);

    if (!row) return DEFAULT_DAILY_REWARD_TARGET;
    return normalizeDailyRewardTarget(row.value);
  } catch {
    return DEFAULT_DAILY_REWARD_TARGET;
  }
}

export async function setDailyRewardTarget(target: number): Promise<number> {
  const normalizedTarget = normalizeDailyRewardTarget(target);

  const [row] = await tiltDb
    .insert(tiltSettingsTable)
    .values({
      key: DAILY_REWARD_TARGET_KEY,
      value: normalizedTarget,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: tiltSettingsTable.key,
      set: {
        value: normalizedTarget,
        updatedAt: new Date(),
      },
    })
    .returning({ value: tiltSettingsTable.value });

  return normalizeDailyRewardTarget(row?.value ?? normalizedTarget);
}

export async function getOutletDailyRewardTarget(outletId: string): Promise<number> {
  const normalizedOutletId = outletId.trim();
  if (!normalizedOutletId) return getDailyRewardTarget();

  try {
    const [row] = await tiltDb
      .select({ dailyRewardTarget: tiltOutletRewardTargetsTable.dailyRewardTarget })
      .from(tiltOutletRewardTargetsTable)
      .where(eq(tiltOutletRewardTargetsTable.outletId, normalizedOutletId))
      .limit(1);

    if (!row) return getDailyRewardTarget();
    return normalizeDailyRewardTarget(row.dailyRewardTarget);
  } catch {
    return getDailyRewardTarget();
  }
}

export async function setOutletDailyRewardTarget(
  outletId: string,
  target: number,
  updatedBy: number,
): Promise<number> {
  const normalizedOutletId = outletId.trim();
  const normalizedTarget = normalizeDailyRewardTarget(target);

  const [row] = await tiltDb
    .insert(tiltOutletRewardTargetsTable)
    .values({
      outletId: normalizedOutletId,
      dailyRewardTarget: normalizedTarget,
      updatedAt: new Date(),
      updatedBy,
    })
    .onConflictDoUpdate({
      target: tiltOutletRewardTargetsTable.outletId,
      set: {
        dailyRewardTarget: normalizedTarget,
        updatedAt: new Date(),
        updatedBy,
      },
    })
    .returning({ dailyRewardTarget: tiltOutletRewardTargetsTable.dailyRewardTarget });

  return normalizeDailyRewardTarget(row?.dailyRewardTarget ?? normalizedTarget);
}

export {
  DAILY_REWARD_TARGET_KEY,
  MIN_DAILY_REWARD_TARGET,
  MAX_DAILY_REWARD_TARGET,
};
