/** Maximum rewards allowed per outlet, per active window. */
export const DEFAULT_DAILY_REWARD_TARGET = 10;
export const MIN_DAILY_REWARD_TARGET = 0;
export const MAX_DAILY_REWARD_TARGET = 500;

/** Days of history used to compute average daily entries per outlet. */
export const AVG_DAILY_ENTRIES_LOOKBACK_DAYS = 14;

/** Require at least this many active days before trusting historical averages. */
export const MIN_HISTORY_DAYS_FOR_AVG = 14;

/** Used when an outlet has no trusted history yet. */
export const FALLBACK_ENTRIES_PER_BUCKET = 12;

/** Early-bucket probability nudge. */
export const EARLY_NUDGE_MULTIPLIER = 1.2;
export const EARLY_NUDGE_WINDOW_FRACTION = 0.25;

/** Probability never goes below/above these, so outcomes stay random even at extremes. */
export const MIN_WIN_PROBABILITY = 0.05;
export const MAX_WIN_PROBABILITY = 0.95;

/** How aggressively probability reacts to being ahead/behind pace. 1.0 = default sensitivity. */
export const PACE_SENSITIVITY = 1.0;

/**
 * The runtime daily target is also a strict hard cap.
 * Once winners reach this value, no more rewards are granted for that outlet/day.
 */
 
/**
 * Early-win ramp reaches full strength at this many scans.
 * Before this point, rewards are possible but probability is scaled down.
 */
export const MIN_SCANS_BEFORE_REWARDS = 20;

/**
 * Shapes early-scan ramp: higher values keep first few scans less likely,
 * while still preserving a non-zero chance for everyone.
 */
export const EARLY_WIN_RAMP_EXPONENT = 1.5;

/**
 * Safety floor so early users always have a non-zero chance.
 */
export const EARLY_WIN_MIN_PROBABILITY = 0.01;

/**
 * Optional guardrail: while still in ramp phase, allow at most this many wins.
 */
export const EARLY_WIN_CAP_BEFORE_RAMP = 2;

/**
 * After this hour (NST, 24h), if winners < runtime daily reward target,
 * probability is boosted aggressively to ensure the target is met
 * before the window closes at midnight.
 * 19 = 7:00 PM NST
 */
export const BOOST_AFTER_HOUR = 19;

/**
 * Bounds for adaptive boost probability (after 7PM, under target).
 */
export const BOOST_MIN_WIN_PROBABILITY = 0.15;
export const BOOST_MAX_WIN_PROBABILITY = 0.75;

/**
 * Blend from base probability toward needed rate as night progresses.
 */
export const BOOST_BLEND_START = 0.35;
export const BOOST_BLEND_END = 0.85;

/**
 * Extra late-day pressure based on deficit ratio.
 */
export const BOOST_URGENCY_FACTOR = 0.30;

/**
 * The reward window, in 24h local Nepal-time hours/minutes.
 * Default: 8:00 AM – midnight (11:59 PM).
 */
export const REWARD_WINDOW_START = { hour: 8, minute: 0 };
export const REWARD_WINDOW_END = { hour: 24, minute: 0 };

/** NST = UTC+5:45. Used to interpret the window above in local time. */
export const NST_OFFSET_MS = (5 * 60 + 45) * 60 * 1000;