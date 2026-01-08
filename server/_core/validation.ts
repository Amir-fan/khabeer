/**
 * Shared validation schemas
 * Reusable Zod schemas for common validations
 */

import { z } from "zod";

/**
 * Email validation schema
 */
export const emailSchema = z
  .string()
  .email("البريد الإلكتروني غير صحيح")
  .min(5, "البريد الإلكتروني قصير جداً")
  .max(320, "البريد الإلكتروني طويل جداً");

/**
 * Phone number validation (supports international formats)
 */
export const phoneSchema = z
  .string()
  .min(9, "رقم الهاتف قصير جداً")
  .max(20, "رقم الهاتف طويل جداً")
  .regex(/^[\d\s\+\-\(\)]+$/, "رقم الهاتف يحتوي على أحرف غير صحيحة");

/**
 * Name validation
 */
export const nameSchema = z
  .string()
  .min(2, "الاسم يجب أن يكون حرفين على الأقل")
  .max(100, "الاسم طويل جداً")
  .regex(/^[\u0600-\u06FFa-zA-Z\s]+$/, "الاسم يحتوي على أحرف غير مسموحة");

/**
 * Password validation (basic, strength checked separately)
 */
export const passwordSchema = z
  .string()
  .min(8, "كلمة المرور يجب أن تكون 8 أحرف على الأقل")
  .max(128, "كلمة المرور طويلة جداً");

/**
 * User registration schema
 * Minimal identity footprint: email + password + role
 */
export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  role: z.enum(["user", "admin", "consultant", "advisor"]).optional().default("user"),
});

/**
 * User login schema
 */
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "كلمة المرور مطلوبة"),
});

/**
 * Profile update schema
 */
export const profileUpdateSchema = z.object({
  name: nameSchema.optional(),
  phone: phoneSchema.optional(),
});

/**
 * Pagination schema
 */
export const paginationSchema = z.object({
  page: z.number().int().min(1).optional().default(1),
  limit: z.number().int().min(1).max(100).optional().default(20),
});

/**
 * Conversation creation schema
 */
export const conversationCreateSchema = z.object({
  title: z.string().max(255, "العنوان طويل جداً").optional(),
  context: z.string().max(50, "السياق طويل جداً").optional().default("general"),
});

/**
 * Message creation schema
 */
export const messageCreateSchema = z.object({
  role: z.enum(["user", "assistant", "system"]),
  content: z.string().min(1, "المحتوى مطلوب").max(10000, "المحتوى طويل جداً"),
});

/**
 * File upload schema
 */
export const fileUploadSchema = z.object({
  name: z.string().min(1, "اسم الملف مطلوب").max(255, "اسم الملف طويل جداً"),
  type: z.enum(["contract", "report", "stock", "other"]),
  mimeType: z.string().max(100).optional(),
  size: z.number().int().min(0).max(100 * 1024 * 1024).optional(), // 100MB max
});

