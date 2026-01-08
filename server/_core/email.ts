/**
 * Email System Placeholder
 * 
 * Central email dispatcher that does NOT fake sending.
 * 
 * RULES:
 * - Always returns { delivered: false, reason: "EMAIL_NOT_CONFIGURED" }
 * - Logs all email attempts
 * - Can be safely replaced with real email service (SendGrid, AWS SES, etc.)
 */

import { logger } from "./logger";

export type EmailType = "password_reset" | "partner_approval" | "consultation_update" | "general";

export interface EmailParams {
  to: string;
  type: EmailType;
  data?: Record<string, any>;
  subject?: string;
  body?: string;
}

/**
 * Send email placeholder
 * 
 * Logs email attempt but does NOT actually send.
 * Returns failure status so UI can show appropriate message.
 */
export async function sendEmailPlaceholder(params: EmailParams): Promise<{
  delivered: boolean;
  reason: string;
}> {
  logger.info("Email placeholder called", {
    to: params.to,
    type: params.type,
    subject: params.subject,
  });

  // PLACEHOLDER: Always return not configured
  return {
    delivered: false,
    reason: "EMAIL_NOT_CONFIGURED",
  };
}

