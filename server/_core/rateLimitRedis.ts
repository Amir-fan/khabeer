/**
 * Redis-backed rate limiting for production
 * Falls back to in-memory if Redis is unavailable
 */

import { logger } from "./logger";

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
}

// Redis client (lazy-loaded)
let redisClient: any = null;
let redisAvailable = false;

/**
 * Initialize Redis client
 * Returns true if Redis is available, false otherwise
 */
async function initRedis(): Promise<boolean> {
  if (redisClient !== null) {
    return redisAvailable;
  }

  try {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
      logger.warn("REDIS_URL not set, using in-memory rate limiting");
      redisAvailable = false;
      return false;
    }

    // Dynamic import to avoid requiring redis in dev
    const redis = await import("ioredis");
    redisClient = new redis.default(redisUrl, {
      retryStrategy: (times) => {
        if (times > 3) {
          logger.error("Redis connection failed after 3 retries, falling back to in-memory");
          redisAvailable = false;
          return null; // Stop retrying
        }
        return Math.min(times * 50, 2000);
      },
      maxRetriesPerRequest: 3,
    });

    redisClient.on("error", (error: Error) => {
      logger.error("Redis error", error);
      redisAvailable = false;
    });

    redisClient.on("connect", () => {
      logger.info("Redis connected for rate limiting");
      redisAvailable = true;
    });

    // Test connection
    await redisClient.ping();
    redisAvailable = true;
    return true;
  } catch (error) {
    logger.warn("Redis initialization failed, using in-memory rate limiting", {
      error: error instanceof Error ? error.message : String(error),
    });
    redisAvailable = false;
    return false;
  }
}

// In-memory fallback store
const inMemoryStore: Map<string, { count: number; resetTime: number }> = new Map();

/**
 * Check rate limit using Redis (with in-memory fallback)
 */
export async function checkRateLimitRedis(
  key: string,
  maxRequests: number,
  windowMs: number,
): Promise<RateLimitResult> {
  // Initialize Redis if not already done
  if (redisClient === null) {
    await initRedis();
  }

  const now = Date.now();
  const resetTime = now + windowMs;

  // Try Redis first
  if (redisAvailable && redisClient) {
    try {
      const redisKey = `ratelimit:${key}`;
      const current = await redisClient.get(redisKey);
      
      if (current === null) {
        // First request in window
        await redisClient.setex(redisKey, Math.ceil(windowMs / 1000), "1");
        return {
          allowed: true,
          remaining: maxRequests - 1,
          resetTime,
        };
      }

      const count = parseInt(current, 10);
      if (count >= maxRequests) {
        const ttl = await redisClient.ttl(redisKey);
        return {
          allowed: false,
          remaining: 0,
          resetTime: now + (ttl * 1000),
        };
      }

      // Increment counter
      const newCount = await redisClient.incr(redisKey);
      return {
        allowed: true,
        remaining: maxRequests - newCount,
        resetTime,
      };
    } catch (error) {
      logger.warn("Redis rate limit check failed, falling back to in-memory", {
        error: error instanceof Error ? error.message : String(error),
      });
      redisAvailable = false;
      // Fall through to in-memory
    }
  }

  // In-memory fallback
  const record = inMemoryStore.get(key);
  
  if (!record || now > record.resetTime) {
    inMemoryStore.set(key, {
      count: 1,
      resetTime,
    });
    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetTime,
    };
  }

  record.count += 1;
  
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
 * Cleanup in-memory store (for fallback mode)
 */
export function cleanupInMemoryStore(): void {
  const now = Date.now();
  for (const [key, record] of inMemoryStore.entries()) {
    if (now > record.resetTime) {
      inMemoryStore.delete(key);
    }
  }
}

// Cleanup every 5 minutes
if (typeof setInterval !== "undefined") {
  setInterval(cleanupInMemoryStore, 5 * 60 * 1000);
}

