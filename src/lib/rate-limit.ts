/**
 * Simple in-memory rate limiter for auth endpoints.
 * Tracks requests per IP+path key with a sliding window.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Clean up expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now > entry.resetAt) {
      store.delete(key);
    }
  }
}, 5 * 60 * 1000);

interface RateLimitOptions {
  maxRequests: number;
  windowMs: number;
}

const DEFAULTS: RateLimitOptions = {
  maxRequests: 10,
  windowMs: 15 * 60 * 1000, // 15 minutes
};

export function checkRateLimit(
  ip: string,
  path: string,
  options?: Partial<RateLimitOptions>
): { allowed: boolean; retryAfterMs: number } {
  const { maxRequests, windowMs } = { ...DEFAULTS, ...options };
  const key = `${ip}:${path}`;
  const now = Date.now();

  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterMs: 0 };
  }

  entry.count++;

  if (entry.count > maxRequests) {
    return { allowed: false, retryAfterMs: entry.resetAt - now };
  }

  return { allowed: true, retryAfterMs: 0 };
}
