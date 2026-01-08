import { assertConsultationTransition } from "./consultationFlow";
import { getTierDiscountBps, getTierPriorityWeight } from "./tier";
import * as db from "../db";

type CreateConsultationParams = {
  userId: number;
  userTier: string;
  summary: string;
  files?: { fileId: number; name: string }[] | null;
  grossAmountKwd?: number | null;
  serviceType?: string | null; // kept for future use; stored via existing fields only
};

/**
 * Create a consultation request with ownership, pricing snapshot, and initial state.
 * This single function is the entry point for website-originated consultations.
 * It writes directly to consultation_requests so admin/partner dashboards can consume.
 */
export async function createConsultationRecord(params: CreateConsultationParams) {
  const tier = (params.userTier || "free") as any;
  const priorityWeight = await getTierPriorityWeight(tier);
  const discountRateBps = await getTierDiscountBps(tier);
  const gross = params.grossAmountKwd ?? null;
  const discountAmount = gross !== null ? Math.round((gross * discountRateBps) / 10000) : null;
  const netAmount = gross !== null && discountAmount !== null ? gross - discountAmount : null;

  const requestId = await db.createConsultationRequest({
    userId: params.userId,
    userTierSnapshot: tier,
    status: "submitted",
    priorityWeight,
    discountRateBps,
    grossAmountKwd: gross,
    discountAmountKwd: discountAmount,
    netAmountKwd: netAmount,
    currency: "KWD",
    summary: params.summary,
    files: params.files || null,
  });

  // Move to pending_advisor (no new states introduced)
  assertConsultationTransition("submitted", "pending_advisor");
  await db.updateConsultationRequestStatus(requestId, "pending_advisor", params.userId);

  return {
    id: requestId,
    status: "pending_advisor",
    priorityWeight,
    discountRateBps,
    grossAmountKwd: gross,
    netAmountKwd: netAmount,
  };
}

