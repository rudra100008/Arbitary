/**
 * Predefined rejection reasons shown to admins as quick-select options when
 * rejecting a submission. Shared between the admin UI (client) and the
 * validation schema (server) so they stay in sync.
 */
export const REJECTION_REASON_PRESETS = [
    "Invalid Screenshot",
    "Incomplete Proof",
    "Wrong Account",
    "Blurry Image",
    "Suspected Manipulation",
] as const;

export type RejectionReasonPreset = (typeof REJECTION_REASON_PRESETS)[number];