

export const MIN_PROMOTION_AGE = 21;


export function calculateAge(dateOfBirth: Date | string, now: Date = new Date()): number {
    const dob = typeof dateOfBirth === "string" ? new Date(dateOfBirth) : dateOfBirth;

    let age = now.getFullYear() - dob.getFullYear();
    const monthDiff = now.getMonth() - dob.getMonth();
    const dayDiff = now.getDate() - dob.getDate();

    if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
        age -= 1;
    }

    return age;
}

/**
 * Returns true only if dateOfBirth is present, parses to a valid date, and
 * the calculated age is >= minAge. Missing/invalid dates are always
 * ineligible — callers must not treat "unknown" as "eligible".
 */
export function isEligibleAge(
    dateOfBirth: Date | string | null | undefined,
    minAge: number = MIN_PROMOTION_AGE,
): boolean {
    if (!dateOfBirth) return false;

    const dob = typeof dateOfBirth === "string" ? new Date(dateOfBirth) : dateOfBirth;
    if (Number.isNaN(dob.getTime())) return false;

    // Reject dates in the future — not a real birthday.
    if (dob.getTime() > Date.now()) return false;

    return calculateAge(dob) >= minAge;
}
