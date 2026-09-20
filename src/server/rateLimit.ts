/**
 * Fixed-window rate limiter.
 * In-memory for dev / single instance. Production on Vercel: back this with
 * Upstash Redis (INCR + EXPIRE) so limits hold across serverless instances.
 */
const g = globalThis as unknown as { __rl?: Map<string, { count: number; resetAt: number }> };
const buckets = (g.__rl ??= new Map());

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (b.count >= limit) return false;
  b.count += 1;
  return true;
}
