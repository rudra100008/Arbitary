import {
  DAILY_REWARD_TARGET,
  MIN_WIN_PROBABILITY,
  MAX_WIN_PROBABILITY,
  PACE_SENSITIVITY,
  SOFT_CAP_DECAY,
  ABSOLUTE_MAX_RATE,
  ABSOLUTE_MAX_REWARDS_FLOOR,
} from "./reward-config";

/**
 * Computes the hard cap on winners for today, based on how many people
 * have scanned so far. Grows with crowd size, never falls below the floor.
 */
export function computeAbsoluteMax(scansToday: number): number {
  return Math.max(ABSOLUTE_MAX_REWARDS_FLOOR, Math.floor(scansToday * ABSOLUTE_MAX_RATE));
}

/**
 * Decides whether this submission wins a reward, using a time-based
 * pacing model with a probabilistic soft cap past the target.
 *
 * @param winnersInWindow - rewards already granted today for this outlet
 * @param scansToday      - total entries submitted today for this outlet
 * @param now             - current time
 * @param windowStart     - window open time
 * @param windowEnd       - window close time
 */
export function shouldGrantReward(
  winnersInWindow: number,
  scansToday: number,
  now: Date,
  windowStart: Date,
  windowEnd: Date,
): boolean {
  const absoluteMax = computeAbsoluteMax(scansToday);

  if (winnersInWindow >= absoluteMax) return false;

  if (winnersInWindow < DAILY_REWARD_TARGET) {
    const totalMs = windowEnd.getTime() - windowStart.getTime();
    const elapsedMs = now.getTime() - windowStart.getTime();
    const elapsedFraction = totalMs > 0 ? Math.min(1, Math.max(0, elapsedMs / totalMs)) : 1;
    const pacedTarget = DAILY_REWARD_TARGET * elapsedFraction;
    const deficit = pacedTarget - winnersInWindow;
    const rawProbability = 0.5 + (deficit / DAILY_REWARD_TARGET) * PACE_SENSITIVITY;
    const probability = Math.min(MAX_WIN_PROBABILITY, Math.max(MIN_WIN_PROBABILITY, rawProbability));
    return Math.random() < probability;
  }

  // Past the 10-person target: decay probability per extra winner,
  // but still allowed up to absoluteMax
  const overflow = winnersInWindow - DAILY_REWARD_TARGET + 1;
  const probability = MIN_WIN_PROBABILITY * Math.pow(SOFT_CAP_DECAY, overflow);
  return Math.random() < probability;
}