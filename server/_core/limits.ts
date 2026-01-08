import { TRPCError } from "@trpc/server";
import { enforceAiLimit, enforceAdvisorChatLimit, UserTier } from "./tier";

type UsageAction = "ai" | "advisor_chat";

/**
 * Enforce plan limits for a single action (AI or advisor chat) and increment usage.
 * This is the single entry point for usage enforcement.
 */
export async function enforceUsageLimit(params: { userId: number; tier: UserTier; action: UsageAction; amount?: number }) {
  const amount = params.amount ?? 1;
  if (params.action === "ai") {
    return enforceAiLimit(params.userId, params.tier, amount);
  }
  if (params.action === "advisor_chat") {
    return enforceAdvisorChatLimit(params.userId, params.tier, amount);
  }
  throw new TRPCError({ code: "BAD_REQUEST", message: "Unsupported usage action." });
}

