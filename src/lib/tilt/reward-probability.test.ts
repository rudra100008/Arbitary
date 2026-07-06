import { describe, expect, it } from "vitest";
import { getWinProbability } from "./reward-probability";

describe("getWinProbability", () => {
  it("returns 0 when bucket budget is exhausted", () => {
    const probability = getWinProbability(
      {
        bucketStart: new Date("2026-01-01T10:00:00.000Z"),
        bucketEnd: new Date("2026-01-01T12:00:00.000Z"),
        targetWinners: 1,
        winnersGivenInBucket: 1,
        estimatedEntries: 50,
      },
      new Date("2026-01-01T10:30:00.000Z"),
    );

    expect(probability).toBe(0);
  });

  it("returns a bounded probability between 0 and 1", () => {
    const probability = getWinProbability(
      {
        bucketStart: new Date("2026-01-01T10:00:00.000Z"),
        bucketEnd: new Date("2026-01-01T12:00:00.000Z"),
        targetWinners: 1,
        winnersGivenInBucket: 0,
        estimatedEntries: 20,
      },
      new Date("2026-01-01T10:30:00.000Z"),
    );

    expect(probability).toBeGreaterThan(0);
    expect(probability).toBeLessThanOrEqual(1);
  });
});
