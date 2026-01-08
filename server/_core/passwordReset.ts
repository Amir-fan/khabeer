/**
 * Password Reset System
 * 
 * Secure password recovery flow with token-based reset.
 */

import { TRPCError } from "@trpc/server";
import { eq, and, gt } from "drizzle-orm";
import crypto from "crypto";
import * as db from "../db";
import { passwordResetTokens, users } from "../../drizzle/schema";
import { hashPassword } from "./auth";
import { logger } from "./logger";
import { sendEmailPlaceholder } from "./email";

/**
 * Generate secure random token
 */
function generateResetToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Hash reset token for storage
 */
function hashResetToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * Request password reset
 * 
 * Generates secure token, stores hash in DB, sends notification.
 */
export async function requestPasswordReset(email: string) {
  const dbClient = await db.getDb();
  if (!dbClient) {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });
  }

  // Find user by email
  const user = await db.getUserByEmail(email);
  if (!user) {
    // Don't reveal if email exists (security best practice)
    // Still return success to prevent email enumeration
    return {
      success: true,
      message: "إذا كان البريد الإلكتروني مسجلاً، سيتم إرسال رابط إعادة التعيين",
    };
  }

  // Generate token
  const token = generateResetToken();
  const tokenHash = hashResetToken(token);
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

  // Store token hash in DB
  await dbClient.insert(passwordResetTokens).values({
    userId: user.id,
    tokenHash,
    expiresAt,
  } as any);

  // Send email (placeholder)
  await sendEmailPlaceholder({
    to: email,
    type: "password_reset",
    data: {
      token,
      expiresIn: 30, // minutes
    },
  });

  logger.info("Password reset requested", {
    userId: user.id,
    email,
    expiresAt,
  });

  return {
    success: true,
    message: "إذا كان البريد الإلكتروني مسجلاً، سيتم إرسال رابط إعادة التعيين",
  };
}

/**
 * Reset password with token
 * 
 * Validates token, hashes new password, invalidates all tokens.
 */
export async function resetPassword(params: {
  token: string;
  newPassword: string;
}) {
  const dbClient = await db.getDb();
  if (!dbClient) {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });
  }

  // Hash token for lookup
  const tokenHash = hashResetToken(params.token);

  // Find valid token
  const tokenRecord = await dbClient
    .select()
    .from(passwordResetTokens)
    .where(
      and(
        eq(passwordResetTokens.tokenHash, tokenHash),
        eq(passwordResetTokens.usedAt, null as any),
        gt(passwordResetTokens.expiresAt, new Date())
      )
    )
    .limit(1);

  if (tokenRecord.length === 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "رمز إعادة التعيين غير صالح أو منتهي الصلاحية",
    });
  }

  const token = tokenRecord[0];

  // Get user
  const user = await db.getUserById(token.userId);
  if (!user) {
    throw new TRPCError({ code: "NOT_FOUND", message: "المستخدم غير موجود" });
  }

  // Hash new password
  const passwordHash = await hashPassword(params.newPassword);

  // Update user password
  await dbClient
    .update(users)
    .set({
      password: passwordHash,
      updatedAt: new Date(),
    } as any)
    .where(eq(users.id, user.id));

  // Mark token as used
  await dbClient
    .update(passwordResetTokens)
    .set({ usedAt: new Date() } as any)
    .where(eq(passwordResetTokens.id, token.id));

  // Invalidate all other reset tokens for this user
  await dbClient
    .update(passwordResetTokens)
    .set({ usedAt: new Date() } as any)
    .where(
      and(
        eq(passwordResetTokens.userId, user.id),
        eq(passwordResetTokens.usedAt, null as any)
      )
    );

  logger.info("Password reset completed", {
    userId: user.id,
  });

  return {
    success: true,
    message: "تم إعادة تعيين كلمة المرور بنجاح",
  };
}

