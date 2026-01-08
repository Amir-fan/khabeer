/**
 * Minimal Consultation Assignment
 * 
 * Simple assignment logic (not smart matching yet).
 * Just ensures consultations are actually assigned.
 */

import { TRPCError } from "@trpc/server";
import { eq, and } from "drizzle-orm";
import * as db from "../db";
import { consultants, requestAssignments, consultationRequests } from "../../drizzle/schema";
import { logger } from "./logger";

/**
 * Assign advisor to consultation (minimal logic)
 * 
 * Picks first available advisor OR manually specified advisor.
 * Creates requestAssignments record.
 * Status remains pending_advisor.
 * 
 * NO ranking logic yet. Just real assignment.
 */
export async function assignAdvisorToConsultation(params: {
  requestId: number;
  advisorId?: number; // If provided, assign to this advisor
}) {
  const dbClient = await db.getDb();
  if (!dbClient) {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });
  }

  // Get consultation
  const request = await db.getConsultationRequest(params.requestId);
  if (!request) {
    throw new TRPCError({ code: "NOT_FOUND", message: "الطلب غير موجود" });
  }

  if (request.status !== "submitted" && request.status !== "pending_advisor") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "لا يمكن تعيين مستشار في هذه الحالة",
    });
  }

  let advisorId: number;

  if (params.advisorId) {
    // Use specified advisor
    const advisor = await dbClient
      .select()
      .from(consultants)
      .where(eq(consultants.id, params.advisorId))
      .limit(1);

    if (advisor.length === 0) {
      throw new TRPCError({ code: "NOT_FOUND", message: "المستشار غير موجود" });
    }

    advisorId = params.advisorId;
  } else {
    // Pick first available advisor
    const availableAdvisors = await dbClient
      .select()
      .from(consultants)
      .where(eq(consultants.status, "active" as any))
      .limit(1);

    if (availableAdvisors.length === 0) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "لا يوجد مستشارون متاحون حالياً",
      });
    }

    advisorId = availableAdvisors[0].id;
  }

  // Check if assignment already exists
  const existing = await dbClient
    .select()
    .from(requestAssignments)
    .where(
      and(
        eq(requestAssignments.requestId, params.requestId),
        eq(requestAssignments.advisorId, advisorId)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    // Assignment already exists
    return {
      assignmentId: existing[0].id,
      advisorId,
      status: existing[0].status,
    };
  }

  // Create assignment
  const result = await dbClient
    .insert(requestAssignments)
    .values({
      requestId: params.requestId,
      advisorId,
      rank: 1, // Simple rank for now
      status: "offered",
    } as any)
    .returning({ id: requestAssignments.id });

  // Update consultation status to pending_advisor if needed
  if (request.status === "submitted") {
    await db.updateConsultationRequestStatus(params.requestId, "pending_advisor", 0);
  }

  logger.info("Consultation assigned", {
    requestId: params.requestId,
    advisorId,
    assignmentId: result[0].id,
  });

  return {
    assignmentId: result[0].id,
    advisorId,
    status: "offered",
  };
}

