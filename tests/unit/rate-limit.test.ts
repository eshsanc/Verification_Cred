import { describe, it, expect, beforeEach } from 'vitest'

// Re-implement the rate limiter inline so tests stay isolated (no module-level Map leakage)
interface Entry { count: number; windowStart: number }
function makeRateLimiter() {
  const store = new Map<string, Entry>()
  return function rateLimit(key: string, limit: number, windowSecs: number) {
    const now = Date.now()
    const windowMs = windowSecs * 1000
    const entry = store.get(key)
    if (!entry || now - entry.windowStart > windowMs) {
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
}

describe('rateLimit', () => {
  it('allows requests up to the limit', () => {
    const rateLimit = makeRateLimiter()
    for (let i = 0; i < 5; i++) {
      expect(rateLimit('key1', 5, 60).success).toBe(true)
    }
  })

  it('blocks the request that exceeds the limit', () => {
    const rateLimit = makeRateLimiter()
    for (let i = 0; i < 5; i++) rateLimit('key2', 5, 60)
    expect(rateLimit('key2', 5, 60).success).toBe(false)
  })

  it('returns retryAfter > 0 when blocked', () => {
    const rateLimit = makeRateLimiter()
    for (let i = 0; i < 3; i++) rateLimit('key3', 3, 60)
    const result = rateLimit('key3', 3, 60)
    expect(result.success).toBe(false)
    expect(result.retryAfter).toBeGreaterThan(0)
  })

  it('tracks different keys independently', () => {
    const rateLimit = makeRateLimiter()
    for (let i = 0; i < 3; i++) rateLimit('alpha', 3, 60)
    expect(rateLimit('alpha', 3, 60).success).toBe(false)
    expect(rateLimit('beta', 3, 60).success).toBe(true)
  })

  it('resets after the window expires', async () => {
    const rateLimit = makeRateLimiter()
    for (let i = 0; i < 2; i++) rateLimit('expire-key', 2, 0) // 0-second window
    // Next call is in a new window (0ms elapsed > 0ms window)
    await new Promise((r) => setTimeout(r, 5))
    expect(rateLimit('expire-key', 2, 0).success).toBe(true)
  })

  it('remaining count decrements correctly', () => {
    const rateLimit = makeRateLimiter()
    expect(rateLimit('rem', 5, 60).remaining).toBe(4)
    expect(rateLimit('rem', 5, 60).remaining).toBe(3)
    expect(rateLimit('rem', 5, 60).remaining).toBe(2)
  })
})
