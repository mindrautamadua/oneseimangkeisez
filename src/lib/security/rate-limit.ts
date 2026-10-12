/**
 * Simple fixed-window in-memory rate limiter. Adequate for a single portal instance.
 * For multi-instance deployments replace with a shared store (e.g. Redis) or enforce
 * at the reverse proxy / WAF. See docs/SECURITY.md.
 */
const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, limit: number, windowMs: number, now = Date.now()): boolean {
  const b = buckets.get(key);
  if (!b || b.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    if (buckets.size > 10_000) {
      for (const [k, v] of buckets) if (v.resetAt <= now) buckets.delete(k);
    }
    return true;
  }
  b.count += 1;
  return b.count <= limit;
}

export function clientIp(headers: Headers): string {
  // Only trustworthy when the portal sits behind a reverse proxy that sets this header.
  return headers.get("x-forwarded-for")?.split(",")[0]?.trim() || headers.get("x-real-ip") || "unknown";
}
