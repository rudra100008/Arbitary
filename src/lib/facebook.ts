import crypto from "crypto";
import { checkCommentQuality, type CommentQualityOptions } from "./comment-quality";
import { db } from "@/src/db";
import { usersTable } from "@/src/db/schema";
import { eq } from "drizzle-orm";
import { decryptToken } from "./token-crypto";

const GRAPH_API_BASE = "https://graph.facebook.com/v20.0";

export interface Post {
    id: string;
    message: string;
    created_time: string;
    full_picture?: string;
    permalink_url?: string;
    likes?: { summary: { total_count: number } };
    comments?: { summary: { total_count: number } };
    shares?: { summary: { total_count: number } };
}

export interface LikeCheckResult {
    liked: boolean
    userId: string;
    postId: string;
    checkedAt: string;
    error?: string;
    /** The full text of the matching comment, if one was found. */
    commentText?: string;
    /**
     * True if the matching comment contains more than just the bare
     * verification code (i.e. it looks like a genuine human comment).
     * Only present when `liked` is true.
     */
    hasQualityComment?: boolean;
}

export type FbCredsResult =
  | { ok: true; pageId: string; pageAccessToken: string }
  | { ok: false; reason: "NOT_CONFIGURED" | "DECRYPT_FAILED" };

/**
 * Resolve the Facebook Page ID and access token for the given admin user.
 * Returns a typed result distinguishing "never connected" from "token corrupted".
 */
export async function getAdminFbCredentials(adminUserId?: number): Promise<FbCredsResult> {
    if (!adminUserId) return { ok: false, reason: "NOT_CONFIGURED" };

    const [user] = await db
        .select({
            fbPageId: usersTable.fbPageId,
            fbPageAccessToken: usersTable.fbPageAccessToken,
        })
        .from(usersTable)
        .where(eq(usersTable.id, adminUserId))
        .limit(1);

    if (!user?.fbPageId || !user?.fbPageAccessToken) {
        return { ok: false, reason: "NOT_CONFIGURED" };
    }

    try {
        const decrypted = decryptToken(user.fbPageAccessToken, 'facebook');
        if (!decrypted) {
            return { ok: false, reason: "NOT_CONFIGURED" };
        }
        return { ok: true, pageId: user.fbPageId, pageAccessToken: decrypted };
    } catch (err) {
        console.error(
            `[facebook] Failed to decrypt fbPageAccessToken for admin user ${adminUserId} — ` +
            `key mismatch (see round-6 fix). The Facebook Page must be reconnected.`,
            err,
        );
        await db.update(usersTable)
            .set({ fbPageAccessToken: null, fbPageId: null, fbPageName: null })
            .where(eq(usersTable.id, adminUserId))
            .catch((e) => console.error("[facebook] Failed to clear corrupted fbPageAccessToken:", e));
        return { ok: false, reason: "DECRYPT_FAILED" };
    }
}

/** Generate a deterministic verification code for a user+task combination */
export function getVerificationCode(userId: number, taskId: number, prefix: string = '#fb'): string {
    const date = new Date().toISOString().slice(0, 10);
    const secret = process.env.YOUTUBE_CHALLENGE_SECRET || process.env.NEXTAUTH_SECRET || "";
    return `${prefix}${crypto
        .createHash("sha256")
        .update(`${date}:${userId}:${taskId}:${secret}`)
        .digest("hex")
        .slice(0, 8)}`;
}

export async function getPagePosts(adminUserId?: number): Promise<Post[]> {
    const creds = await getAdminFbCredentials(adminUserId);

    if (!creds.ok) {
        throw new Error("Facebook Page credentials are not configured. Connect a Facebook account in Admin Settings.");
    }

    const url = new URL(`${GRAPH_API_BASE}/${creds.pageId}/posts`);
    url.searchParams.set("access_token", creds.pageAccessToken);
    url.searchParams.set("fields", "id,message,created_time,full_picture,permalink_url,likes.summary(true)");
    url.searchParams.set("limit", "10");

    const res = await fetch(url.toString(), { next: { revalidate: 60 } });
    const data = await res.json();

    if (data.error) {
        throw new Error(`Facebook API error: ${data.error.message}`);
    }

    return data.data as Post[];
}

export async function findCodeInComments(
    postId: string,
    code: string,
    qualityOptions?: CommentQualityOptions,
    adminUserId?: number,
): Promise<LikeCheckResult> {
    const creds = await getAdminFbCredentials(adminUserId);

    if (!creds.ok) {
        const error = creds.reason === "DECRYPT_FAILED"
            ? "FB_TOKEN_EXPIRED"
            : "FB_NOT_CONFIGURED";
        return { liked: false, userId: "", postId, checkedAt: new Date().toISOString(), error };
    }

    const url = new URL(`${GRAPH_API_BASE}/${postId}/comments`);
    url.searchParams.set("access_token", creds.pageAccessToken);
    url.searchParams.set("limit", "1000");
    url.searchParams.set("fields", "from,message,created_time");

    const res = await fetch(url.toString());
    const data = await res.json();

    if (data.error) {
        return { liked: false, userId: "", postId, checkedAt: new Date().toISOString(), error: data.error.message };
    }

    const match = Array.isArray(data.data)
        ? data.data.find((c: { message?: string }) => c.message && c.message.includes(code))
        : undefined;

    if (!match) {
        return { liked: false, userId: code, postId, checkedAt: new Date().toISOString() };
    }

    const quality = checkCommentQuality(match.message, code, qualityOptions);

    return {
        liked: true,
        userId: code,
        postId,
        checkedAt: new Date().toISOString(),
        commentText: match.message,
        hasQualityComment: quality.isQualityComment,
    };
}

export async function checkUserCommentedOnPost(
    postId: string,
    _userAccessToken: string,
    asid: string,
    code?: string,
    qualityOptions?: CommentQualityOptions,
    adminUserId?: number,
): Promise<LikeCheckResult> {
    const creds = await getAdminFbCredentials(adminUserId);

    if (!creds.ok) {
        const error = creds.reason === "DECRYPT_FAILED"
            ? "FB_TOKEN_EXPIRED"
            : "FB_NOT_CONFIGURED";
        return { liked: false, userId: asid, postId, checkedAt: new Date().toISOString(), error };
    }

    const url = new URL(`${GRAPH_API_BASE}/${postId}/comments`);
    url.searchParams.set("access_token", creds.pageAccessToken);
    url.searchParams.set("limit", "1000");
    url.searchParams.set("fields", "from,message,created_time");

    const res = await fetch(url.toString());
    const data = await res.json();

    if (data.error) {
        return { liked: false, userId: asid, postId, checkedAt: new Date().toISOString(), error: data.error.message };
    }

    const match = Array.isArray(data.data)
        ? data.data.find(
            (comment: { from?: { id: string }; message?: string }) => comment.from?.id?.toString() === asid.toString(),
        )
        : undefined;

    if (!match) {
        return { liked: false, userId: asid, postId, checkedAt: new Date().toISOString() };
    }

    // If no code was supplied, fall back to the old behaviour: any comment
    // from this user on the post counts.
    if (!code) {
        return { liked: true, userId: asid, postId, checkedAt: new Date().toISOString(), commentText: match.message };
    }

    const hasCode = !!match.message && match.message.includes(code);
    const quality = checkCommentQuality(match.message, code, qualityOptions);

    return {
        liked: hasCode,
        userId: asid,
        postId,
        checkedAt: new Date().toISOString(),
        commentText: match.message,
        hasQualityComment: hasCode && quality.isQualityComment,
    };
}
