/**
 * In-memory sliding window rate limiter.
 * For production at scale, swap to Redis-backed implementation.
 */

interface RateLimitEntry {
  timestamps: number[];
}

const store = new Map<string, RateLimitEntry>();

// Clean up expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    entry.timestamps = entry.timestamps.filter(
      (t) => now - t < 15 * 60 * 1000 // keep 15 min of data
    );
    if (entry.timestamps.length === 0) {
      store.delete(key);
    }
  }
}, 5 * 60 * 1000);

interface RateLimitConfig {
  /** Maximum number of requests in the window */
  maxRequests: number;
  /** Window size in seconds */
  windowSeconds: number;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

/**
 * Check if a request is within rate limits.
 * @param key - Unique identifier (e.g., IP address, user ID)
 * @param config - Rate limit configuration
 */
export function checkRateLimit(
  key: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now();
  const windowMs = config.windowSeconds * 1000;

  let entry = store.get(key);
  if (!entry) {
    entry = { timestamps: [] };
    store.set(key, entry);
  }

  // Remove timestamps outside the window
  entry.timestamps = entry.timestamps.filter((t) => now - t < windowMs);

  if (entry.timestamps.length >= config.maxRequests) {
    const oldestInWindow = entry.timestamps[0];
    const retryAfterMs = windowMs - (now - oldestInWindow);
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.ceil(retryAfterMs / 1000),
    };
  }

  entry.timestamps.push(now);
  return {
    allowed: true,
    remaining: config.maxRequests - entry.timestamps.length,
    retryAfterSeconds: 0,
  };
}

// Preset configurations
export const RATE_LIMITS = {
  /** Login: 5 attempts per 15 minutes */
  login: { maxRequests: 5, windowSeconds: 900 },
  /** Registration: 3 per hour */
  register: { maxRequests: 3, windowSeconds: 3600 },
  /** API general: 100 per minute */
  api: { maxRequests: 100, windowSeconds: 60 },
  /** MFA verification: 5 per 5 minutes */
  mfa: { maxRequests: 5, windowSeconds: 300 },
  /** Password reset: 3 per hour */
  passwordReset: { maxRequests: 3, windowSeconds: 3600 },
  /** Agent auth: 10 per minute */
  agentAuth: { maxRequests: 10, windowSeconds: 60 },
} as const;
