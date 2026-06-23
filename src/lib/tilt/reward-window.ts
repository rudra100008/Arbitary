import {
  NST_OFFSET_MS,
  REWARD_WINDOW_START,
  REWARD_WINDOW_END,
} from "./reward-config";

/**
 * Returns the UTC start/end instants of *today's* reward window,
 * based on REWARD_WINDOW_START / REWARD_WINDOW_END.
 */
export function getRewardWindow(referenceDate = new Date()): {
  start: Date;
  end: Date;
} {
  const nowNst = new Date(referenceDate.getTime() + NST_OFFSET_MS);

  const midnightNst = new Date(nowNst);
  midnightNst.setUTCHours(0, 0, 0, 0);

  const startNst = new Date(midnightNst);
  startNst.setUTCHours(REWARD_WINDOW_START.hour, REWARD_WINDOW_START.minute, 0, 0);

  const endNst = new Date(midnightNst);
  endNst.setUTCHours(REWARD_WINDOW_END.hour, REWARD_WINDOW_END.minute, 0, 0);
  // .hour can be 24 — setUTCHours(24, ...) correctly rolls into the next day

  const start = new Date(startNst.getTime() - NST_OFFSET_MS);
  const end = new Date(endNst.getTime() - NST_OFFSET_MS);

  return { start, end };
}

/** True if `now` falls inside today's configured reward window. */
export function isWithinRewardWindow(now = new Date()): boolean {
  const { start, end } = getRewardWindow(now);
  return now >= start && now < end;
}
