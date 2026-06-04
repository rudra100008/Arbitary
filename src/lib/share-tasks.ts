import { nanoid } from "nanoid";

export function generateShareCode(): string {
    return nanoid(10);
}

export function getShareTaskUrl(shareCode: string): string {
    const base = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXTAUTH_URL || "";
    return `${base}/r/${shareCode}`;
}
