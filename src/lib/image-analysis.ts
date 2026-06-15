/**
 * Tier-1 image analysis: EXIF extraction and perceptual hashing.
 *
 * Both functions accept a Buffer (the raw upload bytes) and are designed
 * to be called inside the /api/upload route immediately after the file is
 * buffered — before it goes to Cloudinary.
 *
 * Dependency: sharp (already in package.json), exifr (needs npm install exifr)
 */

import sharp from "sharp";

// ─── EXIF ────────────────────────────────────────────────────────────────────

export type ExifFlags = {
    /** Camera / phone make, e.g. "Apple" */
    make: string | null;
    /** Camera / phone model, e.g. "iPhone 14 Pro" */
    model: string | null;
    /** When the photo was taken according to the device clock */
    dateTimeOriginal: string | null;
    /**
     * Editing software tag — Photoshop, GIMP, etc. will leave their name here.
     * AI-generated images have no EXIF at all, which we flag separately.
     */
    software: string | null;
    /**
     * true  → EXIF is completely absent (AI-generated image or stripped manually)
     * false → EXIF exists
     */
    noExif: boolean;
    /**
     * true → EXIF carries a software tag that looks like an image editor,
     *         not a camera app.
     */
    editingToolDetected: boolean;
};

const EDITING_SOFTWARE_PATTERNS = [
    /photoshop/i,
    /lightroom/i,
    /gimp/i,
    /affinity/i,
    /pixelmator/i,
    /canva/i,
    /snapseed/i,
    /vsco/i,
    /facetune/i,
    /picsart/i,
    /adobe/i,
];

export async function extractExifFlags(buffer: Buffer): Promise<ExifFlags> {
    // exifr is ESM-only; we use a dynamic import so this file can stay CJS/TSX-compatible
    let exifr: typeof import("exifr") | null = null;
    try {
        exifr = await import("exifr");
    } catch {
        // exifr not installed yet — return safe no-op flags
        return {
            make: null,
            model: null,
            dateTimeOriginal: null,
            software: null,
            noExif: false,
            editingToolDetected: false,
        };
    }

    let parsed: Record<string, unknown> | null = null;
    try {
        parsed = await exifr.parse(buffer, {
            tiff: true,
            exif: true,
            gps: false,
            icc: false,
            iptc: false,
            xmp: false,
            pick: ["Make", "Model", "DateTimeOriginal", "Software", "DateTime"],
        });
    } catch {
        // parse error → treat as absent
    }

    if (!parsed) {
        return {
            make: null,
            model: null,
            dateTimeOriginal: null,
            software: null,
            noExif: true,
            editingToolDetected: false,
        };
    }

    const software = (parsed.Software as string) ?? null;
    const editingToolDetected = software
        ? EDITING_SOFTWARE_PATTERNS.some((p) => p.test(software))
        : false;

    const dateRaw = parsed.DateTimeOriginal ?? parsed.DateTime;
    const dateTimeOriginal = dateRaw
        ? new Date(dateRaw as string).toISOString()
        : null;

    return {
        make: (parsed.Make as string) ?? null,
        model: (parsed.Model as string) ?? null,
        dateTimeOriginal,
        software,
        noExif: false,
        editingToolDetected,
    };
}

// ─── PERCEPTUAL HASH ─────────────────────────────────────────────────────────

/**
 * Computes a 64-bit difference hash (dHash) of the image.
 *
 * dHash works by:
 *   1. Resize to 9×8 greyscale pixels (72 pixels total)
 *   2. For each row of 9 pixels, compare adjacent pairs → 8 bits per row → 64 bits total
 *   3. Return the result as a 16-char hex string
 *
 * Images that are pixel-identical or compressed differently will get the same hash.
 * Minor crops / brightness changes still produce matching hashes (Hamming distance ≤ 5).
 * This is sufficient to catch verbatim screenshot reuse across users.
 */
export async function computePerceptualHash(buffer: Buffer): Promise<string> {
    // Resize to 9×8, greyscale, no anti-aliasing (we want raw pixel values)
    const { data } = await sharp(buffer)
        .resize(9, 8, { fit: "fill" })
        .greyscale()
        .raw()
        .toBuffer({ resolveWithObject: true });

    let bits = BigInt(0);
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const idx = row * 9 + col;
            if (data[idx] < data[idx + 1]) {
                bits = (bits << BigInt(1)) | BigInt(1);
            } else {
                bits = bits << BigInt(1);
            }
        }
    }

    // 16 hex chars = 64 bits
    return bits.toString(16).padStart(16, "0");
}

/**
 * Hamming distance between two hex-encoded 64-bit hashes.
 * A distance ≤ 10 is considered a near-duplicate.
 */
export function hammingDistance(hashA: string, hashB: string): number {
    const a = BigInt("0x" + hashA);
    const b = BigInt("0x" + hashB);
    let xor = a ^ b;
    let dist = 0;
    while (xor > BigInt(0)) {
        if (xor & BigInt(1)) dist++;
        xor >>= BigInt(1);
    }
    return dist;
}

export const PHASH_DUPLICATE_THRESHOLD = 10;