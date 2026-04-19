/**
 * In-process rate limiter using a sliding window algorithm.
 * Works without an external Redis dependency — suitable for single-instance Vercel deployments.
 * For multi-instance deployments, swap this out for @upstash/ratelimit + @upstash/redis.
 */

interface RateLimitEntry {
  count: number
  windowStart: number
}

const store = new Map<string, RateLimitEntry>()

export interface RateLimitResult {
  success: boolean
  /** Remaining requests allowed in the current window */
  remaining: number
  /** Seconds until the window resets */
  retryAfter: number
}

/**
 * Checks and increments the rate limit counter for a given key.
 *
 * @param key        - Unique identifier (e.g. IP address, email)
 * @param limit      - Max requests allowed per window
 * @param windowSecs - Window duration in seconds
 */
export function rateLimit(key: string, limit: number, windowSecs: number): RateLimitResult {
  const now = Date.now()
  const windowMs = windowSecs * 1000

  const entry = store.get(key)

  if (!entry || now - entry.windowStart > windowMs) {
    // Purge stale entries periodically to prevent unbounded memory growth.
    if (store.size > 10_000) {
      for (const [k, v] of store) {
        if (now - v.windowStart > windowMs) store.delete(k)
      }
    }
    store.set(key, { count: 1, windowStart: now })
    return { success: true, remaining: limit - 1, retryAfter: 0 }
  }

  if (entry.count >= limit) {
    const retryAfter = Math.ceil((windowMs - (now - entry.windowStart)) / 1000)
    return { success: false, remaining: 0, retryAfter }
  }

  entry.count++
  return { success: true, remaining: limit - entry.count, retryAfter: 0 }
}

/**
 * Extracts the best available identifier from a Request for rate limiting.
 * Uses the x-forwarded-for header (set by Vercel) or falls back to a constant.
 */
export function getRequestKey(request: Request, suffix: string): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const ip = forwarded ? forwarded.split(',')[0]!.trim() : 'unknown'
  return `${ip}:${suffix}`
}
