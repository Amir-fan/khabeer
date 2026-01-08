/**
 * Rate limiting utilities
 * Simple in-memory rate limiter (for production, use Redis)
 */

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

const store: RateLimitStore = {};

/**
 * Check if request should be rate limited
 * @param key - Unique identifier (IP address, user ID, etc.)
 * @param maxRequests - Maximum requests allowed
 * @param windowMs - Time window in milliseconds
 * @returns Object with allowed status and remaining requests
 */
export function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number,
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const record = store[key];

  // If no record or window expired, create new record
  if (!record || now > record.resetTime) {
    store[key] = {
      count: 1,
      resetTime: now + windowMs,
    };
    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetTime: now + windowMs,
    };
  }

  // Increment count
  record.count += 1;

  // Check if limit exceeded
  if (record.count > maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: record.resetTime,
    };
  }

  return {
    allowed: true,
    remaining: maxRequests - record.count,
    resetTime: record.resetTime,
  };
}

/**
 * Get client IP from request
 * @param req - Express request object
 * @returns IP address string
 */
export function getClientIp(req: { headers: Record<string, string | string[] | undefined> }): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") {
    return forwarded.split(",")[0].trim();
  }
  if (Array.isArray(forwarded) && forwarded.length > 0) {
    return forwarded[0].split(",")[0].trim();
  }
  return "unknown";
}

/**
 * Clean up expired rate limit records (call periodically)
 */
export function cleanupRateLimitStore(): void {
  const now = Date.now();
  for (const key in store) {
    if (store[key].resetTime < now) {
      delete store[key];
    }
  }
}

// Cleanup every 5 minutes
if (typeof setInterval !== "undefined") {
  setInterval(cleanupRateLimitStore, 5 * 60 * 1000);
}

