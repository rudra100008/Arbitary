import {
  DAILY_REWARD_TARGET,
  MIN_WIN_PROBABILITY,
  MAX_WIN_PROBABILITY,
  PACE_SENSITIVITY,
  SOFT_CAP_DECAY,
  ABSOLUTE_MAX_RATE,
  ABSOLUTE_MAX_REWARDS_FLOOR,
  MIN_SCANS_BEFORE_REWARDS,
  BOOST_AFTER_HOUR,
  BOOST_WIN_PROBABILITY,
  NST_OFFSET_MS,
} from "./reward-config";

export function computeAbsoluteMax(scansToday: number): number {
  return Math.max(ABSOLUTE_MAX_REWARDS_FLOOR, Math.floor(scansToday * ABSOLUTE_MAX_RATE));
}

/** Returns the current hour in NST (0–23). */
function nstHour(now: Date): number {
  return new Date(now.getTime() + NST_OFFSET_MS).getUTCHours();
}

/**
 * Decides whether this submission wins a reward.
 *
 * Before 7PM  → normal time-based pacing.
 * After 7PM, winners < DAILY_REWARD_TARGET → boost probability to fill
 *   remaining slots before midnight.
 * After 7PM, winners >= DAILY_REWARD_TARGET → no boost, continue normally
 *   (soft-cap decay kicks in past target).
 */
export function shouldGrantReward(
  winnersInWindow: number,
  scansToday: number,
  now: Date,
  windowStart: Date,
  windowEnd: Date,
): boolean {
  if (scansToday < MIN_SCANS_BEFORE_REWARDS) return false;

  const absoluteMax = computeAbsoluteMax(scansToday);
  if (winnersInWindow >= absoluteMax) return false;

  const hour = nstHour(now);
  const isPastBoostTime = hour >= BOOST_AFTER_HOUR;

  // After 7PM and still under target → boost
  if (isPastBoostTime && winnersInWindow < DAILY_REWARD_TARGET) {
    return Math.random() < BOOST_WIN_PROBABILITY;
  }

  // Normal pacing (before 7PM, or already at/past target)
  if (winnersInWindow < DAILY_REWARD_TARGET) {
    const totalMs = windowEnd.getTime() - windowStart.getTime();
    const elapsedMs = now.getTime() - windowStart.getTime();
    const elapsedFraction = totalMs > 0 ? Math.min(1, Math.max(0, elapsedMs / totalMs)) : 1;
    const winRate = DAILY_REWARD_TARGET / scansToday;
    const pacedTarget = Math.min(
      DAILY_REWARD_TARGET * elapsedFraction,
      scansToday * elapsedFraction * winRate,
    );
    const deficit = pacedTarget - winnersInWindow;
    const rawProbability = winRate + (deficit / DAILY_REWARD_TARGET) * PACE_SENSITIVITY * winRate;
    const probability = Math.min(MAX_WIN_PROBABILITY, Math.max(MIN_WIN_PROBABILITY, rawProbability));
    return Math.random() < probability;
  }

  // Past target: soft decay
  const overflow = winnersInWindow - DAILY_REWARD_TARGET + 1;
  const probability = MIN_WIN_PROBABILITY * Math.pow(SOFT_CAP_DECAY, overflow);
  return Math.random() < probability;
}