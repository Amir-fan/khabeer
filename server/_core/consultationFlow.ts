import { TRPCError } from "@trpc/server";
import { consultationRequests, requestStatusEnum } from "../../drizzle/schema";
import * as db from "../db";
import { recordTransaction } from "./transactions";
import { updateOrderByRequest, getOrderByRequest } from "../db";

type Status = (typeof requestStatusEnum.enumValues)[number];

const allowedTransitions: Record<Status, Status[]> = {
  draft: ["submitted"],
  submitted: ["pending_advisor"],
  pending_advisor: ["accepted", "cancelled"],
  accepted: ["payment_reserved", "cancelled"],
  payment_reserved: ["in_progress", "cancelled"],
  in_progress: ["completed", "cancelled"],
  completed: ["released"],
  released: [],
  cancelled: [],
  rejected: [],
  awaiting_payment: [],
  paid: [],
  closed: [],
  rated: [],
};

export function assertConsultationTransition(from: Status, to: Status) {
  const allowed = allowedTransitions[from] || [];
  if (!allowed.includes(to)) {
    throw new TRPCError({ code: "BAD_REQUEST", message: `لا يمكن الانتقال من ${from} إلى ${to}` });
  }
}

export async function reserveConsultationPayment(params: {
  requestId: number;
  userId: number;
  amountKwd: number;
  currency?: string;
}) {
  const request = await db.getConsultationRequest(params.requestId);
  if (!request) throw new TRPCError({ code: "NOT_FOUND", message: "الطلب غير موجود." });
  if (request.userId !== params.userId) throw new TRPCError({ code: "FORBIDDEN", message: "ليس لديك صلاحية لهذا الطلب." });
  if (request.status !== "accepted") {
    throw new TRPCError({ code: "BAD_REQUEST", message: "يجب قبول الطلب قبل الحجز." });
  }
  assertConsultationTransition("accepted", "payment_reserved");
  await recordTransaction({
    userId: params.userId,
    advisorId: request.advisorId ?? null,
    requestId: request.id,
    amountKwd: params.amountKwd,
    currency: params.currency || "KWD",
    type: "consultation",
    status: "pending",
  });
  await db.updateConsultationRequestStatus(request.id, "payment_reserved", params.userId);
  return { status: "payment_reserved" };
}

export async function startConsultation(params: { requestId: number; actorUserId: number }) {
  const request = await db.getConsultationRequest(params.requestId);
  if (!request) throw new TRPCError({ code: "NOT_FOUND", message: "الطلب غير موجود." });
  if (request.status !== "payment_reserved") {
    throw new TRPCError({ code: "BAD_REQUEST", message: "لا يمكن بدء الجلسة قبل حجز الدفع." });
  }
  assertConsultationTransition("payment_reserved", "in_progress");
  await db.updateConsultationRequestStatus(request.id, "in_progress", params.actorUserId);
  return { status: "in_progress" };
}

export async function completeConsultation(params: { requestId: number; actorUserId: number }) {
  const request = await db.getConsultationRequest(params.requestId);
  if (!request) throw new TRPCError({ code: "NOT_FOUND", message: "الطلب غير موجود." });
  if (request.status !== "in_progress") {
    throw new TRPCError({ code: "BAD_REQUEST", message: "لا يمكن إكمال الجلسة قبل بدئها." });
  }
  assertConsultationTransition("in_progress", "completed");
  await db.updateConsultationRequestStatus(request.id, "completed", params.actorUserId);
  return { status: "completed" };
}

export async function releaseConsultationPayment(params: {
  requestId: number;
  actorUserId: number;
  platformFeeBps?: number;
}) {
  const request = await db.getConsultationRequest(params.requestId);
  if (!request) throw new TRPCError({ code: "NOT_FOUND", message: "الطلب غير موجود." });
  if (!["completed"].includes(request.status as string)) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "لا يمكن تحرير الدفعة قبل إكمال الجلسة." });
  }
  const order = await getOrderByRequest(request.id);
  if (!order) throw new TRPCError({ code: "NOT_FOUND", message: "معاملة الحجز غير موجودة." });
  const gross = order.grossAmountKwd ?? order.priceKWD ?? 0;
  const platformFee = params.platformFeeBps ? Math.round((gross * params.platformFeeBps) / 10000) : order.platformFeeKWD ?? Math.round(gross * 0.3);
  const payout = Math.max(gross - platformFee, 0);
  await updateOrderByRequest(request.id, {
    status: "completed",
    netAmountKwd: payout,
    platformFeeKWD: platformFee,
    vendorPayoutKWD: payout,
  } as any);
  assertConsultationTransition("completed", "released");
  await db.updateConsultationRequestStatus(request.id, "released", params.actorUserId);
  return { status: "released", platformFeeKwd: platformFee, advisorPayoutKwd: payout };
}

