/**
 * Centralized subscription expiration enforcement
 * 
 * Ensures expired subscriptions automatically downgrade users to "free" tier.
 * This function is idempotent and safe to call on every authenticated request.
 * 
 * Process:
 * 1. Check if user has active subscription
 * 2. If subscription exists and endDate is in the past:
 *    - Set subscription status to "expired"
 *    - Downgrade user.tier to "free"
 * 3. Return the effective tier (pro if active subscription, free otherwise)
 */

import { eq, and, lte, desc, inArray } from "drizzle-orm";
import * as db from "../db";
import { subscriptions, users } from "../../drizzle/schema";
import { logger } from "./logger";

/**
 * Enforce subscription expiration for a user
 * 
 * This function is idempotent - calling it multiple times with the same state
 * will produce the same result. Safe to call on every authenticated request.
 * 
 * @param userId - User ID to check
 * @returns Effective tier ("pro" if active subscription, "free" otherwise)
 */
export async function enforceSubscriptionExpiration(userId: number): Promise<"free" | "pro"> {
  const dbClient = await db.getDb();
  if (!dbClient) {
    logger.warn("Database not available for subscription enforcement", { userId });
    return "free"; // Safe default
  }

  try {
    // Get active subscription for user
    const activeSubscription = await dbClient
      .select()
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.userId, userId),
          eq(subscriptions.status, "active")
        )
      )
      .orderBy(desc(subscriptions.createdAt))
      .limit(1);

    if (activeSubscription.length === 0) {
      // No active subscription - ensure user is on free tier
      const user = await db.getUserById(userId);
      if (user && user.tier !== "free") {
        await dbClient
          .update(users)
          .set({ tier: "free" })
          .where(eq(users.id, userId));
        logger.info("User downgraded to free (no active subscription)", { userId });
      }
      return "free";
    }

    const subscription = activeSubscription[0];
    const now = new Date();

    // Check if subscription is expired
    if (subscription.endDate && subscription.endDate < now) {
      // Subscription expired - mark as expired and downgrade user
      await dbClient
        .update(subscriptions)
        .set({
          status: "expired",
          updatedAt: now,
        })
        .where(eq(subscriptions.id, subscription.id));

      // Downgrade user to free tier
      await dbClient
        .update(users)
        .set({ tier: "free" })
        .where(eq(users.id, userId));

      logger.info("Subscription expired and user downgraded", {
        userId,
        subscriptionId: subscription.id,
        endDate: subscription.endDate,
      });

      return "free";
    }

    // Subscription is active - ensure user is on pro tier
    const user = await db.getUserById(userId);
    if (user && user.tier !== "pro") {
      await dbClient
        .update(users)
        .set({ tier: "pro" })
        .where(eq(users.id, userId));
      logger.info("User upgraded to pro (active subscription)", { userId });
    }

    return "pro";
  } catch (error) {
    logger.error("Subscription enforcement failed", {
      error: error instanceof Error ? error.message : String(error),
      userId,
    });
    // On error, return "free" as safe default
    return "free";
  }
}

/**
 * Batch enforce subscription expiration for multiple users
 * Useful for scheduled jobs
 * 
 * @param userIds - Array of user IDs to check (optional, if not provided checks all users with active subscriptions)
 * @returns Number of users downgraded
 */
export async function batchEnforceSubscriptionExpiration(userIds?: number[]): Promise<number> {
  const dbClient = await db.getDb();
  if (!dbClient) {
    logger.warn("Database not available for batch subscription enforcement");
    return 0;
  }

  try {
    let expiredSubscriptions;

    if (userIds && userIds.length > 0) {
      // Check specific users
      expiredSubscriptions = await dbClient
        .select({
          userId: subscriptions.userId,
          subscriptionId: subscriptions.id,
          endDate: subscriptions.endDate,
        })
        .from(subscriptions)
        .where(
          and(
            eq(subscriptions.status, "active"),
            lte(subscriptions.endDate, new Date()),
            inArray(subscriptions.userId, userIds)
          )
        );
    } else {
      // Check all active subscriptions
      expiredSubscriptions = await dbClient
        .select({
          userId: subscriptions.userId,
          subscriptionId: subscriptions.id,
          endDate: subscriptions.endDate,
        })
        .from(subscriptions)
        .where(
          and(
            eq(subscriptions.status, "active"),
            lte(subscriptions.endDate, new Date())
          )
        );
    }

    if (expiredSubscriptions.length === 0) {
      return 0;
    }

    // Get unique user IDs
    const uniqueUserIds = [...new Set(expiredSubscriptions.map((s) => s.userId))];

    // Mark subscriptions as expired
    const subscriptionIds = expiredSubscriptions.map((s) => s.subscriptionId);
    await dbClient
      .update(subscriptions)
      .set({
        status: "expired",
        updatedAt: new Date(),
      })
      .where(inArray(subscriptions.id, subscriptionIds));

    // Downgrade users to free tier
    await dbClient
      .update(users)
      .set({ tier: "free" })
      .where(inArray(users.id, uniqueUserIds));

    logger.info("Batch subscription enforcement completed", {
      usersDowngraded: uniqueUserIds.length,
      subscriptionsExpired: expiredSubscriptions.length,
    });

    return uniqueUserIds.length;
  } catch (error) {
    logger.error("Batch subscription enforcement failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return 0;
  }
}

