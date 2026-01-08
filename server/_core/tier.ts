import { TRPCError } from "@trpc/server";
import { userTierEnum } from "../../drizzle/schema";
import { getTierLimitByTier, getOrCreateUsageCounter, incrementUsageCounter } from "../db";
import { logger } from "./logger";

export type UserTier = typeof userTierEnum.enumValues[number];

export type TierUsageCheckResult = {
  allowed: boolean;
  limit: number | null;
  used: number;
  remaining: number | null;
};

function todayUtc() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

async function checkAndIncrement({
  userId,
  tier,
  amount,
  field,
}: {
  userId: number;
  tier: UserTier;
  amount: number;
  field: "ai" | "advisorChat";
}): Promise<TierUsageCheckResult> {
  const limits = await getTierLimitByTier(tier);
  const limitValue = field === "ai" ? limits.aiDailyLimit : limits.advisorChatDailyLimit;

  if (limitValue === null || limitValue === undefined) {
    // unlimited
    await incrementUsageCounter(userId, todayUtc(), { [field]: amount });
    return { allowed: true, limit: null, used: 0, remaining: null };
  }

  const usage = await getOrCreateUsageCounter(userId, todayUtc());
  const current = field === "ai" ? usage.aiUsed : usage.advisorChatUsed;
  const next = current + amount;

  if (next > limitValue) {
    logger.info("Tier usage limit exceeded", { userId, tier, field, limit: limitValue, used: current });
    return { allowed: false, limit: limitValue, used: current, remaining: Math.max(limitValue - current, 0) };
  }

  await incrementUsageCounter(userId, todayUtc(), { [field]: amount });
  return { allowed: true, limit: limitValue, used: next, remaining: limitValue - next };
}

export async function enforceAiLimit(userId: number, tier: UserTier, amount = 1) {
  const res = await checkAndIncrement({ userId, tier, amount, field: "ai" });
  if (!res.allowed) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "تم بلوغ الحد المسموح للدردشة في الخطة الحالية.",
    });
  }
  return res;
}

export async function enforceAdvisorChatLimit(userId: number, tier: UserTier, amount = 1) {
  const res = await checkAndIncrement({ userId, tier, amount, field: "advisorChat" });
  if (!res.allowed) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "تم بلوغ الحد المسموح للمحادثة مع المستشار في الخطة الحالية.",
    });
  }
  return res;
}

export async function canAccessContracts(tier: UserTier) {
  const limits = await getTierLimitByTier(tier);
  return limits.contractAccessLevel === "full";
}

export async function getTierPriorityWeight(tier: UserTier) {
  const limits = await getTierLimitByTier(tier);
  return limits.priorityWeight ?? 0;
}

export async function getTierDiscountBps(tier: UserTier) {
  const limits = await getTierLimitByTier(tier);
  return limits.discountRateBps ?? 0;
}

/**
 * Check usage limits without incrementing (dry-run mode)
 * Used for UI display of remaining messages/chats
 */
async function checkUsageWithoutIncrement({
  userId,
  tier,
  field,
}: {
  userId: number;
  tier: UserTier;
  field: "ai" | "advisorChat";
}): Promise<TierUsageCheckResult> {
  const limits = await getTierLimitByTier(tier);
  const limitValue = field === "ai" ? limits.aiDailyLimit : limits.advisorChatDailyLimit;

  if (limitValue === null || limitValue === undefined) {
    // unlimited
    return { allowed: true, limit: null, used: 0, remaining: null };
  }

  const usage = await getOrCreateUsageCounter(userId, todayUtc());
  const current = field === "ai" ? usage.aiUsed : usage.advisorChatUsed;
  const remaining = Math.max(limitValue - current, 0);
  const allowed = current < limitValue;

  return { allowed, limit: limitValue, used: current, remaining };
}

/**
 * Get AI usage stats without incrementing (for UI display)
 */
export async function getAiUsageStats(userId: number, tier: UserTier): Promise<TierUsageCheckResult> {
  return checkUsageWithoutIncrement({ userId, tier, field: "ai" });
}

/**
 * Get advisor chat usage stats without incrementing (for UI display)
 */
export async function getAdvisorChatUsageStats(userId: number, tier: UserTier): Promise<TierUsageCheckResult> {
  return checkUsageWithoutIncrement({ userId, tier, field: "advisorChat" });
}

