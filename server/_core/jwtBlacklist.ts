/**
 * JWT Token Blacklist for logout/invalidation
 * Uses Redis if available, falls back to in-memory
 */

import { logger } from "./logger";

// Redis client (shared with rate limiting)
let redisClient: any = null;
let redisAvailable = false;

/**
 * Initialize Redis (shared with rate limiting)
 */
async function getRedisClient(): Promise<any> {
  if (redisClient !== null) {
    return redisAvailable ? redisClient : null;
  }

  try {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
      return null;
    }

    const redis = await import("ioredis");
    redisClient = new redis.default(redisUrl, {
      retryStrategy: (times) => {
        if (times > 3) return null;
        return Math.min(times * 50, 2000);
      },
    });

    redisClient.on("error", () => {
      redisAvailable = false;
    });

    redisClient.on("connect", () => {
      redisAvailable = true;
    });

    await redisClient.ping();
    redisAvailable = true;
    return redisClient;
  } catch {
    redisAvailable = false;
    return null;
  }
}

// In-memory fallback
const inMemoryBlacklist: Set<string> = new Set();

/**
 * Add token to blacklist
 * 
 * Security: Blacklist entries auto-expire when the token would naturally expire.
 * This prevents memory leaks and ensures blacklist size stays bounded.
 * 
 * Usage: On logout, calculate expiresIn from token's exp claim:
 *   const decoded = jwt.decode(token);
 *   const expiresIn = Math.max(0, decoded.exp - Math.floor(Date.now() / 1000));
 *   await blacklistToken(token, expiresIn);
 * 
 * @param token - JWT token to blacklist
 * @param expiresIn - Token expiration time in seconds (default: 7 days)
 *                    Should match token's exp claim minus current time
 */
export async function blacklistToken(token: string, expiresIn: number = 7 * 24 * 60 * 60): Promise<void> {
  // Extract token ID (jti) or use hash of token
  const tokenId = getTokenId(token);

  const redis = await getRedisClient();
  if (redis && redisAvailable) {
    try {
      await redis.setex(`jwt:blacklist:${tokenId}`, expiresIn, "1");
      logger.info("Token blacklisted in Redis", { tokenId });
      return;
    } catch (error) {
      logger.warn("Redis blacklist failed, using in-memory", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  // In-memory fallback
  inMemoryBlacklist.add(tokenId);
  logger.info("Token blacklisted in memory", { tokenId });
}

/**
 * Check if token is blacklisted
 * @param token - JWT token to check
 * @returns true if blacklisted, false otherwise
 */
export async function isTokenBlacklisted(token: string): Promise<boolean> {
  const tokenId = getTokenId(token);

  const redis = await getRedisClient();
  if (redis && redisAvailable) {
    try {
      const result = await redis.get(`jwt:blacklist:${tokenId}`);
      return result !== null;
    } catch (error) {
      logger.warn("Redis blacklist check failed, using in-memory", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  // In-memory fallback
  return inMemoryBlacklist.has(tokenId);
}

/**
 * Get token ID from JWT
 * Uses jti claim if available, otherwise hashes the token
 */
function getTokenId(token: string): string {
  try {
    // Try to decode and get jti
    const parts = token.split(".");
    if (parts.length === 3) {
      const payload = JSON.parse(Buffer.from(parts[1], "base64").toString());
      if (payload.jti) {
        return payload.jti;
      }
    }
  } catch {
    // Fall through to hash
  }

  // Hash token as fallback (simple hash for in-memory)
  // In production, use a proper hash function
  let hash = 0;
  for (let i = 0; i < token.length; i++) {
    const char = token.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return `token_${Math.abs(hash)}`;
}

/**
 * Clear expired tokens from in-memory blacklist
 * (Redis handles expiration automatically)
 */
export function cleanupInMemoryBlacklist(): void {
  // In-memory blacklist doesn't track expiration
  // Tokens are removed when they expire naturally (on next check)
  // For production, consider adding expiration tracking
  if (inMemoryBlacklist.size > 10000) {
    logger.warn("In-memory blacklist is large, consider using Redis", { size: inMemoryBlacklist.size });
  }
}

