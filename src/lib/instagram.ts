import { checkCommentQuality, type CommentQualityOptions } from "./comment-quality";
import { db } from "@/src/db";
import { usersTable } from "@/src/db/schema";
import { eq } from "drizzle-orm";
import { decryptToken } from "./token-crypto";

interface InstagramMedia {
    id: string;
    caption: string | null;
    media_type: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM';
    media_url: string;
    thumbnail_url?: string;
    permalink: string;
}

interface InstagramComment {
    id: string;
    text: string;
    username: string;
}

export type IgCredsResult =
  | { ok: true; userId: string; accessToken: string }
  | { ok: false; reason: "NOT_CONFIGURED" | "DECRYPT_FAILED" };

/**
 * Resolve Instagram credentials for the given admin user.
 * Returns a typed result distinguishing "never connected" from "token corrupted".
 */
async function getAdminIgCredentials(adminUserId?: number): Promise<IgCredsResult> {
    if (!adminUserId) return { ok: false, reason: "NOT_CONFIGURED" };

    const [user] = await db
        .select({
            fbIgUserId: usersTable.fbIgUserId,
            fbPageAccessToken: usersTable.fbPageAccessToken,
        })
        .from(usersTable)
        .where(eq(usersTable.id, adminUserId))
        .limit(1);

    if (!user?.fbIgUserId || !user?.fbPageAccessToken) {
        return { ok: false, reason: "NOT_CONFIGURED" };
    }

    try {
        const decrypted = decryptToken(user.fbPageAccessToken, 'facebook');
        if (!decrypted) {
            return { ok: false, reason: "NOT_CONFIGURED" };
        }
        return { ok: true, userId: user.fbIgUserId, accessToken: decrypted };
    } catch (err) {
        console.error(
            `[instagram] Failed to decrypt fbPageAccessToken for admin user ${adminUserId} — ` +
            `key mismatch. The Facebook/Instagram connection must be re-established.`,
            err,
        );
        await db.update(usersTable)
            .set({ fbPageAccessToken: null, fbPageId: null, fbPageName: null, fbIgUserId: null })
            .where(eq(usersTable.id, adminUserId))
            .catch((e) => console.error("[instagram] Failed to clear corrupted fbPageAccessToken:", e));
        return { ok: false, reason: "DECRYPT_FAILED" };
    }
}

export class InstagramService {
    private static baseUrl = 'https://graph.facebook.com/v20.0';

    /**
     * Fetch recent media from the Instagram account
     */
    static async getInstagramMedia(adminUserId?: number) {
        const creds = await getAdminIgCredentials(adminUserId);
        if (!creds.ok) {
            throw new Error('Instagram API credentials missing. Connect a Facebook account with an Instagram account in Admin Settings.');
        }

        try {
            const url = new URL(`${this.baseUrl}/${creds.userId}/media`);
            url.searchParams.set('fields', 'id,caption,media_type,media_url,thumbnail_url,permalink');
            url.searchParams.set('access_token', creds.accessToken);

            const response = await fetch(url.toString());
            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData?.error?.message || `Instagram API error: ${response.status}`);
            }
            const data = await response.json();
            return data.data as InstagramMedia[];
        } catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            console.error('Error fetching Instagram media:', msg);
            throw error;
        }
    }

    /**
     * Check if a verification code appears in any comment on the media post.
     */
    static async findCodeInComments(
        mediaId: string,
        code: string,
        expectedUsername: string,
        qualityOptions?: CommentQualityOptions,
        adminUserId?: number,
    ) {
        const creds = await getAdminIgCredentials(adminUserId);
        if (!creds.ok) {
            const errorMsg = creds.reason === "DECRYPT_FAILED"
                ? "Instagram verification needs to be reconnected by an admin."
                : "Instagram API access token missing";
            throw new Error(errorMsg);
        }

        const url = new URL(`${this.baseUrl}/${mediaId}/comments`);
        url.searchParams.set('fields', 'id,text,username');
        url.searchParams.set('access_token', creds.accessToken);
        url.searchParams.set('limit', '1000');

        const response = await fetch(url.toString());
        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData?.error?.message || `Instagram API error: ${response.status}`);
        }

        const json = await response.json() as { data: InstagramComment[] };

        const match = (json.data || []).find(comment => {
            const containsCode = comment.text?.toLowerCase().includes(code.toLowerCase());
            const usernameMatches = comment.username.toLowerCase() === expectedUsername.toLowerCase();
            return containsCode && usernameMatches;
        });

        if (!match) {
            return { found: false as const };
        }

        const quality = checkCommentQuality(match.text, code, qualityOptions);

        return {
            found: true as const,
            commentId: match.id,
            commentText: match.text,
            hasQualityComment: quality.isQualityComment,
        };
    }
}
