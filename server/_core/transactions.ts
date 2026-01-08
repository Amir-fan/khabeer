import { TRPCError } from "@trpc/server";
import { orders } from "../../drizzle/schema";
import * as db from "../db";

export type TransactionType = "subscription" | "consultation" | "payout" | "withdrawal";

/**
 * Record a financial transaction into the orders ledger.
 * serviceType will mirror the transaction type.
 * Status defaults to "completed" unless provided.
 */
export async function recordTransaction(params: {
  userId?: number | null;
  advisorId?: number | null;
  requestId?: number | null;
  amountKwd: number;
  currency?: string;
  type: TransactionType;
  platformFeeKwd?: number | null;
  vendorPayoutKwd?: number | null;
  status?: typeof orders.$inferSelect.status;
}) {
  const dbClient = await db.getDb();
  if (!dbClient) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

  const gross = params.amountKwd;
  const platformFee = params.platformFeeKwd ?? Math.round(gross * 0.3);
  const payout = params.vendorPayoutKwd ?? Math.max(gross - platformFee, 0);

  const result = await dbClient
    .insert(orders)
    .values({
      userId: params.userId ?? 0,
      requestId: params.requestId ?? null,
      serviceType: params.type,
      status: params.status ?? "pending",
      priceKWD: gross,
      grossAmountKwd: gross,
      netAmountKwd: payout,
      currency: params.currency || "KWD",
      platformFeeKWD: platformFee,
      vendorPayoutKWD: payout,
      advisorId: params.advisorId ?? null as any,
    } as any)
    .returning({ id: orders.id });

  return { transactionId: result[0].id };
}

