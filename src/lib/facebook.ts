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
}


/** Generate a deterministic verification code for a user+task combination */
export function getVerificationCode(userId: number, taskId: number): string {
    const date = new Date().toISOString().slice(0, 10);
    const raw = `${userId}-${taskId}-${date}`;
    let hash = 0;
    for (let i = 0; i < raw.length; i++) {
        hash = ((hash << 5) - hash) + raw.charCodeAt(i);
        hash |= 0;
    }
    // Use full positive 32-bit hash as base-36 (6-7 chars) → ~2.1B values per day
    return `#v${Math.abs(hash).toString(36)}`;
}


export async function getPagePosts(): Promise<Post[]> {
    const pageId = process.env.FACEBOOK_PAGE_ID;
    const token = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;


    if (!pageId || !token) {
        throw new Error(
            "FACEBOOK_PAGE_ID or FACEBOOK_PAGE_ACCESS_TOKEN is missing from .env"
        );
    }

    const url = new URL(`${GRAPH_API_BASE}/${pageId}/posts`);
    url.searchParams.set("access_token", token);
    url.searchParams.set(
        "fields",
        "id,message,created_time,full_picture,permalink_url,likes.summary(true)"
    );
    url.searchParams.set("limit", "10");

    const res = await fetch(url.toString(), { next: { revalidate: 60 } });
    const data = await res.json();

    if (data.error) {
        throw new Error(`Facebook API error: ${data.error.message}`);
    }

    return data.data as Post[];
}


/**
 * Check if a verification code appears in any comment on the post.
 * Uses the Page Access Token (no special user permissions needed).
 */
export async function findCodeInComments(
    postId: string,
    code: string
): Promise<LikeCheckResult> {
    const pageToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;

    if (!pageToken) {
        return {
            liked: false,
            userId: "",
            postId,
            checkedAt: new Date().toISOString(),
            error: "FACEBOOK_PAGE_ACCESS_TOKEN is missing from .env",
        };
    }

    const url = new URL(`${GRAPH_API_BASE}/${postId}/comments`);
    url.searchParams.set("access_token", pageToken);
    url.searchParams.set("limit", "1000");
    url.searchParams.set("fields", "from,message,created_time");

    const res = await fetch(url.toString());
    const data = await res.json();

    if (data.error) {
        console.error("[/lib/facebook] Comments Graph API error:", JSON.stringify(data.error));
        return {
            liked: false,
            userId: "",
            postId,
            checkedAt: new Date().toISOString(),
            error: data.error.message,
        };
    }

    const found = Array.isArray(data.data) && data.data.some(
        (c: { message?: string }) =>
            c.message && c.message.includes(code)
    );

    return {
        liked: found,
        userId: code,
        postId,
        checkedAt: new Date().toISOString(),
    };
}


/**
 * Fallback: check if any comment's from.id matches the given ASID.
 * Only works if the Page Access Token has pages_read_user_content.
 */
export async function checkUserCommentedOnPost(
    postId: string,
    _userAccessToken: string,
    asid: string
): Promise<LikeCheckResult> {
    const pageToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;

    if (!pageToken) {
        return {
            liked: false,
            userId: asid,
            postId,
            checkedAt: new Date().toISOString(),
            error: "FACEBOOK_PAGE_ACCESS_TOKEN is missing from .env",
        };
    }

    const url = new URL(`${GRAPH_API_BASE}/${postId}/comments`);
    url.searchParams.set("access_token", pageToken);
    url.searchParams.set("limit", "1000");
    url.searchParams.set("fields", "from,message,created_time");

    const res = await fetch(url.toString());
    const data = await res.json();

    if (data.error) {
        console.error("[/lib/facebook] Comment check Graph API error:", JSON.stringify(data.error));
        return {
            liked: false,
            userId: asid,
            postId,
            checkedAt: new Date().toISOString(),
            error: data.error.message,
        };
    }

    const commented =
        Array.isArray(data.data) &&
        data.data.some(
            (comment: { from?: { id: string } }) =>
                comment.from?.id?.toString() === asid.toString()
        );

    return {
        liked: commented,
        userId: asid,
        postId,
        checkedAt: new Date().toISOString(),
    };
}
