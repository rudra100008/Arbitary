import {
  DEFAULT_DAILY_REWARD_TARGET,
  MIN_WIN_PROBABILITY,
  MAX_WIN_PROBABILITY,
  PACE_SENSITIVITY,
  MIN_SCANS_BEFORE_REWARDS,
  EARLY_WIN_RAMP_EXPONENT,
  EARLY_WIN_MIN_PROBABILITY,
  EARLY_WIN_CAP_BEFORE_RAMP,
} from "./reward-config";

export function computeAbsoluteMax(scansToday: number, dailyRewardTarget: number = DEFAULT_DAILY_REWARD_TARGET): number {
  void scansToday;
  return dailyRewardTarget;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function elapsedFraction(now: Date, windowStart: Date, windowEnd: Date): number {
  const totalMs = windowEnd.getTime() - windowStart.getTime();
  const elapsedMs = now.getTime() - windowStart.getTime();
  return totalMs > 0 ? clamp(elapsedMs / totalMs, 0, 1) : 1;
}

function basePacedProbability(
  winnersInWindow: number,
  scansToday: number,
  dailyRewardTarget: number,
  now: Date,
  windowStart: Date,
  windowEnd: Date,
): number {
  const fraction = elapsedFraction(now, windowStart, windowEnd);
  const winRate = dailyRewardTarget / scansToday;
  const pacedTarget = Math.min(
    dailyRewardTarget * fraction,
    scansToday * fraction * winRate,
  );
  const deficit = pacedTarget - winnersInWindow;
  const rawProbability = winRate + (deficit / dailyRewardTarget) * PACE_SENSITIVITY * winRate;
  return clamp(rawProbability, MIN_WIN_PROBABILITY, MAX_WIN_PROBABILITY);
}

function applyEarlyRamp(probability: number, scansToday: number): number {
  const threshold = Math.max(1, MIN_SCANS_BEFORE_REWARDS);
  const ramp = Math.pow(clamp(scansToday / threshold, 0, 1), EARLY_WIN_RAMP_EXPONENT);
  return Math.max(EARLY_WIN_MIN_PROBABILITY, probability * ramp);
}

/**
 * Decides whether this submission wins a reward.
 *
 * Uses normal time-based pacing with early fairness ramp.
 * After winners reaches DAILY_REWARD_TARGET, no further rewards are granted.
 */
export function shouldGrantReward(
  winnersInWindow: number,
  scansToday: number,
  now: Date,
  windowStart: Date,
  windowEnd: Date,
  dailyRewardTarget: number = DEFAULT_DAILY_REWARD_TARGET,
): boolean {
  const absoluteMax = computeAbsoluteMax(scansToday, dailyRewardTarget);
  if (winnersInWindow >= absoluteMax) return false;

  // Normal pacing
  if (winnersInWindow < dailyRewardTarget) {
    const baseProbability = basePacedProbability(winnersInWindow, scansToday, dailyRewardTarget, now, windowStart, windowEnd);
    const rampedProbability = applyEarlyRamp(baseProbability, scansToday);

    if (scansToday < MIN_SCANS_BEFORE_REWARDS && winnersInWindow >= EARLY_WIN_CAP_BEFORE_RAMP) {
      return false;
    }

    const probability = clamp(rampedProbability, MIN_WIN_PROBABILITY, MAX_WIN_PROBABILITY);
    return Math.random() < probability;
  }

  return false;
}