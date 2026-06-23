/** How many rewards to guarantee per outlet, per active window. */
export const DAILY_REWARD_TARGET = 10;

/** Probability never goes below/above these, so outcomes stay random even at extremes. */
export const MIN_WIN_PROBABILITY = 0.05;
export const MAX_WIN_PROBABILITY = 0.95;

/** How aggressively probability reacts to being ahead/behind pace. 1.0 = default sensitivity. */
export const PACE_SENSITIVITY = 1.0;

/**
 * The reward window, in 24h local Nepal-time hours/minutes.
 * Outside [WINDOW_START, WINDOW_END) no reward can be granted,
 * even if the random roll is lucky.
 *
 * Default: 8:00 AM – midnight (11:59 PM).
 * For a full midnight-to-midnight day: set start to {0,0} and end to {24,0}.
 */
export const REWARD_WINDOW_START = { hour: 8, minute: 0 };
export const REWARD_WINDOW_END = { hour: 24, minute: 0 }; // 24:00 = next midnight (exclusive)

/** NST = UTC+5:45. Used to interpret the window above in local time. */
export const NST_OFFSET_MS = (5 * 60 + 45) * 60 * 1000;
