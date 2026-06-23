import {
  DAILY_REWARD_TARGET,
  MIN_WIN_PROBABILITY,
  MAX_WIN_PROBABILITY,
  PACE_SENSITIVITY,
} from "./reward-config";

/**
 * Decides whether this submission wins a reward, using a time-based
 * pacing model instead of pure miss-counting.
 *
 *  - Computes how far through today's window we are (elapsedFraction)
 *  - Compares actual winners-so-far against a linear "paced" target
 *  - Behind pace (few winners, lots of time passed)  → high probability
 *  - Ahead of pace (many winners, little time passed) → low probability
 *  - Always clamped to [MIN_WIN_PROBABILITY, MAX_WIN_PROBABILITY]
 *    so no single roll is ever 100% or 0% (until slots are gone)
 */
export function shouldGrantReward(
  winnersInWindow: number,
  now: Date,
  windowStart: Date,
  windowEnd: Date,
): boolean {
  const slotsLeft = DAILY_REWARD_TARGET - winnersInWindow;
  if (slotsLeft <= 0) return false;

  const totalMs = windowEnd.getTime() - windowStart.getTime();
  const elapsedMs = now.getTime() - windowStart.getTime();
  const elapsedFraction = totalMs > 0 ? Math.min(1, Math.max(0, elapsedMs / totalMs)) : 1;

  const pacedTarget = DAILY_REWARD_TARGET * elapsedFraction;
  const deficit = pacedTarget - winnersInWindow;

  const rawProbability = 0.5 + (deficit / DAILY_REWARD_TARGET) * PACE_SENSITIVITY;
  const probability = Math.min(MAX_WIN_PROBABILITY, Math.max(MIN_WIN_PROBABILITY, rawProbability));

  return Math.random() < probability;
}