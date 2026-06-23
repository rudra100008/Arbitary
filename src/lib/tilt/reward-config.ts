/** How many rewards to aim for per outlet, per active window. */
export const DAILY_REWARD_TARGET = 10;

/** Probability never goes below/above these, so outcomes stay random even at extremes. */
export const MIN_WIN_PROBABILITY = 0.05;
export const MAX_WIN_PROBABILITY = 0.95;

/** How aggressively probability reacts to being ahead/behind pace. 1.0 = default sensitivity. */
export const PACE_SENSITIVITY = 1.0;

/** Each extra winner past target multiplies the probability by this. */
export const SOFT_CAP_DECAY = 0.7;

/**
 * The hard cap on winners grows with total scans today for this outlet:
 *   absoluteMax = max(ABSOLUTE_MAX_REWARDS_FLOOR, scansToday * ABSOLUTE_MAX_RATE)
 *
 * Examples:
 *   30  scans → max(15,  30 * 0.20) = 15   (floor)
 *   100 scans → max(15, 100 * 0.20) = 20
 *   500 scans → max(15, 500 * 0.20) = 100
 */
export const ABSOLUTE_MAX_RATE = 0.20;         // 20% of total scans today
export const ABSOLUTE_MAX_REWARDS_FLOOR = 15;  // minimum cap when scan count is low

/**
 * The reward window, in 24h local Nepal-time hours/minutes.
 * Default: 8:00 AM – midnight (11:59 PM).
 */
export const REWARD_WINDOW_START = { hour: 8, minute: 0 };
export const REWARD_WINDOW_END = { hour: 24, minute: 0 };

/** NST = UTC+5:45. Used to interpret the window above in local time. */
export const NST_OFFSET_MS = (5 * 60 + 45) * 60 * 1000;