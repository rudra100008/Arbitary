export interface RateLimitInfo {
  count: number;
  resetTime: number;
}

const rateLimitCache = new Map<string, RateLimitInfo>();

/**
 * Basic in-memory rate limiter for single-process Next.js nodes (e.g. standalone).
 * @param identifier Usually the IP address or a combination of IP and route.
 * @param maxRequests Maximum allowed requests in the time window.
 * @param windowMs Time window in milliseconds.
 * @returns true if allowed, false if rate limited.
 */
export function checkRateLimit(identifier: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now();
  const record = rateLimitCache.get(identifier);

  // Periodically clean up to avoid memory leaks if map grows too large
  if (rateLimitCache.size > 10000) {
    for (const [key, value] of rateLimitCache.entries()) {
      if (value.resetTime < now) {
        rateLimitCache.delete(key);
      }
    }
  }

  if (!record || record.resetTime < now) {
    rateLimitCache.set(identifier, { count: 1, resetTime: now + windowMs });
    return true; // Allowed
  }

  if (record.count >= maxRequests) {
    return false; // Rate limited
  }

  record.count += 1;
  return true; // Allowed
}

export function getIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0] ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}
