import {
  DEFAULT_DAILY_REWARD_TARGET,
  EARLY_WIN_CAP_BEFORE_RAMP,
  EARLY_WIN_MIN_PROBABILITY,
  EARLY_WIN_RAMP_EXPONENT,
  MAX_WIN_PROBABILITY,
  MIN_SCANS_BEFORE_REWARDS,
  MIN_WIN_PROBABILITY,
  PACE_SENSITIVITY,
} from "../src/lib/tilt/reward-config";
import { computeAbsoluteMax } from "../src/lib/tilt/reward-roll";

const DAILY_REWARD_TARGET = DEFAULT_DAILY_REWARD_TARGET;

type DayResult = {
  winners: number;
  preBoostWinners: number;
  postBoostWinners: number;
};

type Summary = {
  submissions: number;
  trials: number;
  avgWinners: number;
  minWinners: number;
  maxWinners: number;
  p50Winners: number;
  p90Winners: number;
  targetHitRate: number;
  above10Rate: number;
  avgPreBoostWinners: number;
  avgPostBoostWinners: number;
};

const WINDOW_START = new Date("2026-06-23T08:00:00+05:45");
const WINDOW_END = new Date("2026-06-24T00:00:00+05:45");

const TRIALS = 5000;
const SUBMISSION_BUCKETS = [3, 6, 10, 15, 30, 60, 100, 250, 500];

function randomTimeInWindow(): Date {
  const span = WINDOW_END.getTime() - WINDOW_START.getTime();
  return new Date(WINDOW_START.getTime() + Math.random() * span);
}

function percentile(sortedValues: number[], p: number): number {
  if (sortedValues.length === 0) return 0;
  const index = Math.floor((sortedValues.length - 1) * p);
  return sortedValues[index];
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function elapsedFraction(now: Date, windowStart: Date, windowEnd: Date): number {
  const totalMs = windowEnd.getTime() - windowStart.getTime();
  const elapsedMs = now.getTime() - windowStart.getTime();
  return totalMs > 0 ? clamp(elapsedMs / totalMs, 0, 1) : 1;
}

function applyEarlyRamp(probability: number, scansToday: number): number {
  const threshold = Math.max(1, MIN_SCANS_BEFORE_REWARDS);
  const ramp = Math.pow(clamp(scansToday / threshold, 0, 1), EARLY_WIN_RAMP_EXPONENT);
  return Math.max(EARLY_WIN_MIN_PROBABILITY, probability * ramp);
}

function basePacedProbability(
  winnersInWindow: number,
  scansToday: number,
  now: Date,
  windowStart: Date,
  windowEnd: Date,
): number {
  const fraction = elapsedFraction(now, windowStart, windowEnd);
  const winRate = DAILY_REWARD_TARGET / scansToday;
  const pacedTarget = Math.min(DAILY_REWARD_TARGET * fraction, scansToday * fraction * winRate);
  const deficit = pacedTarget - winnersInWindow;
  const raw = winRate + (deficit / DAILY_REWARD_TARGET) * PACE_SENSITIVITY * winRate;
  return clamp(raw, MIN_WIN_PROBABILITY, MAX_WIN_PROBABILITY);
}

function shouldGrantRewardNoBoost(
  winnersInWindow: number,
  scansToday: number,
  now: Date,
  windowStart: Date,
  windowEnd: Date,
): boolean {
  const absoluteMax = computeAbsoluteMax(scansToday);
  if (winnersInWindow >= absoluteMax) return false;

  if (winnersInWindow < DAILY_REWARD_TARGET) {
    const baseProbability = basePacedProbability(winnersInWindow, scansToday, now, windowStart, windowEnd);
    const rampedProbability = applyEarlyRamp(baseProbability, scansToday);

    if (scansToday < MIN_SCANS_BEFORE_REWARDS && winnersInWindow >= EARLY_WIN_CAP_BEFORE_RAMP) {
      return false;
    }

    return Math.random() < clamp(rampedProbability, MIN_WIN_PROBABILITY, MAX_WIN_PROBABILITY);
  }

  const overflow = winnersInWindow - DAILY_REWARD_TARGET + 1;
  const probability = MIN_WIN_PROBABILITY * Math.pow(0.7, overflow);
  return Math.random() < probability;
}

function simulateOneDay(totalSubmissions: number): DayResult {
  const times = Array.from({ length: totalSubmissions }, randomTimeInWindow).sort(
    (a, b) => a.getTime() - b.getTime(),
  );

  let winners = 0;
  let preBoostWinners = 0;
  let postBoostWinners = 0;

  for (let i = 0; i < times.length; i++) {
    const now = times[i];
    if (shouldGrantRewardNoBoost(winners, i + 1, now, WINDOW_START, WINDOW_END)) {
      winners++;

      // In no-boost mode this split is just before/after 7PM distribution, not boost effect.
      const hour = now.toLocaleString("en-US", {
        hour: "numeric",
        hour12: false,
        timeZone: "Asia/Kathmandu",
      });
      if (Number(hour) >= 19) postBoostWinners++;
      else preBoostWinners++;
    }
  }

  return { winners, preBoostWinners, postBoostWinners };
}

function summarize(submissions: number, trials: number): Summary {
  const results: DayResult[] = [];
  for (let t = 0; t < trials; t++) {
    results.push(simulateOneDay(submissions));
  }

  const winners = results.map((r) => r.winners).sort((a, b) => a - b);
  const preBoost = results.map((r) => r.preBoostWinners);
  const postBoost = results.map((r) => r.postBoostWinners);

  const sumWinners = winners.reduce((acc, value) => acc + value, 0);
  const targetHitCount = winners.filter((w) => w >= DAILY_REWARD_TARGET).length;
  const above10Count = winners.filter((w) => w > DAILY_REWARD_TARGET).length;

  const avgPreBoostWinners = preBoost.reduce((acc, value) => acc + value, 0) / trials;
  const avgPostBoostWinners = postBoost.reduce((acc, value) => acc + value, 0) / trials;

  return {
    submissions,
    trials,
    avgWinners: sumWinners / trials,
    minWinners: winners[0],
    maxWinners: winners[winners.length - 1],
    p50Winners: percentile(winners, 0.5),
    p90Winners: percentile(winners, 0.9),
    targetHitRate: targetHitCount / trials,
    above10Rate: above10Count / trials,
    avgPreBoostWinners,
    avgPostBoostWinners,
  };
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function run(): void {
  console.log(`Extended reward simulation - no boost (${TRIALS} trials per bucket)`);
  console.log(
    `submissions | avg/min/p50/p90/max | >=${DAILY_REWARD_TARGET} | >${DAILY_REWARD_TARGET} | avg pre-7PM / post-7PM`,
  );

  for (const submissions of SUBMISSION_BUCKETS) {
    const s = summarize(submissions, TRIALS);

    console.log(
      [
        `${s.submissions.toString().padStart(11)}`,
        `${s.avgWinners.toFixed(2)}/${s.minWinners}/${s.p50Winners}/${s.p90Winners}/${s.maxWinners}`.padEnd(24),
        formatPercent(s.targetHitRate).padStart(8),
        formatPercent(s.above10Rate).padStart(5),
        `${s.avgPreBoostWinners.toFixed(2)} / ${s.avgPostBoostWinners.toFixed(2)}`.padStart(18),
      ].join(" | "),
    );
  }
}

run();
