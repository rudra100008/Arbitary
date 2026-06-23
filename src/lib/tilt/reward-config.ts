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
 */
export const ABSOLUTE_MAX_RATE = 0.20;
export const ABSOLUTE_MAX_REWARDS_FLOOR = 15;

/**
 * No rewards are given until at least this many people have submitted today.
 * Prevents testers / first few real users from winning every time.
 */
export const MIN_SCANS_BEFORE_REWARDS = 20;

/**
 * After this hour (NST, 24h), if winners < DAILY_REWARD_TARGET,
 * probability is boosted aggressively to ensure the target is met
 * before the window closes at midnight.
 * 19 = 7:00 PM NST
 */
export const BOOST_AFTER_HOUR = 19;

/**
 * Win probability used during the boost phase (after 7PM, under target).
 * High enough to reliably fill remaining slots within the remaining hours.
 */
export const BOOST_WIN_PROBABILITY = 0.80;

/**
 * The reward window, in 24h local Nepal-time hours/minutes.
 * Default: 8:00 AM – midnight (11:59 PM).
 */
export const REWARD_WINDOW_START = { hour: 8, minute: 0 };
export const REWARD_WINDOW_END = { hour: 24, minute: 0 };

/** NST = UTC+5:45. Used to interpret the window above in local time. */
export const NST_OFFSET_MS = (5 * 60 + 45) * 60 * 1000;