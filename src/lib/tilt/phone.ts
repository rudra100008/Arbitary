import { createHash } from 'crypto';

export function normalisePhone(raw: string, countryCode: string): string {
    const digits = raw.replace(/\D/g, '');
    const normalisedCountryCode = countryCode.replace(/\D/g, '') || '977';

    if (!digits) {
        return '';
    }

    if (digits.startsWith('0')) {
        return `${normalisedCountryCode}${digits.slice(1)}`;
    }

    return digits;
}

export function hashPhone(normalised: string): string {
    return createHash('sha256').update(normalised).digest('hex');
}
