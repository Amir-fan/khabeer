/**
 * Payment Gateway Placeholder System
 * 
 * This module provides safe placeholders for MyFatoorah integration.
 * 
 * RULES:
 * - Never fake payment success
 * - Never unlock chat without real confirmation
 * - Never mark orders as completed without gateway confirmation
 * - All functions can be safely replaced with real MyFatoorah calls
 */

import { TRPCError } from "@trpc/server";
import * as db from "../db";
import { orders } from "../../drizzle/schema";
import { logger } from "./logger";

/**
 * Create a payment intent placeholder
 * 
 * Creates a pending payment record ONLY. Does not:
 * - Change consultation status
 * - Unlock chat
 * - Assume success
 * 
 * @returns Payment intent ID and placeholder message
 */
export async function createPaymentIntentPlaceholder(params: {
  userId: number;
  requestId: number;
  amountKwd: number;
  currency?: string;
}) {
  const dbClient = await db.getDb();
  if (!dbClient) {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });
  }

  // Create pending order record
  const result = await dbClient
    .insert(orders)
    .values({
      userId: params.userId,
      requestId: params.requestId,
      serviceType: "consultation",
      status: "pending",
      priceKWD: params.amountKwd,
      grossAmountKwd: params.amountKwd,
      currency: params.currency || "KWD",
      gateway: "myfatoorah",
      gatewayReference: "PENDING",
      notes: "Payment gateway not yet connected. Awaiting integration.",
    } as any)
    .returning({ id: orders.id });

  const paymentIntentId = result[0].id;

  logger.info("Payment intent placeholder created", {
    paymentIntentId,
    userId: params.userId,
    requestId: params.requestId,
    amountKwd: params.amountKwd,
  });

  return {
    paymentIntentId,
    message: "Payment pending. Gateway not yet connected.",
    gateway: "myfatoorah",
    status: "pending",
  };
}

/**
 * Confirm payment from gateway (webhook placeholder)
 * 
 * This function MUST throw in placeholder mode.
 * It exists only to be replaced by real MyFatoorah webhook handler.
 * 
 * MUST NOT be callable from frontend.
 */
export async function confirmPaymentFromGateway(params: {
  paymentIntentId: number;
  gatewayPaymentId: string;
  gatewayReference: string;
  amountKwd: number;
}) {
  // PLACEHOLDER: Always throw until MyFatoorah is integrated
  throw new TRPCError({
    code: "NOT_IMPLEMENTED",
    message: "PAYMENT_GATEWAY_NOT_CONNECTED",
  });
}

/**
 * Check if payment is completed (for chat unlock)
 * 
 * Returns true ONLY if order.status === "completed"
 * Pending payments BLOCK chat completely.
 */
export async function isPaymentCompleted(orderId: number): Promise<boolean> {
  const dbClient = await db.getDb();
  if (!dbClient) {
    return false;
  }

  const order = await dbClient
    .select()
    .from(orders)
    .where(db.eq(orders.id, orderId))
    .limit(1);

  if (order.length === 0) {
    return false;
  }

  return order[0].status === "completed";
}

