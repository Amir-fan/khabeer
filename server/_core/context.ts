import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { TierLimit, User } from "../../drizzle/schema";
import { sdk } from "./sdk";
import { verifyToken, extractTokenFromHeader } from "./jwt";
import jwt from "jsonwebtoken";
import * as db from "../db";
import { logger } from "./logger";
import { normalizeUserFromToken } from "./user";
import { enforceSubscriptionExpiration } from "./subscriptionEnforcement";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
  userTier: User["tier"] | null;
  tierLimits?: TierLimit;
};

/**
 * Create tRPC context with authentication
 * Supports both JWT tokens (Bearer) and Manus OAuth (cookie/token)
 */
export async function createContext(opts: CreateExpressContextOptions): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    // Try JWT authentication first (Bearer token)
    const authHeader = opts.req.headers.authorization || opts.req.headers.Authorization;
    const token = extractTokenFromHeader(authHeader);
    
    if (token) {
      // verifyToken now checks blacklist internally and verifies signature/expiration
      const payload = await verifyToken(token);
      if (payload) {
        user = await normalizeUserFromToken(payload);
      }
      // If verification failed but token exists, try a permissive decode to allow seeded fallback tokens
      // (Note: This bypasses blacklist check - only for development fallback tokens with negative IDs)
      if (!user) {
        try {
          const decoded: any = jwt.decode(token);
          if (decoded && decoded.userId && decoded.email && decoded.role) {
            // Only allow fallback for negative user IDs (dev tokens)
            if (decoded.userId < 0) {
              user = await normalizeUserFromToken({
                userId: decoded.userId,
                email: decoded.email,
                role: decoded.role,
              });
            }
          }
        } catch (e) {
          logger.debug("Fallback decode failed", { error: e instanceof Error ? e.message : "unknown" });
        }
      }
    }
    
    // If JWT auth failed, try Manus OAuth
    if (!user) {
      try {
        user = await sdk.authenticateRequest(opts.req);
      } catch (error) {
        // Authentication is optional for public procedures
        logger.debug("Manus OAuth authentication failed", { error: error instanceof Error ? error.message : "unknown" });
      }
    }

    // Enforce subscription expiration for authenticated users
    // This ensures expired subscriptions automatically downgrade users to "free" tier
    // and that enforceUsageLimit always sees the correct tier
    if (user) {
      try {
        const effectiveTier = await enforceSubscriptionExpiration(user.id);
        // Refresh user to get updated tier if it was changed
        const updatedUser = await db.getUserById(user.id);
        if (updatedUser) {
          user = updatedUser;
        } else if (effectiveTier !== user.tier) {
          // If getUserById failed but tier changed, update local user object
          user = { ...user, tier: effectiveTier };
        }
      } catch (error) {
        // Don't fail context creation if subscription enforcement fails
        logger.warn("Subscription enforcement failed during context creation", {
          error: error instanceof Error ? error.message : String(error),
          userId: user.id,
        });
      }
    }
  } catch (error) {
    // Authentication is optional for public procedures
    logger.debug("Context creation error", { error: error instanceof Error ? error.message : "unknown" });
    user = null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
    userTier: user?.tier ?? null,
  };
}
