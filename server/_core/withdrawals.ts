/**
 * Withdrawal System (NO FAKE MONEY EVER)
 * 
 * This module handles advisor withdrawal requests with strict validation.
 * 
 * RULES:
 * - Never deduct balance until real gateway confirms
 * - Never mark as completed without real transfer
 * - All balances calculated from ledger only
 */

import { TRPCError } from "@trpc/server";
import { eq, and, or, desc } from "drizzle-orm";
import * as db from "../db";
import { withdrawalRequests, orders, consultationRequests } from "../../drizzle/schema";
import { logger } from "./logger";
import { computePartnerMetrics } from "./partnerMetrics";

/**
 * Calculate available balance for advisor from ledger
 * 
 * Only counts released consultations (status = "released")
 * and completed orders (status = "completed")
 */
export async function calculateAdvisorBalance(advisorId: number): Promise<number> {
  const dbClient = await db.getDb();
  if (!dbClient) {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });
  }

  // Get all released consultations for this advisor
  const releasedOrders = await dbClient
    .select({
      netAmount: orders.netAmountKwd,
      vendorPayout: orders.vendorPayoutKWD,
    })
    .from(orders)
    .innerJoin(consultationRequests, eq(orders.requestId, consultationRequests.id))
    .where(
      and(
        eq(consultationRequests.advisorId, advisorId),
        eq(consultationRequests.status, "released" as any),
        eq(orders.status, "completed" as any)
      )
    );

  // Sum up net amounts (advisor payout)
  let total = 0;
  for (const order of releasedOrders) {
    total += order.vendorPayout || order.netAmount || 0;
  }

  // Subtract pending/approved withdrawals
  const pendingWithdrawals = await dbClient
    .select({ amount: withdrawalRequests.amountKwd })
    .from(withdrawalRequests)
    .where(
      and(
        eq(withdrawalRequests.advisorId, advisorId),
        or(
          eq(withdrawalRequests.status, "pending" as any),
          eq(withdrawalRequests.status, "approved" as any),
          eq(withdrawalRequests.status, "processing" as any)
        )
      )
    );

  for (const withdrawal of pendingWithdrawals) {
    total -= withdrawal.amount;
  }

  return Math.max(0, total);
}

/**
 * Request withdrawal
 * 
 * Validates available balance and creates withdrawal request.
 * Does NOT deduct balance yet.
 */
export async function requestWithdrawal(params: {
  advisorId: number;
  amountKwd: number;
  bankDetails?: {
    name?: string;
    iban?: string;
    accountName?: string;
  } | null;
  notes?: string | null;
}) {
  const dbClient = await db.getDb();
  if (!dbClient) {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });
  }

  // Validate amount
  if (params.amountKwd <= 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "المبلغ يجب أن يكون أكبر من صفر",
    });
  }

  // Calculate available balance
  const availableBalance = await calculateAdvisorBalance(params.advisorId);

  if (params.amountKwd > availableBalance) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `الرصيد المتاح غير كافٍ. الرصيد المتاح: ${availableBalance / 1000} KWD`,
    });
  }

  // Create withdrawal request
  const result = await dbClient
    .insert(withdrawalRequests)
    .values({
      advisorId: params.advisorId,
      amountKwd: params.amountKwd,
      status: "pending",
      bankDetails: params.bankDetails || null,
      notes: params.notes || null,
    } as any)
    .returning({ id: withdrawalRequests.id });

  logger.info("Withdrawal request created", {
    withdrawalId: result[0].id,
    advisorId: params.advisorId,
    amountKwd: params.amountKwd,
  });

  return {
    withdrawalId: result[0].id,
    status: "pending",
    message: "تم إرسال طلب السحب. في انتظار الموافقة.",
  };
}

/**
 * Approve withdrawal (admin only)
 * 
 * Changes status to "approved" but does NOT:
 * - Send money
 * - Mark as completed
 */
export async function approveWithdrawal(params: {
  withdrawalId: number;
  adminUserId: number;
}) {
  const dbClient = await db.getDb();
  if (!dbClient) {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });
  }

  const result = await dbClient
    .update(withdrawalRequests)
    .set({
      status: "approved",
      approvedBy: params.adminUserId,
      approvedAt: new Date(),
      updatedAt: new Date(),
    } as any)
    .where(eq(withdrawalRequests.id, params.withdrawalId))
    .returning({ id: withdrawalRequests.id });

  if (result.length === 0) {
    throw new TRPCError({ code: "NOT_FOUND", message: "طلب السحب غير موجود" });
  }

  logger.info("Withdrawal approved", {
    withdrawalId: params.withdrawalId,
    adminUserId: params.adminUserId,
  });

  return {
    withdrawalId: params.withdrawalId,
    status: "approved",
    message: "تمت الموافقة على طلب السحب. في انتظار التحويل.",
  };
}

/**
 * Reject withdrawal (admin only)
 */
export async function rejectWithdrawal(params: {
  withdrawalId: number;
  adminUserId: number;
  reason?: string | null;
}) {
  const dbClient = await db.getDb();
  if (!dbClient) {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });
  }

  const result = await dbClient
    .update(withdrawalRequests)
    .set({
      status: "rejected",
      rejectedAt: new Date(),
      rejectionReason: params.reason || null,
      updatedAt: new Date(),
    } as any)
    .where(eq(withdrawalRequests.id, params.withdrawalId))
    .returning({ id: withdrawalRequests.id });

  if (result.length === 0) {
    throw new TRPCError({ code: "NOT_FOUND", message: "طلب السحب غير موجود" });
  }

  logger.info("Withdrawal rejected", {
    withdrawalId: params.withdrawalId,
    adminUserId: params.adminUserId,
    reason: params.reason,
  });

  return {
    withdrawalId: params.withdrawalId,
    status: "rejected",
  };
}

/**
 * Complete withdrawal (placeholder for gateway integration)
 * 
 * MUST throw until real gateway is connected.
 * This function exists only to be replaced later.
 */
export async function completeWithdrawal(params: {
  withdrawalId: number;
  gatewayReference: string;
}) {
  // PLACEHOLDER: Always throw until gateway is integrated
  throw new TRPCError({
    code: "NOT_IMPLEMENTED",
    message: "WITHDRAWALS_NOT_CONNECTED_TO_GATEWAY",
  });
}

/**
 * List withdrawals for advisor
 */
export async function listAdvisorWithdrawals(advisorId: number) {
  const dbClient = await db.getDb();
  if (!dbClient) {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });
  }

  const withdrawals = await dbClient
    .select()
    .from(withdrawalRequests)
    .where(eq(withdrawalRequests.advisorId, advisorId))
    .orderBy(desc(withdrawalRequests.createdAt));

  return withdrawals.map((w) => ({
    id: w.id,
    amountKwd: w.amountKwd,
    status: w.status,
    bankDetails: w.bankDetails,
    notes: w.notes,
    approvedAt: w.approvedAt,
    rejectedAt: w.rejectedAt,
    rejectionReason: w.rejectionReason,
    createdAt: w.createdAt,
  }));
}

/**
 * List all withdrawals (admin)
 */
export async function listAllWithdrawals(status?: string) {
  const dbClient = await db.getDb();
  if (!dbClient) {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });
  }

  let query = dbClient.select().from(withdrawalRequests);

  if (status) {
    query = query.where(eq(withdrawalRequests.status, status as any)) as any;
  }

  const withdrawals = await query.orderBy(desc(withdrawalRequests.createdAt));

  return withdrawals;
}

