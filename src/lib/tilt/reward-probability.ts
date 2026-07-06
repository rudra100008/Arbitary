import {
  EARLY_NUDGE_MULTIPLIER,
  EARLY_NUDGE_WINDOW_FRACTION,
} from "./reward-config";

export type RewardBucketProbabilityInput = {
  bucketStart: Date;
  bucketEnd: Date;
  targetWinners: number;
  winnersGivenInBucket: number;
  estimatedEntries: number;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function interpolate(from: number, to: number, fraction: number): number {
  return from + (to - from) * fraction;
}

export function getWinProbability(
  bucket: RewardBucketProbabilityInput,
  now: Date,
): number {
  if (bucket.targetWinners <= bucket.winnersGivenInBucket) {
    return 0;
  }

  const totalMs = bucket.bucketEnd.getTime() - bucket.bucketStart.getTime();
  if (totalMs <= 0) {
    return 0;
  }

  const elapsedMs = now.getTime() - bucket.bucketStart.getTime();
  const fractionElapsed = clamp(elapsedMs / totalMs, 0, 1);
  const fractionLeft = clamp(1 - fractionElapsed, 0, 1);

  const estimatedRemainingEntries = Math.max(
    bucket.estimatedEntries * fractionLeft,
    0,
  );
  const remainingWinners = Math.max(
    bucket.targetWinners - bucket.winnersGivenInBucket,
    0,
  );

  const denominator = Math.max(estimatedRemainingEntries, remainingWinners, 1);
  let probability = remainingWinners / denominator;
  probability = clamp(probability, 0, 1);

  if (fractionElapsed <= EARLY_NUDGE_WINDOW_FRACTION) {
    const taperProgress =
      EARLY_NUDGE_WINDOW_FRACTION <= 0
        ? 1
        : clamp(fractionElapsed / EARLY_NUDGE_WINDOW_FRACTION, 0, 1);
    const boost = interpolate(EARLY_NUDGE_MULTIPLIER, 1, taperProgress);
    probability = Math.min(probability * boost, 1);
  }

  return probability;
}
