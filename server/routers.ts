import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq, desc, and } from "drizzle-orm";
import { requestAssignments, consultationRequests, advisorRatings, requestTransitions, orders, notifications } from "../drizzle/schema";
import { COOKIE_NAME } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, adminProcedure, router, tierProtectedProcedure } from "./_core/trpc";
import { invokeGemini, AI_DISCLAIMER } from "./_core/gemini";
import * as db from "./db";
import { hashPassword, verifyPassword, validatePasswordStrength } from "./_core/auth";
import { generateToken } from "./_core/jwt";
import { checkRateLimit, getClientIp } from "./_core/rateLimit";
import { checkRateLimitRedis } from "./_core/rateLimitRedis";
import { logger } from "./_core/logger";
import { captureException } from "./_core/monitoring";
import { supabase } from "./_core/supabase";
import { ENV } from "./_core/env";
import { canAccessContracts, getTierDiscountBps, getTierPriorityWeight } from "./_core/tier";
import { createConsultationRecord } from "./_core/consultationFactory";
import { attachConsultationFile } from "./_core/consultationFiles";
import { loadAiSettings } from "./_core/aiSettings";
import { enforceUsageLimit } from "./_core/limits";
import { recordTransaction } from "./_core/transactions";
import { computePartnerMetrics } from "./_core/partnerMetrics";
import { dispatchNotification, listNotifications, markAllRead } from "./_core/notificationsCenter";
import {
  createPartnerApplication,
  storePartnerDocuments,
  approvePartnerApplication,
  rejectPartnerApplication,
  listPartnerApplications,
} from "./_core/partnerApplications";
import {
  assertConsultationTransition,
  reserveConsultationPayment,
  releaseConsultationPayment,
  startConsultation,
  completeConsultation,
} from "./_core/consultationFlow";
import {
  uploadLibraryFile,
  listLibraryFilesForUser,
  adminBroadcastLibraryFile,
  advisorSendLibraryFile,
  notifyLibraryFileCreated,
  assertLibraryFileAccess,
} from "./_core/libraryFiles";
import {
  getUsersCount,
  getConversationsCount,
  getContractsCount,
  getStocksScreenedCount,
  getConsultationsSummary,
} from "./_core/adminMetrics";
import {
  registerSchema,
  loginSchema,
  profileUpdateSchema,
  paginationSchema,
  conversationCreateSchema,
  messageCreateSchema,
  fileUploadSchema,
  emailSchema,
  passwordSchema,
  nameSchema,
  phoneSchema,
} from "./_core/validation";
async function requireAdvisor(ctx: { user: any }) {
  if (!ctx.user || !["consultant", "advisor"].includes(ctx.user.role)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "مخصص للمستشارين فقط." });
  }
  const profile = await db.ensureConsultantForUser(ctx.user as any);
  if (!profile) {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "تعذر تهيئة ملف المستشار." });
  }
  return profile;
}

async function getAdvisorCompletedOrders(advisorId: number) {
  const dbClient = await db.getDb();
  if (!dbClient) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

  return dbClient
    .select({
      order: orders,
      request: consultationRequests,
    })
    .from(orders)
    .leftJoin(consultationRequests, eq(orders.requestId, consultationRequests.id))
    .where(
      and(
        eq(consultationRequests.advisorId, advisorId),
        // Released consultations only (escrow released)
        eq(consultationRequests.status, "released" as any),
        // And completed orders only
        eq(orders.status, "completed" as any),
      ),
    )
    .orderBy(desc(orders.createdAt));
}

function computeAdvisorEarnings(rows: Array<{ order: any; request: any }>) {
  let gross = 0;
  let platform = 0;
  let net = 0;
  rows.forEach((row) => {
    const o: any = row.order;
    const grossAmount = o.grossAmountKwd ?? o.priceKWD ?? 0;
    const platformFee = o.platformFeeKWD ?? Math.round(grossAmount * 0.3);
    const vendorPayout = o.vendorPayoutKWD ?? (o.netAmountKwd ?? Math.max(grossAmount - platformFee, 0));
    gross += grossAmount;
    platform += platformFee;
    net += vendorPayout;
  });
  return { gross, platform, net };
}

// Verbatim cognitive assistant prompts (MUST remain unchanged)
const COGNITIVE_PROMPT_1 = `# **دستور مساعد "خبير" المعرفي**

## **1. الدور الأساسي (Core Role):**
أنت "مساعد معرفي تحليلي" متخصص في تفكيك وتحليل النصوص والمصادر في المجالات القانونية والشرعية والمالية. دورك ليس تقديم إجابات نهائية أو استشارات ملزمة، بل تمكين المستخدم من فهم الأبعاد المختلفة للموضوع من خلال التحليل الموضوعي.

## **2. شخصية المساعد (Persona):**
- **خبير ومحايد:** واثق في تحليلك، لكنك لا تفرض رأياً. استخدم لغة مثل "يمكن فهم هذا النص على أنه..."، "من زاوية أخرى، يرى البعض أن...".
- **متوازن وهادئ:** تجنب اللغة العاطفية أو المثيرة للجدل. حافظ على هدوء ورصانة الخبير.
- **مُمكّن (Empowering):** هدفك هو تزويد المستخدم بالأدوات الفكرية اللازمة لاتخاذ قراره بنفسه، لا اتخاذ القرار نيابة عنه.

## **3. آلية معالجة المصادر (Source Processing Mechanism):**
عند تزويدك بمصدر (ملف، نص، قانون)، اتبع الخطوات التالية بدقة:

**أ. الفهم والاستيعاب (Comprehension):**
- **استخلاص الفكرة المحورية:** ما هي الرسالة الأساسية التي يحاول المصدر إيصالها؟
- **تحديد المفاهيم الرئيسية:** ما هي المصطلحات والمبادئ الأساسية المذكورة؟
- **رصد العلاقات المنطقية:** كيف ترتبط الأفكار ببعضها؟ (سبب ونتيجة، مقارنة، تسلسل).

**ب. التحليل والتفكيك (Analysis & Deconstruction):**
- **تحليل السياق:** لا تنقل النص حرفياً، بل اشرحه في سياقه.
- **تحديد الافتراضات الضمنية:** ما هي الافتراضات التي بني عليها المصدر؟
- **عرض وجهات النظر المختلفة:** إذا كان المصدر يعرض رأياً واحداً، أشر إلى وجود آراء أخرى محتملة دون الخوض فيها بعمق.

**ج. إعادة البناء والإجابة (Synthesis & Response):**
- **صياغة الإجابة:** أجب على سؤال المستخدم بناءً على تحليلك للمصدر، وليس عبر اقتباس مباشر.
- **استخدام صيغ احتمالية:** "يُستفاد من المصدر أن..."، "يبدو أن القصد من هذه المادة هو..."، "بحسب ما يُفهم من الطرح العام...".
- **الإشارة العامة للمصدر (عند الضرورة):** مثل "بالرجوع إلى الإطار التنظيمي العام...".

## **4. الممنوعات الصارمة (Strict Prohibitions):**
- ممنوع ذكر أرقام الصفحات أو المواد أو الفقرات.
- ممنوع استخدام صيغ الجزم والإلزام.
- ممنوع تقديم توصية مباشرة أو خطة عمل تنفيذية.
- ممنوع الإيحاء بأن الإجابة فتوى أو حكم نهائي.

## **5. الإطار النهائي للإجابة (Standard Output Structure):**
1. التحليل المعرفي
2. تنبيه لاختلاف الحالات
3. إحالة لمختص مرخص`;

// Second prompt (identical) must also be included verbatim
const COGNITIVE_PROMPT_2 = `# **دستور مساعد "خبير" المعرفي**

## **1. الدور الأساسي (Core Role):**
أنت "مساعد معرفي تحليلي" متخصص في تفكيك وتحليل النصوص والمصادر في المجالات القانونية والشرعية والمالية. دورك ليس تقديم إجابات نهائية أو استشارات ملزمة، بل تمكين المستخدم من فهم الأبعاد المختلفة للموضوع من خلال التحليل الموضوعي.

## **2. شخصية المساعد (Persona):**
- **خبير ومحايد:** واثق في تحليلك، لكنك لا تفرض رأياً. استخدم لغة مثل "يمكن فهم هذا النص على أنه..."، "من زاوية أخرى، يرى البعض أن...".
- **متوازن وهادئ:** تجنب اللغة العاطفية أو المثيرة للجدل. حافظ على هدوء ورصانة الخبير.
- **مُمكّن (Empowering):** هدفك هو تزويد المستخدم بالأدوات الفكرية اللازمة لاتخاذ قراره بنفسه، لا اتخاذ القرار نيابة عنه.

## **3. آلية معالجة المصادر (Source Processing Mechanism):**
عند تزويدك بمصدر (ملف، نص، قانون)، اتبع الخطوات التالية بدقة:

**أ. الفهم والاستيعاب (Comprehension):**
- **استخلاص الفكرة المحورية:** ما هي الرسالة الأساسية التي يحاول المصدر إيصالها؟
- **تحديد المفاهيم الرئيسية:** ما هي المصطلحات والمبادئ الأساسية المذكورة؟
- **رصد العلاقات المنطقية:** كيف ترتبط الأفكار ببعضها؟ (سبب ونتيجة، مقارنة، تسلسل).

**ب. التحليل والتفكيك (Analysis & Deconstruction):**
- **تحليل السياق:** لا تنقل النص حرفياً، بل اشرحه في سياقه.
- **تحديد الافتراضات الضمنية:** ما هي الافتراضات التي بني عليها المصدر؟
- **عرض وجهات النظر المختلفة:** إذا كان المصدر يعرض رأياً واحداً، أشر إلى وجود آراء أخرى محتملة دون الخوض فيها بعمق.

**ج. إعادة البناء والإجابة (Synthesis & Response):**
- **صياغة الإجابة:** أجب على سؤال المستخدم بناءً على تحليلك للمصدر، وليس عبر اقتباس مباشر.
- **استخدام صيغ احتمالية:** "يُستفاد من المصدر أن..."، "يبدو أن القصد من هذه المادة هو..."، "بحسب ما يُفهم من الطرح العام...".
- **الإشارة العامة للمصدر (عند الضرورة):** مثل "بالرجوع إلى الإطار التنظيمي العام...".

## **4. الممنوعات الصارمة (Strict Prohibitions):**
- ممنوع ذكر أرقام الصفحات أو المواد أو الفقرات.
- ممنوع استخدام صيغ الجزم والإلزام.
- ممنوع تقديم توصية مباشرة أو خطة عمل تنفيذية.
- ممنوع الإيحاء بأن الإجابة فتوى أو حكم نهائي.

## **5. الإطار النهائي للإجابة (Standard Output Structure):**
1. التحليل المعرفي
2. تنبيه لاختلاف الحالات
3. إحالة لمختص مرخص`;

// Combined system prompt applied to all AI endpoints (Arabic-only, probabilistic)
const ISLAMIC_FINANCE_SYSTEM_PROMPT = `${COGNITIVE_PROMPT_1}

${COGNITIVE_PROMPT_2}

أجب بالعربية فقط وبصياغة احتمالية كما هو مذكور أعلاه، وحافظ دائماً على الهيكل: التحليل المعرفي، تنبيه لاختلاف الحالات، إحالة لمختص مرخص. لا تقدّم أحكاماً نهائية أو توصيات استثمارية أو فتاوى.`;

// Mandatory notes appended to every AI response to satisfy structure
const MANDATORY_NOTES = `- تنبيه: الحالات تختلف باختلاف التفاصيل والسياق.\n- إحالة: يُفضّل استشارة مختص مرخّص قبل أي قرار.`;

// Intent detection for user messages
type UserIntent = "EMPTY_OR_ACK" | "FOLLOW_UP" | "NEW_QUESTION" | "DOCUMENT_ANALYSIS";

function detectUserIntent(message: string, historyText?: string): UserIntent {
  const trimmed = message.trim().toLowerCase();
  
  // Empty or acknowledgment patterns
  const emptyPatterns = [
    /^\.+$/, // Just dots
    /^(ok|تمام|شكراً|شكرا|thanks|thank you|مشكور|مشكورة|حاضر|فهمت)$/i,
    /^[\s\.\،\،]+$/, // Only punctuation/whitespace
  ];
  
  if (emptyPatterns.some(p => p.test(trimmed)) || trimmed.length <= 2) {
    return "EMPTY_OR_ACK";
  }
  
  // Follow-up patterns (asking for clarification/expansion)
  const followUpPatterns = [
    /^(وضح|اشرح|أوضح|ليش|لماذا|كيف|ماذا|متى|أين)/i,
    /^(more|more details|clarify|explain|why|how|what|when)/i,
    /^(المزيد|توضيح|شرح|تفاصيل)/i,
  ];
  
  if (followUpPatterns.some(p => p.test(trimmed))) {
    return "FOLLOW_UP";
  }
  
  // Document analysis keywords
  const documentPatterns = [
    /(عقد|مستند|وثيقة|ملف|document|contract|file)/i,
    /(حلل|تحليل|analyze|analysis)/i,
  ];
  
  if (documentPatterns.some(p => p.test(trimmed))) {
    return "DOCUMENT_ANALYSIS";
  }
  
  // Default: new question
  return "NEW_QUESTION";
}

// Check if last assistant message already contained disclaimer
function hasRecentDisclaimer(historyText: string): boolean {
  const disclaimerKeywords = [
    "تنبيه مهم",
    "إحالة لمختص",
    "استشارة مختص",
    "أغراض تعليمية",
    "لا يُعتبر",
  ];
  
  return disclaimerKeywords.some(keyword => historyText.includes(keyword));
}

// Short response mode for empty/ack inputs
const SHORT_RESPONSE_PROMPT = `أنت مساعد معرفي متخصص في الشؤون المالية الإسلامية. 

عندما يرسل المستخدم رسالة قصيرة جداً (مثل "." أو "تمام" أو "شكراً") أو رسالة غير واضحة، يجب أن ترد بإجابة قصيرة جداً (سطر أو سطرين فقط) تسأل فيها المستخدم عما يريد بالضبط.

مثال:
- إذا أرسل "." → "هل ترغب بتوضيح نقطة معيّنة؟"
- إذا أرسل "تمام" → "إذا عندك سؤال إضافي، تفضل."
- إذا أرسل رسالة غير واضحة → "أخبرني ما الجزء الذي تريد التعمّق فيه."

⚠️ مهم: لا تضع أي تحليل معرفي، لا تنبيهات، لا إحالات، لا هوامش. فقط سطر واحد أو سطرين بسيطين.`;

// Full analysis prompt (only for clear questions)
const FULL_ANALYSIS_PROMPT = `${ISLAMIC_FINANCE_SYSTEM_PROMPT}

⚠️ مهم: إذا كان المستخدم يسأل سؤالاً واضحاً أو يطلب تحليلاً، قدم التحليل المعرفي الكامل مع التنبيهات والإحالات. إذا كان يطلب توضيحاً أو متابعة، ركز فقط على النقطة المحددة دون إعادة الهيكل الكامل.`;

// Consultation request state machine (deterministic)
const REQUEST_TRANSITIONS: Record<string, string[]> = {
  draft: ["submitted"],
  submitted: ["pending_advisor"],
  pending_advisor: ["accepted", "rejected"],
  accepted: ["in_progress"],
  in_progress: ["awaiting_payment"],
  awaiting_payment: ["paid"],
  paid: ["closed"],
  closed: ["rated"],
  rated: [],
};

function assertTransition(current: string, target: string) {
  const allowed = REQUEST_TRANSITIONS[current] || [];
  if (!allowed.includes(target)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `لا يمكن الانتقال من الحالة ${current} إلى ${target}`,
    });
  }
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    /**
     * Get current authenticated user
     * Purpose: Return current user from context
     * Input: None (uses context)
     * Database: None (uses context user)
     * Errors: None (returns null if not authenticated)
     */
    me: publicProcedure.query(({ ctx }) => {
      if (!ctx.user) {
        return null;
      }
      // Return user without password
      const { password: _, ...userWithoutPassword } = ctx.user;
      return userWithoutPassword;
    }),

    /**
     * Logout user
     * Purpose: Invalidate session by blacklisting JWT token
     * 
     * Security: Adds token to blacklist with expiry matching token's exp claim.
     * Blacklist entry auto-expires when token would naturally expire, preventing
     * memory leaks. Token is rejected on all subsequent authenticated requests.
     * 
     * Input: None
     * Database: None (blacklist stored in Redis or memory)
     * Errors: None (gracefully handles missing token)
     */
    logout: publicProcedure.mutation(async ({ ctx }) => {
      // Blacklist JWT token if present
      const authHeader = ctx.req.headers.authorization || ctx.req.headers.Authorization;
      const { extractTokenFromHeader } = await import("./_core/jwt.js");
      const { blacklistToken } = await import("./_core/jwtBlacklist.js");
      const jwt = await import("jsonwebtoken");
      
      const token = extractTokenFromHeader(authHeader);
      if (token) {
        try {
          // Decode token to get expiration time (without verification, since we're blacklisting it)
          const decoded = jwt.decode(token) as { exp?: number; iat?: number } | null;
          
          if (decoded && decoded.exp) {
            // Calculate remaining seconds until token expiration
            const now = Math.floor(Date.now() / 1000);
            const expiresIn = Math.max(0, decoded.exp - now);
            
            // Blacklist token with expiry matching token's natural expiration
            // This ensures blacklist entry auto-expires when token would expire anyway
            await blacklistToken(token, expiresIn);
            logger.info("Token blacklisted on logout", { expiresIn });
          } else {
            // Fallback: if no exp claim, use default 7 days
            await blacklistToken(token);
            logger.warn("Token blacklisted without exp claim, using default expiry");
          }
        } catch (error) {
          // If decode fails, still try to blacklist (will use default expiry)
          logger.warn("Failed to decode token for expiry calculation", {
            error: error instanceof Error ? error.message : String(error),
          });
          await blacklistToken(token);
        }
      }

      // Clear session cookie (if using cookie-based auth)
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      
      return {
        success: true,
      } as const;
    }),

    /**
     * Register new user
     * Purpose: Create new user account with hashed password
     * Input: email, password, role (optional, default user)
     * Database: Insert into users table
     * Errors: Email already exists, validation failures, password too weak
     */
    register: publicProcedure
      .input(registerSchema)
      .mutation(async ({ input, ctx }) => {
        // Rate limiting: 3 registrations per hour per IP (Redis-backed)
        const clientIp = getClientIp({ headers: ctx.req.headers });
        const rateLimit = await checkRateLimitRedis(`register:${clientIp}`, 3, 60 * 60 * 1000);
        if (!rateLimit.allowed) {
          throw new TRPCError({
            code: "TOO_MANY_REQUESTS",
            message: "تم تجاوز الحد المسموح. يرجى المحاولة لاحقاً",
          });
        }

        // Validate password strength
        const passwordValidation = validatePasswordStrength(input.password);
        if (!passwordValidation.isValid) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: passwordValidation.error || "كلمة المرور غير صالحة",
          });
        }

        // Check if user already exists
        const existingUser = await db.getUserByEmail(input.email);
        if (existingUser) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "البريد الإلكتروني مسجل مسبقاً",
          });
        }

        try {
          // Hash password
          const hashedPassword = await hashPassword(input.password);

          // Create new user with minimal identity footprint
        const user = await db.createUser({
          email: input.email,
            passwordHash: hashedPassword,
            role: input.role ?? "user",
          });

          logger.info("User registered", { userId: user.id, email: input.email });

          return { success: true, userId: user.id, createdAt: user.createdAt };
        } catch (error) {
          logger.error("Registration failed", error instanceof Error ? error : new Error(String(error)), {
            email: input.email,
          });
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "فشل في إنشاء الحساب. يرجى المحاولة مرة أخرى",
          });
        }
      }),

    /**
     * Login user
     * Purpose: Authenticate user and return JWT token
     * Input: email, password
     * Database: Query users table, verify password hash
     * Errors: Invalid credentials, account suspended, rate limit exceeded
     * 
     * Security: In production, only authenticates real users from database.
     * Dev-only fallback (if enabled) uses environment variables, never hardcoded credentials.
     */
    login: publicProcedure
      .input(loginSchema)
      .mutation(async ({ input, ctx }) => {
        const normalizedEmail = (input.email || "").trim().toLowerCase();

        // --- DEV-ONLY: Fallback login for local development (NOT in production) ---
        // This allows bypassing database during local development when DB is unavailable.
        // Credentials MUST come from environment variables, never hardcoded.
        // Set these in .env.local (never commit to git):
        //   DEV_ADMIN_EMAIL=admin@khabeer.com
        //   DEV_ADMIN_PASSWORD=your-dev-password
        //   DEV_PARTNER_EMAIL=partner@khabeer.com
        //   DEV_PARTNER_PASSWORD=your-dev-password
        // SECURITY: Hard fail in production - no fallback allowed
        if (ENV.isProduction) {
          // In production, fallback is completely disabled
          // Continue to database lookup below
        } else if (process.env.NODE_ENV === "development") {
          const devAdminEmail = process.env.DEV_ADMIN_EMAIL?.trim().toLowerCase();
          const devAdminPassword = process.env.DEV_ADMIN_PASSWORD;
          const devPartnerEmail = process.env.DEV_PARTNER_EMAIL?.trim().toLowerCase();
          const devPartnerPassword = process.env.DEV_PARTNER_PASSWORD;

          // Check admin fallback (only if env vars are set)
          if (devAdminEmail && devAdminPassword && normalizedEmail === devAdminEmail && input.password === devAdminPassword) {
            const fakeUser = {
              id: -1,
              email: normalizedEmail,
              role: "admin" as const,
              name: "Dev Admin",
            } as any;
            const token = generateToken({
              userId: fakeUser.id,
              email: normalizedEmail,
              role: "admin",
            });
            logger.warn("DEV-ONLY: Fallback admin login used", { email: normalizedEmail });
            return {
              success: true,
              token,
              user: {
                id: fakeUser.id,
                openId: `fallback_admin`,
                email: normalizedEmail,
                role: "admin",
                tier: "pro",
                status: "active",
                name: "Dev Admin",
                loginMethod: "fallback",
              },
            };
          }

          // Check partner fallback (only if env vars are set)
          if (devPartnerEmail && devPartnerPassword && normalizedEmail === devPartnerEmail && input.password === devPartnerPassword) {
            const fakeUser = {
              id: -2,
              email: normalizedEmail,
              role: "advisor" as const,
              name: "Dev Partner",
            } as any;
            const advisorProfile = await db.ensureConsultantForUser(fakeUser);
            const token = generateToken({
              userId: fakeUser.id,
              email: normalizedEmail,
              role: "advisor",
              advisorId: advisorProfile?.id,
            });
            logger.warn("DEV-ONLY: Fallback partner login used", { email: normalizedEmail });
            return {
              success: true,
              token,
              user: {
                id: fakeUser.id,
                openId: `fallback_advisor`,
                email: normalizedEmail,
                role: "advisor",
                tier: "pro",
                status: "active",
                name: "Dev Partner",
                loginMethod: "fallback",
                advisorId: advisorProfile?.id,
              },
            };
          }
        }
        // --- END DEV-ONLY FALLBACK ---

        // Rate limiting: 5 login attempts per 15 minutes per IP (Redis-backed)
        const clientIp = getClientIp({ headers: ctx.req.headers });
        const rateLimit = await checkRateLimitRedis(`login:${clientIp}`, 5, 15 * 60 * 1000);
        if (!rateLimit.allowed) {
          throw new TRPCError({
            code: "TOO_MANY_REQUESTS",
            message: "تم تجاوز عدد محاولات تسجيل الدخول. يرجى المحاولة لاحقاً",
          });
        }

        try {
          // Get user from database
        const user = await db.getUserByEmail(input.email);
          if (!user || !user.password) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "البريد الإلكتروني أو كلمة المرور غير صحيحة",
            });
          }

          // Check if account is suspended
          if (user.status === "suspended") {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "تم تعليق حسابك. يرجى التواصل مع الدعم",
            });
          }

          // Verify password
          const passwordValid = await verifyPassword(input.password, user.password);
          if (!passwordValid) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "البريد الإلكتروني أو كلمة المرور غير صحيحة",
            });
          }

          // Ensure advisor profile if needed
          let advisorId: number | undefined;
          if (user.role === "advisor" || user.role === "consultant") {
            const advisorProfile = await db.ensureConsultantForUser(user);
            advisorId = advisorProfile?.id;
          }

          // Generate JWT token
          const token = generateToken({
            userId: user.id,
            email: user.email || "",
            role: user.role,
            advisorId,
          });

          // Update last signed in
          await db.upsertUser({
            openId: user.openId || `local_${user.id}`,
            email: user.email || undefined,
            lastSignedIn: new Date(),
          });

          logger.info("User logged in", { userId: user.id, email: input.email });

          // Return user without password and token
          const { password: _, ...userWithoutPassword } = user;
          return {
            success: true,
            token,
            user: { ...userWithoutPassword, advisorId },
          };
        } catch (error) {
          if (error instanceof TRPCError) {
            throw error;
          }
          logger.error("Login failed", error instanceof Error ? error : new Error(String(error)), {
            email: input.email,
          });
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "حدث خطأ أثناء تسجيل الدخول. يرجى المحاولة مرة أخرى",
          });
        }
      }),

    /**
     * Update user profile
     * Purpose: Update user's name and/or phone
     * Input: name (optional), phone (optional)
     * Database: Update users table
     * Errors: Validation failures, unauthorized
     */
    updateProfile: protectedProcedure
      .input(profileUpdateSchema)
      .mutation(async ({ input, ctx }) => {
        try {
          const updateData: { name?: string; phone?: string } = {};
          if (input.name !== undefined) {
            updateData.name = input.name;
          }
          if (input.phone !== undefined) {
            updateData.phone = input.phone;
          }

          if (Object.keys(updateData).length === 0) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "لا توجد بيانات للتحديث",
            });
          }

          // Update user in database
          const email = ctx.user.email || (await db.getUserById(ctx.user.id))?.email;
          if (!email) {
            throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "تعذر تحديد بريد المستخدم." });
          }
          await db.upsertUser({
            openId: ctx.user.openId || `local_${ctx.user.id}`,
            email,
            ...updateData,
            updatedAt: new Date(),
          });

          // Get updated user
          const updatedUser = await db.getUserById(ctx.user.id);
          if (!updatedUser) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "المستخدم غير موجود",
            });
          }

          const { password: _, ...userWithoutPassword } = updatedUser;
          return userWithoutPassword;
        } catch (error) {
          if (error instanceof TRPCError) {
            throw error;
          }
          logger.error("Profile update failed", error instanceof Error ? error : new Error(String(error)), {
            userId: ctx.user.id,
          });
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "فشل في تحديث الملف الشخصي",
          });
        }
      }),

    /**
     * Get usage statistics (remaining messages/chats)
     * Purpose: Return current usage stats for UI display without incrementing counters
     * 
     * This endpoint uses enforceUsageLimit logic in "dry-run" mode to ensure
     * UI always displays accurate remaining counts that match backend enforcement.
     * 
     * Input: None (uses authenticated user from context)
     * Returns: AI and advisor chat usage stats (limit, used, remaining)
     */
    usageStats: protectedProcedure.query(async ({ ctx }) => {
      const { getAiUsageStats, getAdvisorChatUsageStats } = await import("./_core/tier.js");
      
      const userId = ctx.user.id;
      const tier = ctx.user.tier || "free";

      const [aiStats, advisorStats] = await Promise.all([
        getAiUsageStats(userId, tier),
        getAdvisorChatUsageStats(userId, tier),
      ]);

      return {
        ai: {
          limit: aiStats.limit,
          used: aiStats.used,
          remaining: aiStats.remaining,
          allowed: aiStats.allowed,
        },
        advisorChat: {
          limit: advisorStats.limit,
          used: advisorStats.used,
          remaining: advisorStats.remaining,
          allowed: advisorStats.allowed,
        },
      };
    }),

    /**
     * Delete user account
     * Purpose: Permanently delete user account and all related data
     * 
     * Security & Compliance:
     * - User can only delete their own account (enforced by protectedProcedure)
     * - Blocks deletion if user has active in_progress consultations
     * - Anonymizes financial records (orders) instead of deleting (preserves audit trail)
     * - Cascades deletion to: conversations, messages, files, consultations, usage counters
     * - Invalidates current token by blacklisting it
     * 
     * Input: None (uses authenticated user from context)
     * Database: Deletes user record and related data, anonymizes orders
     * Errors: Active consultations, database errors
     */
    deleteAccount: protectedProcedure.mutation(async ({ ctx }) => {
      const userId = ctx.user.id;
      const userEmail = ctx.user.email || "";

      try {
        // Import account deletion functions
        const { deleteUserAccount } = await import("./_core/accountDeletion.js");
        const { blacklistToken } = await import("./_core/jwtBlacklist.js");
        const { extractTokenFromHeader } = await import("./_core/jwt.js");
        const jwt = await import("jsonwebtoken");

        // Invalidate current token by blacklisting it
        const authHeader = ctx.req.headers.authorization || ctx.req.headers.Authorization;
        const token = extractTokenFromHeader(authHeader);
        if (token) {
          try {
            const decoded = jwt.decode(token) as { exp?: number } | null;
            if (decoded && decoded.exp) {
              const now = Math.floor(Date.now() / 1000);
              const expiresIn = Math.max(0, decoded.exp - now);
              await blacklistToken(token, expiresIn);
              logger.info("Token blacklisted on account deletion", { userId });
            } else {
              await blacklistToken(token);
            }
          } catch (error) {
            logger.warn("Failed to blacklist token on account deletion", {
              error: error instanceof Error ? error.message : String(error),
            });
            // Continue with deletion even if token blacklisting fails
          }
        }

        // Delete user account and all related data
        await deleteUserAccount(userId);

        logger.info("User account deleted", { userId, email: userEmail });

        return {
          success: true,
          message: "تم حذف الحساب بنجاح",
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        logger.error("Account deletion failed", error instanceof Error ? error : new Error(String(error)), {
          userId,
        });
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "فشل في حذف الحساب. يرجى المحاولة مرة أخرى",
        });
      }
    }),

    /**
     * Request password reset
     * Purpose: Generate reset token and send email (stub for now)
     * Input: email
     * Database: Query users table
     * Errors: Email not found, rate limit exceeded
     */
    forgotPassword: publicProcedure
      .input(z.object({ email: emailSchema }))
      .mutation(async ({ input, ctx }) => {
        // Rate limiting: 3 requests per hour per IP (Redis-backed)
        const clientIp = getClientIp({ headers: ctx.req.headers });
        const rateLimit = await checkRateLimitRedis(`forgot-password:${clientIp}`, 3, 60 * 60 * 1000);
        if (!rateLimit.allowed) {
          throw new TRPCError({
            code: "TOO_MANY_REQUESTS",
            message: "تم تجاوز الحد المسموح. يرجى المحاولة لاحقاً",
          });
        }

        // Use real password reset implementation
        const { requestPasswordReset } = await import("./_core/passwordReset.js");
        return requestPasswordReset(input.email);
      }),

    /**
     * Reset password with token
     * Purpose: Reset user password using reset token
     * Input: token, newPassword
     * Database: Update users table
     * Errors: Invalid token, password validation failures
     */
    resetPassword: publicProcedure
      .input(
        z.object({
          token: z.string().min(1, "رمز إعادة التعيين مطلوب"),
          newPassword: passwordSchema,
        }),
      )
      .mutation(async ({ input }) => {
        // Validate password strength
        const passwordValidation = validatePasswordStrength(input.newPassword);
        if (!passwordValidation.isValid) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: passwordValidation.error || "كلمة المرور غير صالحة",
          });
        }

        // Use real password reset implementation
        const { resetPassword } = await import("./_core/passwordReset.js");
        return resetPassword({
          token: input.token,
          newPassword: input.newPassword,
        });
      }),
  }),

  partnerApplications: router({
    submit: publicProcedure
      .input(
        z.object({
          fullName: z.string().min(2).max(200),
          email: emailSchema,
          password: passwordSchema,
          phone: z.string().min(5).max(50).optional(),
          title: z.string().max(200).optional(),
          specialization: z.string().max(200).optional(),
          yearsExperience: z.number().int().min(0).max(80).optional(),
          bio: z.string().max(2000).optional(),
        }),
      )
      .mutation(async ({ input }) => {
        return createPartnerApplication(input);
      }),

    uploadDocument: publicProcedure
      .input(
        z.object({
          applicationId: z.number().int().positive(),
          fileName: z.string().min(1),
          mimeType: z.string().optional(),
          size: z.number().int().positive().optional(),
        }),
      )
      .mutation(async ({ input }) => {
        return storePartnerDocuments(input);
      }),

    list: adminProcedure
      .input(z.object({ status: z.enum(["pending_review", "approved", "rejected"]).optional() }).optional())
      .query(async ({ input }) => {
        return listPartnerApplications(input?.status);
      }),

    approve: adminProcedure
      .input(
        z.object({
          applicationId: z.number().int().positive(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED", message: "يجب تسجيل الدخول." });
        return approvePartnerApplication({ applicationId: input.applicationId, reviewerUserId: ctx.user.id });
      }),

    reject: adminProcedure
      .input(
        z.object({
          applicationId: z.number().int().positive(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED", message: "يجب تسجيل الدخول." });
        return rejectPartnerApplication({ applicationId: input.applicationId, reviewerUserId: ctx.user.id });
      }),
  }),

  // Consultation & Matching Router (Phase 4 core)
  consultations: router({
    create: tierProtectedProcedure
      .input(
        z.object({
          summary: z.string().min(1).max(2000),
          files: z
            .array(
              z.object({
                fileId: z.number(),
                name: z.string(),
              }),
            )
            .optional(),
          grossAmountKwd: z.number().int().positive().optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED", message: "يجب تسجيل الدخول." });
        const result = await createConsultationRecord({
          userId: ctx.user.id,
          userTier: ctx.userTier || "free",
          summary: input.summary,
          files: input.files || null,
          grossAmountKwd: input.grossAmountKwd ?? null,
        });

        return result;
      }),

    reservePayment: tierProtectedProcedure
      .input(
        z.object({
          requestId: z.number().int().positive(),
          amountKwd: z.number().int().positive(),
          currency: z.string().optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED", message: "يجب تسجيل الدخول." });
        
        // Use payment placeholder (creates pending order, doesn't unlock anything)
        const { createPaymentIntentPlaceholder } = await import("./_core/paymentGateway.js");
        return createPaymentIntentPlaceholder({
          userId: ctx.user.id,
          requestId: input.requestId,
          amountKwd: input.amountKwd,
          currency: input.currency,
        });
      }),

    releasePayment: tierProtectedProcedure
      .input(z.object({ requestId: z.number().int().positive(), platformFeeBps: z.number().int().optional() }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED", message: "يجب تسجيل الدخول." });
        return releaseConsultationPayment({
          requestId: input.requestId,
          actorUserId: ctx.user.id,
          platformFeeBps: input.platformFeeBps,
        });
      }),

    startSession: tierProtectedProcedure
      .input(z.object({ requestId: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED", message: "يجب تسجيل الدخول." });
        
        // Check if payment is completed before allowing session start
        const request = await db.getConsultationRequest(input.requestId);
        if (!request) throw new TRPCError({ code: "NOT_FOUND", message: "الطلب غير موجود." });
        
        // Get order for this request
        const order = await db.getOrderByRequest(input.requestId);
        if (!order) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "لا يمكن بدء الجلسة قبل إتمام الدفع.",
          });
        }
        
        // Check payment completion - MUST be completed to start session
        const { isPaymentCompleted } = await import("./_core/paymentGateway.js");
        const paymentCompleted = await isPaymentCompleted(order.id);
        
        if (!paymentCompleted) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "لا يمكن بدء الجلسة قبل إتمام الدفع. الدفع معلق حالياً.",
          });
        }
        
        return startConsultation({ requestId: input.requestId, actorUserId: ctx.user.id });
      }),

    completeSession: tierProtectedProcedure
      .input(z.object({ requestId: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED", message: "يجب تسجيل الدخول." });
        return completeConsultation({ requestId: input.requestId, actorUserId: ctx.user.id });
      }),

    list: tierProtectedProcedure.query(async ({ ctx }) => {
      if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED", message: "يجب تسجيل الدخول." });
      return db.listConsultationRequestsForUser(ctx.user.id);
    }),

    get: tierProtectedProcedure
      .input(z.object({ requestId: z.number().int().positive() }))
      .query(async ({ ctx, input }) => {
        const request = await db.getConsultationRequest(input.requestId);
        if (!request) {
          throw new TRPCError({ code: "NOT_FOUND", message: "الطلب غير موجود." });
        }
        const isOwner = ctx.user && request.userId === ctx.user.id;
        if (!isOwner) {
          throw new TRPCError({ code: "FORBIDDEN", message: "ليس لديك صلاحية للوصول إلى هذا الطلب." });
        }
        const files = await db.listConsultationFiles(request.id);
        return { ...request, files };
      }),

    match: tierProtectedProcedure
      .input(
        z.object({
          requestId: z.number().int().positive(),
          specialty: z.string().optional(),
          minRating: z.number().min(1).max(5).optional(),
          language: z.string().optional(),
          requireAvailability: z.boolean().optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED", message: "يجب تسجيل الدخول." });
        const request = await db.getConsultationRequest(input.requestId);
        if (!request || request.userId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "ليس لديك صلاحية لهذا الطلب." });
        }
        if (request.status !== "pending_advisor") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "لا يمكن إعادة المطابقة في هذه الحالة." });
        }

        const tierPriority = await getTierPriorityWeight((ctx.userTier || "free") as any);
        const consultants = await db.getConsultants();

        const filtered = consultants
          .filter((c: any) => c.status === "active")
          .filter((c: any) => {
            if (input.specialty && c.specialty !== input.specialty && !(Array.isArray(c.specialties) && c.specialties.includes(input.specialty))) {
              return false;
            }
            if (input.language && Array.isArray(c.languages) && !c.languages.includes(input.language)) {
              return false;
            }
            if (input.minRating) {
              const ratingScaled = c.ratingAvg ?? c.rating ?? 0;
              const ratingStars = ratingScaled > 5 ? ratingScaled / 100 : ratingScaled;
              if (ratingStars < input.minRating) return false;
            }
            if (input.requireAvailability && c.availability && Array.isArray(c.availability) && c.availability.length === 0) {
              return false;
            }
            return true;
          })
          .map((c: any) => {
            const ratingScore = c.ratingAvg ?? c.rating ?? 0;
            const experienceScore = (c.experienceYears || 0) * 10;
            const base = tierPriority * 1000 + ratingScore + experienceScore;
            return { advisor: c, score: base };
          })
          .sort((a, b) => b.score - a.score || (a.advisor.id ?? 0) - (b.advisor.id ?? 0));

        const dbClient = await db.getDb();
        if (dbClient) {
          // Clear previous assignments for this request
          await dbClient.delete(requestAssignments).where(eq(requestAssignments.requestId, input.requestId));
          for (let i = 0; i < filtered.length; i++) {
            const entry = filtered[i];
            await db.createRequestAssignment({
              requestId: input.requestId,
              advisorId: entry.advisor.id,
              rank: i + 1,
              status: "offered",
            });
          }
        }

        return {
          requestId: input.requestId,
          results: filtered.map((f, idx) => ({
            advisorId: f.advisor.id,
            name: f.advisor.name,
            specialty: f.advisor.specialty,
            score: f.score,
            rank: idx + 1,
          })),
        };
      }),

    advisorAssignments: protectedProcedure
      .input(z.object({}).optional())
      .query(async ({ ctx }) => {
        const advisor = await requireAdvisor(ctx);
        return db.listAssignmentsForAdvisor(advisor.id);
      }),

    advisorRespond: protectedProcedure
      .input(
        z.object({
          assignmentId: z.number().int().positive(),
          decision: z.enum(["accept", "decline"]),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const advisor = await requireAdvisor(ctx);
        const dbClient = await db.getDb();
        if (!dbClient) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

        const assignment = await dbClient
          .select()
          .from(requestAssignments)
          .where(eq(requestAssignments.id, input.assignmentId));
        if (assignment.length === 0) throw new TRPCError({ code: "NOT_FOUND", message: "التكليف غير موجود." });
        const record = assignment[0];
        if (record.advisorId !== advisor.id) throw new TRPCError({ code: "FORBIDDEN", message: "ليست مهمة هذا المستشار." });

        const request = await db.getConsultationRequest(record.requestId);
        if (!request) throw new TRPCError({ code: "NOT_FOUND", message: "الطلب غير موجود." });
        if (request.status !== "pending_advisor") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "لا يمكن الاستجابة في هذه الحالة." });
        }

        if (input.decision === "accept") {
          assertTransition(request.status, "accepted");
          await db.updateConsultationRequestFields(request.id, { advisorId: record.advisorId });
          await db.updateConsultationRequestStatus(request.id, "accepted", ctx.user.id);
          await db.updateRequestAssignmentStatus(input.assignmentId, "accepted", new Date());
        } else {
          await db.updateRequestAssignmentStatus(input.assignmentId, "declined", new Date());
        }

        return { requestId: record.requestId, status: input.decision === "accept" ? "accepted" : "declined" };
      }),

    addMessage: tierProtectedProcedure
      .input(
        z.object({
          requestId: z.number().int().positive(),
          content: z.string().min(1).max(4000),
          attachments: z
            .array(
              z.object({
                id: z.number().optional(),
                path: z.string().optional(),
                name: z.string().optional(),
                type: z.string().optional(),
              }),
            )
            .optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED", message: "يجب تسجيل الدخول." });
        const request = await db.getConsultationRequest(input.requestId);
        if (!request) {
          throw new TRPCError({ code: "NOT_FOUND", message: "الطلب غير موجود." });
        }
        // Messaging is allowed only when session is in progress (after payment reserved and started)
        if (!["in_progress"].includes(request.status)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "لا يمكن إرسال الرسائل قبل بدء الجلسة أو بعد انتهائها.",
          });
        }

        const dbClient = await db.getDb();
        if (!dbClient) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

        let senderRole: "user" | "advisor" | "system" = "user";
        let senderUserId: number | null = null;
        let senderAdvisorId: number | null = null;

        if (ctx.user.role === "consultant" || ctx.user.role === "advisor") {
          const advisor = await requireAdvisor(ctx);
          // Must be assigned advisor
          const assignment = await dbClient
            .select()
            .from(requestAssignments)
            .where(eq(requestAssignments.requestId, input.requestId));
          const assigned = assignment.find((a) => a.advisorId === advisor.id);
          if (!assigned || (request.advisorId && request.advisorId !== advisor.id)) {
            throw new TRPCError({ code: "FORBIDDEN", message: "ليست مهمتك." });
          }
          senderRole = "advisor";
          senderAdvisorId = advisor.id;
        } else {
          if (request.userId !== ctx.user.id) {
            throw new TRPCError({ code: "FORBIDDEN", message: "لا صلاحية لهذا الطلب." });
          }
          senderRole = "user";
          senderUserId = ctx.user.id;
          await enforceUsageLimit({ userId: ctx.user.id, tier: (ctx.userTier || "free") as any, action: "advisor_chat" });
        }

        const messageId = await db.addConsultationMessage({
          requestId: input.requestId,
          senderRole,
          senderUserId,
          senderAdvisorId,
          content: input.content,
          attachments: input.attachments || null,
        });

        // Move paid -> in_progress on the first user message after payment
        if (senderRole === "user" && request.status === "paid") {
          assertTransition("paid", "in_progress");
          await db.updateConsultationRequestStatus(request.id, "in_progress", ctx.user.id);
        }

        return { id: messageId };
      }),

    uploadFile: tierProtectedProcedure
      .input(
        z.object({
          requestId: z.number().int().positive(),
          fileName: z.string().min(1).max(255),
          fileType: z.enum(["pdf", "image", "doc", "other"]),
          mimeType: z.string().min(1).max(120).optional(),
          size: z.number().int().positive().optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED", message: "يجب تسجيل الدخول." });

        const request = await db.getConsultationRequest(input.requestId);
        if (!request) throw new TRPCError({ code: "NOT_FOUND", message: "الطلب غير موجود." });
        if (!["in_progress"].includes(request.status)) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "لا يمكن رفع الملفات إلا أثناء الجلسة." });
        }

        const dbClient = await db.getDb();
        if (!dbClient) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

        let uploaderRole: "user" | "advisor" | "system" = "user";
        let uploaderUserId: number | null = null;
        let uploaderAdvisorId: number | null = null;

        if (ctx.user.role === "consultant" || ctx.user.role === "advisor") {
          const advisor = await requireAdvisor(ctx);
          const assignment = await dbClient
            .select()
            .from(requestAssignments)
            .where(eq(requestAssignments.requestId, input.requestId));
          const assigned = assignment.find((a) => a.advisorId === advisor.id);
          if (!assigned || (request.advisorId && request.advisorId !== advisor.id)) {
            throw new TRPCError({ code: "FORBIDDEN", message: "ليست مهمتك." });
          }
          uploaderRole = "advisor";
          uploaderAdvisorId = advisor.id;
        } else {
          if (request.userId !== ctx.user.id) {
            throw new TRPCError({ code: "FORBIDDEN", message: "لا صلاحية لهذا الطلب." });
          }
          uploaderUserId = ctx.user.id;
          uploaderRole = "user";
        }
        return attachConsultationFile({
          requestId: input.requestId,
          fileName: input.fileName,
          fileType: input.fileType,
          mimeType: input.mimeType || null,
          size: input.size || null,
          uploaderRole,
          uploaderUserId,
          uploaderAdvisorId,
        });
      }),

    listFiles: tierProtectedProcedure
      .input(z.object({ requestId: z.number().int().positive() }))
      .query(async ({ ctx, input }) => {
        if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED", message: "يجب تسجيل الدخول." });
        const request = await db.getConsultationRequest(input.requestId);
        if (!request) throw new TRPCError({ code: "NOT_FOUND", message: "الطلب غير موجود." });
        if (["closed", "rated"].includes(request.status)) {
          throw new TRPCError({ code: "FORBIDDEN", message: "انتهى الوصول إلى ملفات هذا الطلب." });
        }

        const dbClient = await db.getDb();
        if (!dbClient) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

        const isOwner = request.userId === ctx.user.id;
        const isAdvisor =
          (ctx.user.role === "consultant" || ctx.user.role === "advisor") &&
          ((request.advisorId && request.advisorId === ctx.user.id) ||
            (await dbClient
              .select()
              .from(requestAssignments)
              .where(eq(requestAssignments.requestId, input.requestId))
              .then((rows) => rows.some((r) => r.advisorId === ctx.user?.id))));

        if (!isOwner && !isAdvisor) {
          throw new TRPCError({ code: "FORBIDDEN", message: "لا صلاحية لهذا الطلب." });
        }

        const files = await db.listConsultationFiles(input.requestId);
        return files;
      }),

    getFileUrl: tierProtectedProcedure
      .input(z.object({ fileId: z.number().int().positive() }))
      .query(async ({ ctx, input }) => {
        if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED", message: "يجب تسجيل الدخول." });
        if (!supabase) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "التخزين غير مهيأ. تحقق من SUPABASE_URL و SUPABASE_SERVICE_ROLE_KEY." });
        }

        const file = await db.getConsultationFile(input.fileId);
        if (!file) throw new TRPCError({ code: "NOT_FOUND", message: "الملف غير موجود." });

        const request = await db.getConsultationRequest(file.consultationId);
        if (!request) throw new TRPCError({ code: "NOT_FOUND", message: "الطلب غير موجود." });
        if (["closed", "rated"].includes(request.status)) {
          throw new TRPCError({ code: "FORBIDDEN", message: "انتهى الوصول إلى ملفات هذا الطلب." });
        }

        const dbClient = await db.getDb();
        if (!dbClient) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

        const isOwner = request.userId === ctx.user.id;
        const isAdvisor =
          (ctx.user.role === "consultant" || ctx.user.role === "advisor") &&
          ((request.advisorId && request.advisorId === ctx.user.id) ||
            (await dbClient
              .select()
              .from(requestAssignments)
              .where(eq(requestAssignments.requestId, file.consultationId))
              .then((rows) => rows.some((r) => r.advisorId === ctx.user?.id))));

        if (!isOwner && !isAdvisor) {
          throw new TRPCError({ code: "FORBIDDEN", message: "لا صلاحية لهذا الملف." });
        }

        const { data, error } = await supabase.storage
          .from("consultations")
          .createSignedUrl(file.storagePath, 300); // 5 minutes
        if (error || !data?.signedUrl) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "تعذر إنشاء رابط التنزيل." });
        }

        return { url: data.signedUrl, expiresIn: 300 };
      }),

    requestPayment: tierProtectedProcedure
      .input(
        z.object({
          requestId: z.number().int().positive(),
          grossAmountKwd: z.number().int().positive(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED", message: "يجب تسجيل الدخول." });
        const request = await db.getConsultationRequest(input.requestId);
        if (!request || request.userId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "لا صلاحية لهذا الطلب." });
        }
        if (request.status !== "in_progress") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "لا يمكن طلب الدفع في هذه الحالة." });
        }

        const discountRateBps = request.discountRateBps ?? (await getTierDiscountBps((ctx.userTier || "free") as any));
        const discountAmount = Math.round((input.grossAmountKwd * discountRateBps) / 10000);
        const netAmount = input.grossAmountKwd - discountAmount;

        await db.updateConsultationRequestFields(request.id, {
          grossAmountKwd: input.grossAmountKwd,
          discountAmountKwd: discountAmount,
          netAmountKwd: netAmount,
        });

        assertTransition("in_progress", "awaiting_payment");
        await db.updateConsultationRequestStatus(request.id, "awaiting_payment", ctx.user.id);

        return { requestId: request.id, grossAmountKwd: input.grossAmountKwd, discountAmountKwd: discountAmount, netAmountKwd: netAmount };
      }),

    pay: tierProtectedProcedure
      .input(
        z.object({
          requestId: z.number().int().positive(),
          paymentReference: z.string().optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED", message: "يجب تسجيل الدخول." });
        const request = await db.getConsultationRequest(input.requestId);
        if (!request || request.userId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "لا صلاحية لهذا الطلب." });
        }
        if (request.status !== "awaiting_payment") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "الحالة الحالية لا تسمح بالدفع." });
        }

        const gross = request.grossAmountKwd ?? 0;
        const discountAmount = request.discountAmountKwd ?? 0;
        const netAmount = request.netAmountKwd ?? gross - discountAmount;

        const dbClient = await db.getDb();
        if (!dbClient) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

        await dbClient.insert(orders).values({
          userId: ctx.user.id,
          requestId: request.id,
          serviceType: "consultation",
          priceKWD: gross,
          grossAmountKwd: gross,
          discountAmountKwd: discountAmount,
          netAmountKwd: netAmount,
          currency: request.currency || "KWD",
          tierSnapshot: request.userTierSnapshot,
          status: "completed",
          notes: input.paymentReference || null,
        });

        assertTransition("awaiting_payment", "paid");
        await db.updateConsultationRequestStatus(request.id, "paid", ctx.user.id);

        return { requestId: request.id, netAmountKwd: netAmount, status: "paid" };
      }),

    close: tierProtectedProcedure
      .input(z.object({ requestId: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED", message: "يجب تسجيل الدخول." });
        const request = await db.getConsultationRequest(input.requestId);
        if (!request || request.userId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "لا صلاحية لهذا الطلب." });
        }
        if (request.status !== "paid") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "لا يمكن الإغلاق قبل الدفع." });
        }

        assertTransition("paid", "closed");
        await db.updateConsultationRequestStatus(request.id, "closed", ctx.user.id);

        return { requestId: request.id, status: "closed" };
      }),

    rate: tierProtectedProcedure
      .input(
        z.object({
          requestId: z.number().int().positive(),
          score: z.number().int().min(1).max(5),
          comment: z.string().max(2000).optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED", message: "يجب تسجيل الدخول." });
        const request = await db.getConsultationRequest(input.requestId);
        if (!request || request.userId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "لا صلاحية لهذا الطلب." });
        }
        if (request.status !== "closed") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "لا يمكن التقييم قبل الإغلاق." });
        }

        await db.addAdvisorRating({
          requestId: request.id,
          advisorId: request.advisorId || 0,
          userId: ctx.user.id,
          score: input.score,
          comment: input.comment || null,
        });

        assertTransition("closed", "rated");
        await db.updateConsultationRequestStatus(request.id, "rated", ctx.user.id);

        return { requestId: request.id, status: "rated" };
      }),
  }),

  partner: router({
    dashboard: protectedProcedure.query(async ({ ctx }) => {
      const advisor = await requireAdvisor(ctx);
      const dbClient = await db.getDb();
      if (!dbClient) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      const rows = await dbClient
        .select({
          request: consultationRequests,
          assignmentId: requestAssignments.id,
          assignmentStatus: requestAssignments.status,
        })
        .from(consultationRequests)
        .leftJoin(requestAssignments, eq(requestAssignments.requestId, consultationRequests.id))
        .where(eq(requestAssignments.advisorId, advisor.id));

      const dedup = new Map<number, any>();
      rows.forEach((row) => {
        dedup.set(row.request.id, row);
      });
      const list = Array.from(dedup.values());

      const isNew = (r: any) => r.request.status === "pending_advisor";
      const isActive = (r: any) => ["accepted", "in_progress", "paid"].includes(r.request.status as string);
      const isCompleted = (r: any) => ["closed", "rated"].includes(r.request.status as string);

      const toShape = (r: any) => ({
        assignmentId: r.assignmentId,
        status: r.request.status,
        requestId: r.request.id,
        summary: r.request.summary,
        createdAt: r.request.createdAt,
        userId: r.request.userId,
        advisorId: r.request.advisorId,
      });

      const newOrders = list.filter(isNew).map(toShape);
      const activeOrders = list.filter(isActive).map(toShape);
      const completedOrders = list.filter(isCompleted).map(toShape);

      return {
        advisorId: advisor.id,
        stats: {
          newCount: newOrders.length,
          activeCount: activeOrders.length,
          completedCount: completedOrders.length,
        },
        newOrders,
        activeOrders,
        completedOrders,
      };
    }),

    earnings: protectedProcedure.query(async ({ ctx }) => {
      const advisor = await requireAdvisor(ctx);
      const rows = await getAdvisorCompletedOrders(advisor.id);
      const totals = computeAdvisorEarnings(rows);

      return {
        grossAmountKwd: totals.gross,
        platformFeeKwd: totals.platform,
        netAmountKwd: totals.net,
      };
    }),

    transactions: protectedProcedure
      .input(z.object({ limit: z.number().optional().default(50) }).optional())
      .query(async ({ ctx, input }) => {
        const advisor = await requireAdvisor(ctx);
        const rows = await getAdvisorCompletedOrders(advisor.id);
        const limited = rows.slice(0, input?.limit || 50);

        return limited.map((row) => ({
          id: row.order.id,
          createdAt: row.order.createdAt,
          status: row.order.status,
          amount: row.order.netAmountKwd ?? row.order.priceKWD ?? 0,
          currency: row.order.currency,
          serviceType: row.order.serviceType,
          requestId: row.order.requestId,
        }));
      }),

    profileGet: protectedProcedure.query(async ({ ctx }) => {
      const advisor = await requireAdvisor(ctx);
      let bioJson: any = {};
      if (advisor.bio) {
        try {
          bioJson = JSON.parse(advisor.bio as any);
        } catch {
          bioJson = {};
        }
      }
      return {
        advisorId: advisor.id,
        name: advisor.name,
        email: advisor.email,
        phone: advisor.phone,
        specialty: advisor.specialty,
        companyName: bioJson.companyName || null,
        bank: bioJson.bank || null,
        documents: bioJson.documents || [],
      };
    }),

    profileUpdate: protectedProcedure
      .input(
        z.object({
          companyName: z.string().optional().nullable(),
          phone: z.string().optional().nullable(),
          specialty: z.string().optional().nullable(),
          bank: z
            .object({
              name: z.string().optional().nullable(),
              iban: z.string().optional().nullable(),
              accountName: z.string().optional().nullable(),
            })
            .optional()
            .nullable(),
          documents: z
            .array(
              z.object({
                name: z.string(),
                url: z.string(),
              }),
            )
            .optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const advisor = await requireAdvisor(ctx);
        const updated = await db.updateConsultantProfile(advisor.id, {
          companyName: input.companyName ?? null,
          phone: input.phone ?? null,
          specialty: input.specialty ?? undefined,
          bank: input.bank ?? null,
          documents: input.documents ?? null,
        });
        return { success: true, advisorId: advisor.id, profile: updated };
      }),

    requestWithdrawal: protectedProcedure
      .input(
        z.object({
          amountKwd: z.number().int().positive(),
          bankDetails: z
            .object({
              name: z.string().optional().nullable(),
              iban: z.string().optional().nullable(),
              accountName: z.string().optional().nullable(),
            })
            .optional()
            .nullable(),
          notes: z.string().max(1000).optional().nullable(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const advisor = await requireAdvisor(ctx);
        const { requestWithdrawal } = await import("./_core/withdrawals.js");
        return requestWithdrawal({
          advisorId: advisor.id,
          amountKwd: input.amountKwd,
          bankDetails: input.bankDetails || null,
          notes: input.notes || null,
        });
      }),

    listWithdrawals: protectedProcedure.query(async ({ ctx }) => {
      const advisor = await requireAdvisor(ctx);
      const { listAdvisorWithdrawals } = await import("./_core/withdrawals.js");
      return listAdvisorWithdrawals(advisor.id);
    }),

    getBalance: protectedProcedure.query(async ({ ctx }) => {
      const advisor = await requireAdvisor(ctx);
      const { calculateAdvisorBalance } = await import("./_core/withdrawals.js");
      const balance = await calculateAdvisorBalance(advisor.id);
      return { balanceKwd: balance, availableKwd: balance };
    }),
  }),

  // AI Chat Router
  // NOTE: This router is strictly for AI-only conversations.
  // It must never be used for advisor consultations. Consultations live under `consultations.*`
  // and persist to `consultation_requests` / `consultation_messages`, whereas AI chat persists to
  // `conversations` / `messages`.
  ai: router({
    /**
     * AI Chat - General Islamic financial guidance
     * Purpose: Provide educational Islamic financial advice
     * Input: message, context (optional)
     * AI: Gemini API with system prompt
     * Output: reply with disclaimer, optional sources
     * Errors: Graceful error handling, no internal errors exposed
     */
    chat: publicProcedure
      .input(
        z.object({
          message: z.string().min(1).max(5000),
          context: z.string().optional().default("general"),
          conversationId: z.number().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        try {
          const clientIp = getClientIp({ headers: ctx.req.headers });
          const isGuest = !ctx.user;
          
          // For authenticated users: use tier-based limits
          if (ctx.user) {
            await enforceUsageLimit({ userId: ctx.user.id, tier: (ctx.userTier || "free") as any, action: "ai" });
          } else {
            // For guest users: use IP-based rate limiting (5 requests per day)
            const guestLimitKey = `guest-ai:${clientIp}`;
            const rateLimit = await checkRateLimitRedis(guestLimitKey, 5, 24 * 60 * 60 * 1000); // 5 per 24 hours
            if (!rateLimit.allowed) {
              throw new TRPCError({
                code: "FORBIDDEN",
                message: "تم بلوغ الحد المسموح للدردشة كضيف. يرجى تسجيل الدخول للمزيد من المحادثات.",
              });
            }
          }

          // Load AI runtime settings (prompt, memory, tokens) - MUST be loaded before use
          const aiSettings = await loadAiSettings();

          // For authenticated users: persist conversation (AI-only)
          const HISTORY_LIMIT = 12; // keep memory recent for cost/perf
          const HISTORY_CHAR_CAP = 2000; // cap characters sent to model

          let conversationId = input.conversationId;
          let historyText = "";
          let userMessageId: number | undefined;
          
          const shouldUseMemory = aiSettings.memoryEnabled && !!ctx.user;

          if (ctx.user && shouldUseMemory) {
            // Conversation persistence is a nice-to-have. If DB has issues, we should still answer.
            try {
              if (conversationId) {
                const existing = await db.getConversation(conversationId);
                if (!existing || existing.userId !== ctx.user.id) {
                  throw new TRPCError({
                    code: "FORBIDDEN",
                    message: "المحادثة غير متاحة.",
                  });
                }
              }

              // Create if none was provided
              if (!conversationId) {
                conversationId = await db.createConversation({
                  userId: ctx.user.id,
                  context: input.context || "general",
                  title: undefined,
                });
              }

              // Persist user message first
              userMessageId = await db.addMessage({
                conversationId,
                role: "user",
                content: input.message,
                sources: null,
              });
              await db.updateConversation(conversationId, { updatedAt: new Date() });

              // Load recent context (bounded memory)
              const history = await db.getRecentConversationMessages(conversationId, HISTORY_LIMIT);
              const orderedHistory = history.reverse(); // chronological
              historyText = orderedHistory
                .map((m) => `${m.role === "assistant" ? "مساعد" : "مستخدم"}: ${m.content}`)
                .join("\n");
              if (historyText.length > HISTORY_CHAR_CAP) {
                historyText = historyText.slice(-HISTORY_CHAR_CAP); // safety cap on characters
              }
            } catch (persistenceError) {
              if (persistenceError instanceof TRPCError) {
                throw persistenceError;
              }
              logger.warn("AI chat persistence unavailable; continuing without memory", {
                userId: ctx.user.id,
                conversationId,
                error:
                  persistenceError instanceof Error
                    ? persistenceError.message
                    : String(persistenceError),
              });
              conversationId = undefined;
              historyText = "";
              userMessageId = undefined;
            }
          }
          // For guests or when memory disabled: no conversation persistence, no history

          // Optional: Search knowledge base for relevant documents (if RAG is implemented)
          let ragContext = "";
          const sources: { title: string; url: string }[] = [];
          
          try {
            const knowledgeDocs = await db.searchKnowledgeBase(input.message);
          if (knowledgeDocs && knowledgeDocs.length > 0) {
            ragContext = "\n\nالمعلومات المتاحة من قاعدة المعرفة:\n";
              knowledgeDocs.slice(0, 3).forEach((doc: any, index: number) => {
              ragContext += `\n[${index + 1}] ${doc.title}:\n${doc.content?.substring(0, 500)}...\n`;
                if (doc.sourceUrl) {
              sources.push({
                    title: doc.title || "مصدر",
                    url: doc.sourceUrl,
                  });
                }
              });
            }
          } catch (ragError) {
            // RAG is optional, don't fail if it doesn't work
            logger.debug("RAG search failed (optional)", {
              error: ragError instanceof Error ? ragError.message : String(ragError),
            });
          }

          // Detect user intent
          let intent = detectUserIntent(input.message, historyText);
          // Treat very short / non-question inputs as clarify-only
          const trimmedMsg = input.message.trim();
          const isUnclear = intent === "NEW_QUESTION" && trimmedMsg.length < 12 && !/[؟?]/.test(trimmedMsg);
          if (isUnclear) intent = "EMPTY_OR_ACK";
          // For trivial/ack intents, avoid sending bulky history to the model
          if (intent === "EMPTY_OR_ACK") {
            historyText = "";
          }
          const hasDisclaimer = historyText ? hasRecentDisclaimer(historyText) : false;
          
          // Determine response mode based on intent
          let systemPrompt: string;
          let maxTokens: number;
          let shouldAddDisclaimer: boolean;
          
          if (intent === "EMPTY_OR_ACK") {
            // Short response mode - no analysis, no disclaimers
            systemPrompt = aiSettings.systemPrompt || SHORT_RESPONSE_PROMPT;
            maxTokens = aiSettings.shortMaxTokens || 150; // Very short responses
            shouldAddDisclaimer = false;
          } else if (intent === "FOLLOW_UP" && hasDisclaimer) {
            // Follow-up: expand specific point, no full structure, no duplicate disclaimer
            systemPrompt = `${aiSettings.systemPrompt || ISLAMIC_FINANCE_SYSTEM_PROMPT}

⚠️ مهم: المستخدم يطلب توضيحاً أو متابعة. ركز فقط على النقطة المحددة دون إعادة الهيكل الكامل (التحليل المعرفي، التنبيه، الإحالة). لا تكرر التنبيهات والإحالات التي تم ذكرها سابقاً.`;
            maxTokens = aiSettings.maxTokens || 800; // Moderate length for follow-ups
            shouldAddDisclaimer = false; // Already in history
          } else if (intent === "FOLLOW_UP") {
            // Follow-up but no previous disclaimer
            systemPrompt = `${aiSettings.systemPrompt || ISLAMIC_FINANCE_SYSTEM_PROMPT}

⚠️ مهم: المستخدم يطلب توضيحاً أو متابعة. ركز فقط على النقطة المحددة دون إعادة الهيكل الكامل.`;
            maxTokens = aiSettings.maxTokens || 800;
            shouldAddDisclaimer = true; // Add once
          } else {
            // NEW_QUESTION or DOCUMENT_ANALYSIS: full analysis
            const contextBlock = historyText ? `\n\nسياق المحادثة (مختصر):\n${historyText}` : "";
            systemPrompt = (aiSettings.systemPrompt || FULL_ANALYSIS_PROMPT) + contextBlock + (ragContext ? `\n\n${ragContext}` : "");
            maxTokens = aiSettings.maxTokens || 2000; // Full analysis can be longer
            shouldAddDisclaimer = !hasDisclaimer; // Only if not already present
          }

          // Call Gemini API
          const response = await invokeGemini({
            systemPrompt,
            userMessage: input.message,
            temperature: 0.7,
            maxTokens,
            responseFormat: "text",
          });

          // Clean response text
          let cleanedText = (response.text || "").trim().replace(/\n{3,}/g, "\n\n");
          
          // Enforce length caps by intent
          if (intent === "EMPTY_OR_ACK" && cleanedText.length > 200) {
            // Force short response
            const lines = cleanedText.split("\n").filter(l => l.trim());
            cleanedText = lines.slice(0, 2).join("\n").substring(0, 200);
          } else if (intent === "FOLLOW_UP" && cleanedText.length > 1000) {
            // Cap follow-ups
            cleanedText = cleanedText.substring(0, 1000) + "...";
          }
          
          // Add disclaimer only when needed
          let reply = cleanedText;
          
          // Never add disclaimer for empty/ack responses
          if (intent === "EMPTY_OR_ACK") {
            reply = cleanedText; // Already set, no disclaimer
          } 
          // For follow-ups: only add if not already in history
          else if (intent === "FOLLOW_UP" && shouldAddDisclaimer) {
            reply = `${cleanedText}\n\n${MANDATORY_NOTES}\n\n${AI_DISCLAIMER}`;
          }
          // For new questions/analysis: add if not already in response text
          else if ((intent === "NEW_QUESTION" || intent === "DOCUMENT_ANALYSIS") && shouldAddDisclaimer) {
            // Check if disclaimer keywords are already in the response
            const hasDisclaimerInText = cleanedText.includes("تنبيه") || cleanedText.includes("إحالة") || cleanedText.includes("مختص");
            if (!hasDisclaimerInText) {
              reply = `${cleanedText}\n\n${MANDATORY_NOTES}\n\n${AI_DISCLAIMER}`;
            }
          }

          // Persist assistant reply only for authenticated users
          let assistantMessageId: number | undefined;
          if (ctx.user && conversationId) {
            assistantMessageId = await db.addMessage({
              conversationId,
              role: "assistant",
              content: reply,
              sources: sources.length ? sources : null,
            });
            await db.updateConversation(conversationId, { updatedAt: new Date() });
          }

          // Log usage if available
          if (response.usage) {
            logger.info("AI chat usage", {
              promptTokens: response.usage.promptTokens,
              completionTokens: response.usage.completionTokens,
              totalTokens: response.usage.totalTokens,
            });
          }

          return {
            reply,
            sources: sources.length > 0 ? sources : undefined,
            notes: undefined,
            conversationId: conversationId || undefined,
            messageIds: ctx.user && userMessageId && assistantMessageId ? { userMessageId, assistantMessageId } : undefined,
          };
        } catch (error) {
          // If it's an expected/user-facing error (limits, auth, validation), propagate it
          // so the client can display the real message (and e.g. show the upgrade modal).
          if (error instanceof TRPCError) {
            throw error;
          }

          logger.error("AI Chat Error", error instanceof Error ? error : new Error(String(error)), {
            message: input.message.substring(0, 100),
            context: input.context,
          });

          // Don't expose internal errors to users
          // Short error message without full disclaimers
          return {
            reply: `تعذر إكمال الطلب حالياً. يمكنك المحاولة لاحقاً.`,
            sources: undefined,
            notes: undefined,
            conversationId: input.conversationId,
          };
        }
      }),

    /**
     * Contract Analysis - REAL analysis, NO fake scores
     * Purpose: Analyze contract text for Sharia considerations
     * Input: fileUrl, fileName, fileContent (optional)
     * AI: Gemini API with contract analysis prompt
     * Output: Structured analysis (NO numeric scores)
     * Rules: No Math.random, no fake scores, say if unclear
     */
    analyzeContract: tierProtectedProcedure
      .input(
        z.object({
          fileUrl: z.string(),
          fileName: z.string(),
          fileContent: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        try {
          if (!ctx.user) {
            throw new TRPCError({ code: "UNAUTHORIZED", message: "يجب تسجيل الدخول لتحليل العقود." });
          }
          await enforceUsageLimit({ userId: ctx.user.id, tier: (ctx.userTier || "free") as any, action: "ai" });

          if (!input.fileContent || input.fileContent.trim().length === 0) {
            return {
              summary: "لا يمكن تحليل العقد بدون محتوى. يرجى توفير نص العقد.",
              keyClauses: [],
              shariaConcerns: [],
              overallAssessment: "لا توجد بيانات كافية للتحليل.",
            };
          }

          const contractAnalysisPrompt = `${ISLAMIC_FINANCE_SYSTEM_PROMPT}

التزم بالعربية فقط وبالصياغة الاحتمالية. ضع التحليل المعرفي داخل الحقول المطلوبة في JSON، مع تضمين تنبيه اختلاف الحالات وإحالة مختص مرخّص ضمن النصوص داخل الحقول.

أنت الآن تحلل عقداً من المنظور الشرعي.

قواعد مهمة:
- حلل النص منطقياً
- حدد البنود ذات الصلة
- اشرح المخاوف الشرعية المحتملة
- لا تولد أرقام عشوائية
- لا تخترع تفسيرات
- إذا كان النص غير واضح، قل ذلك بوضوح
- لا تعطي تقييماً رقمياً للامتثال

قم بتحليل العقد وأجب بصيغة JSON:
{
  "summary": "ملخص العقد والبنود الرئيسية",
  "keyClauses": ["البند 1", "البند 2"],
  "shariaConcerns": ["المخاوف الشرعية إن وجدت"],
  "overallAssessment": "تقييم نوعي فقط (لا أرقام)"
}`;

          const userPrompt = `قم بتحليل هذا العقد من المنظور الشرعي:

اسم الملف: ${input.fileName}
محتوى العقد:
${input.fileContent}

قدم تحليلاً شرعياً شاملاً. إذا كان النص غير واضح أو ناقصاً، اذكر ذلك بوضوح.`;

          const response = await invokeGemini({
            systemPrompt: contractAnalysisPrompt,
            userMessage: userPrompt,
            temperature: 0.3, // Lower temperature for more consistent analysis
            maxTokens: 4096,
            responseFormat: "json",
          });

          let result;
          try {
            result = JSON.parse(response.text);
          } catch (parseError) {
            // If JSON parsing fails, return structured text response
            logger.warn("Contract analysis JSON parse failed, using text response");
            result = {
              summary: response.text.substring(0, 500),
              keyClauses: [],
              shariaConcerns: [],
              overallAssessment: response.text,
            };
          }

          // Ensure all required fields exist
          const caseWarning = "الحالات قد تختلف حسب تفاصيل العقد والسياق القانوني.";
          const specialistReferral = "يُفضّل مراجعة مختص مرخّص قبل أي اعتماد.";
          const overall = (result.overallAssessment || "لا يمكن تقديم تقييم بدون تحليل كامل").trim();
          const overallAssessment = `${overall}\n${caseWarning}\n${specialistReferral}`;

          return {
            summary: result.summary || "لم يتم إنتاج ملخص",
            keyClauses: Array.isArray(result.keyClauses) ? result.keyClauses : [],
            shariaConcerns: Array.isArray(result.shariaConcerns) ? result.shariaConcerns : [],
            overallAssessment,
          };
        } catch (error) {
          logger.error("Contract Analysis Error", error instanceof Error ? error : new Error(String(error)), {
            fileName: input.fileName,
          });
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "فشل في تحليل العقد. يرجى المحاولة مرة أخرى.",
          });
        }
      }),

    /**
     * Stock Sharia Screening - HONEST MODE
     * Purpose: Explain Sharia screening criteria, NO verdicts
     * Input: symbol, name (optional)
     * AI: Gemini API with honest screening prompt
     * Output: Explanation only, no verdict, clear uncertainty disclosure
     * Rules: If no real data → say "insufficient data", no hallucinated data
     */
    screenStock: tierProtectedProcedure
      .input(
        z.object({
          symbol: z.string().min(1).max(20),
          name: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        try {
          if (!ctx.user) {
            throw new TRPCError({ code: "UNAUTHORIZED", message: "يجب تسجيل الدخول لاستخدام فحص الأسهم." });
          }
          await enforceUsageLimit({ userId: ctx.user.id, tier: (ctx.userTier || "free") as any, action: "ai" });

          const stockScreeningPrompt = `${ISLAMIC_FINANCE_SYSTEM_PROMPT}

التزم بالعربية فقط وبالصياغة الاحتمالية. ضع التحليل المعرفي داخل الحقول المطلوبة في JSON، مع تضمين تنبيه اختلاف الحالات وإحالة مختص مرخّص ضمن النصوص داخل الحقول.

أنت الآن تشرح مبادئ الفحص الشرعي للأسهم.

قواعد مهمة:
- إذا لم تتوفر بيانات مالية حقيقية → قل بوضوح "البيانات غير كافية"
- لا تهلوس عن الميزانيات العمومية
- لا تفترض أنشطة الشركة
- اشرح معايير الفحص الشرعي الشائعة بشكل مفاهيمي
- لا تعطي حكماً نهائياً
- لا تستخدم لغة شراء/بيع
- اذكر عدم اليقين بوضوح

أجب بصيغة JSON:
{
  "complianceStatus": "halal" | "haram" | "doubtful" | "insufficient_data",
  "complianceScore": null أو number فقط إذا كانت البيانات متوفرة فعلياً,
  "analysis": "شرح مفصل للمعايير والاعتبارات",
  "factors": ["العوامل التي تم فحصها"],
  "recommendation": "توصية تعليمية فقط (لا حكم نهائي)",
  "dataAvailability": "متوفرة" | "غير كافية" | "غير متوفرة",
  "uncertaintyNote": "ملاحظة عن عدم اليقين إن وجدت"
}`;

          const userPrompt = `قم بشرح مبادئ الفحص الشرعي للسهم ${input.symbol}${input.name ? ` (${input.name})` : ""}.

ملاحظة: إذا لم تكن لديك بيانات مالية حقيقية عن هذه الشركة، قل بوضوح "البيانات غير كافية" ولا تخترع معلومات.`;

          const response = await invokeGemini({
            systemPrompt: stockScreeningPrompt,
            userMessage: userPrompt,
            temperature: 0.5,
            maxTokens: 4096,
            responseFormat: "json",
          });

          let result;
          try {
            result = JSON.parse(response.text);
          } catch (parseError) {
            // If JSON parsing fails, return honest response
            logger.warn("Stock screening JSON parse failed, using text response");
            result = {
              complianceStatus: "insufficient_data",
              complianceScore: null,
              analysis: response.text || "لا يمكن تقديم تحليل بدون بيانات كافية",
              factors: [],
              recommendation: "يرجى الحصول على بيانات مالية حقيقية عن الشركة",
              dataAvailability: "غير متوفرة",
              uncertaintyNote: "لا توجد بيانات كافية لإجراء فحص شرعي دقيق",
            };
          }

          // Ensure dataAvailability is set
          if (!result.dataAvailability) {
            result.dataAvailability = result.complianceStatus === "insufficient_data" ? "غير كافية" : "متوفرة";
          }

          // If insufficient data, set score to null
          if (result.dataAvailability === "غير كافية" || result.dataAvailability === "غير متوفرة") {
            result.complianceScore = null;
            result.complianceStatus = "insufficient_data";
          }

          const analysisBase = result.analysis || "لا يمكن تقديم تحليل بدون بيانات كافية";
          const analysis = `${analysisBase}\nالحالات قد تختلف حسب تفاصيل الشركة والبيانات المتاحة.\nيُفضّل مراجعة مختص مرخّص قبل أي قرار.`;
          const uncertaintyNote =
            result.uncertaintyNote ||
            "الحالات تختلف حسب التفاصيل والسياق؛ يُفضّل استشارة مختص مرخّص قبل أي قرار.";

          return {
            complianceStatus: result.complianceStatus || "insufficient_data",
            complianceScore: result.complianceScore ?? null,
            analysis,
            factors: Array.isArray(result.factors) ? result.factors : [],
            recommendation: result.recommendation || "يرجى مراجعة متخصص للحصول على تحليل دقيق",
            dataAvailability: result.dataAvailability || "غير متوفرة",
            uncertaintyNote,
          };
        } catch (error) {
          logger.error("Stock Screening Error", error instanceof Error ? error : new Error(String(error)), {
            symbol: input.symbol,
            name: input.name,
          });
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "فشل في فحص السهم. يرجى المحاولة مرة أخرى.",
          });
        }
      }),
  }),

  // Conversations Router
  conversations: router({
    /**
     * List user's conversations
     * Purpose: Get all conversations for authenticated user
     * Input: limit (optional, default 20), offset (optional, default 0)
     * Database: Query conversations table filtered by userId
     * Errors: None (returns empty array if none)
     */
    list: protectedProcedure
      .input(paginationSchema.optional())
      .query(async ({ ctx, input }) => {
        try {
          const limit = input?.limit || 20;
          const offset = ((input?.page || 1) - 1) * limit;

          const conversations = await db.getUserConversations(ctx.user.id, limit);
          // Note: getUserConversations doesn't support offset yet, but returns limited results
          return conversations;
        } catch (error) {
          logger.error("Failed to list conversations", error instanceof Error ? error : new Error(String(error)), {
            userId: ctx.user.id,
          });
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "فشل في جلب المحادثات",
          });
        }
      }),

    /**
     * Create new conversation
     * Purpose: Create a new conversation for the authenticated user
     * Input: title (optional), context (optional, default "general")
     * Database: Insert into conversations table
     * Errors: Validation failures
     */
    create: protectedProcedure
      .input(conversationCreateSchema)
      .mutation(async ({ ctx, input }) => {
        try {
          const conversationId = await db.createConversation({
          userId: ctx.user.id,
            title: input.title || null,
            context: input.context || "general",
          });

          logger.info("Conversation created", { conversationId, userId: ctx.user.id });

          return { id: conversationId, userId: ctx.user.id, ...input };
        } catch (error) {
          logger.error("Failed to create conversation", error instanceof Error ? error : new Error(String(error)), {
            userId: ctx.user.id,
          });
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "فشل في إنشاء المحادثة",
          });
        }
      }),

    /**
     * Get conversation by ID
     * Purpose: Get single conversation with messages
     * Input: conversationId
     * Database: Query conversations and messages tables
     * Errors: Conversation not found, unauthorized (not user's conversation)
     */
    get: protectedProcedure
      .input(z.object({ conversationId: z.number().int().positive() }))
      .query(async ({ ctx, input }) => {
        try {
          const conversation = await db.getConversation(input.conversationId);
          if (!conversation) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "المحادثة غير موجودة",
            });
          }

          // Verify conversation belongs to user
          if (conversation.userId !== ctx.user.id) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "ليس لديك صلاحية للوصول إلى هذه المحادثة",
            });
          }

          // Get messages
          const messages = await db.getConversationMessages(input.conversationId);

          return {
            ...conversation,
            messages,
          };
        } catch (error) {
          if (error instanceof TRPCError) {
            throw error;
          }
          logger.error("Failed to get conversation", error instanceof Error ? error : new Error(String(error)), {
            conversationId: input.conversationId,
            userId: ctx.user.id,
          });
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "فشل في جلب المحادثة",
          });
        }
      }),

    /**
     * Delete conversation
     * Purpose: Delete conversation and all its messages
     * Input: conversationId
     * Database: Delete from conversations table (cascade deletes messages)
     * Errors: Conversation not found, unauthorized
     */
    delete: protectedProcedure
      .input(z.object({ conversationId: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        try {
          const conversation = await db.getConversation(input.conversationId);
          if (!conversation) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "المحادثة غير موجودة",
            });
          }

          // Verify conversation belongs to user
          if (conversation.userId !== ctx.user.id) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "ليس لديك صلاحية لحذف هذه المحادثة",
            });
          }

          await db.deleteConversation(input.conversationId);

          logger.info("Conversation deleted", { conversationId: input.conversationId, userId: ctx.user.id });

          return { success: true, conversationId: input.conversationId };
        } catch (error) {
          if (error instanceof TRPCError) {
            throw error;
          }
          logger.error("Failed to delete conversation", error instanceof Error ? error : new Error(String(error)), {
            conversationId: input.conversationId,
            userId: ctx.user.id,
          });
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "فشل في حذف المحادثة",
          });
        }
      }),

    /**
     * Get messages for a conversation
     * Purpose: Get all messages in a conversation
     * Input: conversationId
     * Database: Query messages table
     * Errors: Conversation not found, unauthorized
     */
    messages: protectedProcedure
      .input(z.object({ conversationId: z.number().int().positive() }))
      .query(async ({ ctx, input }) => {
        try {
          // Verify conversation exists and belongs to user
          const conversation = await db.getConversation(input.conversationId);
          if (!conversation) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "المحادثة غير موجودة",
            });
          }

          if (conversation.userId !== ctx.user.id) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "ليس لديك صلاحية للوصول إلى هذه المحادثة",
            });
          }

          const messages = await db.getConversationMessages(input.conversationId);
          return messages;
        } catch (error) {
          if (error instanceof TRPCError) {
            throw error;
          }
          logger.error("Failed to get messages", error instanceof Error ? error : new Error(String(error)), {
            conversationId: input.conversationId,
            userId: ctx.user.id,
          });
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "فشل في جلب الرسائل",
          });
        }
      }),

    /**
     * Add message to conversation
     * Purpose: Save a message (user or assistant) to a conversation
     * Input: conversationId, role, content
     * Database: Insert into messages table
     * Errors: Conversation not found, unauthorized, validation failures
     */
    addMessage: protectedProcedure
      .input(
        z.object({
          conversationId: z.number().int().positive(),
        }).merge(messageCreateSchema),
      )
      .mutation(async ({ ctx, input }) => {
        try {
          // Verify conversation exists and belongs to user
          const conversation = await db.getConversation(input.conversationId);
          if (!conversation) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "المحادثة غير موجودة",
            });
          }

          if (conversation.userId !== ctx.user.id) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "ليس لديك صلاحية لإضافة رسالة إلى هذه المحادثة",
            });
          }

          const messageId = await db.addMessage({
            conversationId: input.conversationId,
            role: input.role,
            content: input.content,
            sources: null,
          });

          // Update conversation updatedAt
          await db.updateConversation(input.conversationId, { updatedAt: new Date() });

          logger.info("Message added", { messageId, conversationId: input.conversationId, userId: ctx.user.id });

          return { id: messageId, ...input };
        } catch (error) {
          if (error instanceof TRPCError) {
            throw error;
          }
          logger.error("Failed to add message", error instanceof Error ? error : new Error(String(error)), {
            conversationId: input.conversationId,
            userId: ctx.user.id,
          });
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "فشل في إضافة الرسالة",
          });
        }
      }),
  }),

  // Files Router
  files: router({
    /**
     * List user's files
     * Purpose: Get all files for authenticated user, optionally filtered by type
     * Input: type (optional filter)
     * Database: Query files table filtered by userId
     * Errors: None (returns empty array if none)
     */
    list: protectedProcedure
      .input(
        z
          .object({
            type: z.enum(["contract", "report", "stock", "other"]).optional(),
          })
          .optional(),
      )
      .query(async ({ ctx, input }) => {
        try {
          if (input?.type === "contract") {
            const allowed = await canAccessContracts((ctx.user?.tier || "free") as any);
            if (!allowed) {
              throw new TRPCError({
                code: "FORBIDDEN",
                message: "الوصول إلى مكتبة العقود متاح لمشتركي البرو فقط.",
              });
            }
          }

          const files = await db.getUserFiles(ctx.user.id, input?.type);
          return files;
        } catch (error) {
          logger.error("Failed to list files", error instanceof Error ? error : new Error(String(error)), {
          userId: ctx.user.id,
          });
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "فشل في جلب الملفات",
          });
        }
      }),

    /**
     * Get file by ID
     * Purpose: Get single file details with signed URL for download
     * Input: fileId
     * Database: Query files table
     * Errors: File not found, unauthorized (not user's file)
     */
    get: protectedProcedure
      .input(z.object({ fileId: z.number().int().positive() }))
      .query(async ({ ctx, input }) => {
        try {
          const file = await db.getFile(input.fileId);
          if (!file) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "الملف غير موجود",
            });
          }

          // Verify file belongs to user
          if (file.userId !== ctx.user.id) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "ليس لديك صلاحية للوصول إلى هذا الملف",
            });
          }

          if (file.type === "contract") {
            const allowed = await canAccessContracts((ctx.user?.tier || "free") as any);
            if (!allowed) {
              throw new TRPCError({
                code: "FORBIDDEN",
                message: "الوصول إلى مكتبة العقود متاح لمشتركي البرو فقط.",
              });
            }
          }

          // TODO: Generate signed URL for S3 if file.url exists
          // For now, return file as-is
          return file;
        } catch (error) {
          if (error instanceof TRPCError) {
            throw error;
          }
          logger.error("Failed to get file", error instanceof Error ? error : new Error(String(error)), {
            fileId: input.fileId,
            userId: ctx.user.id,
          });
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "فشل في جلب الملف",
          });
        }
      }),

    /**
     * Create file record (after upload to S3)
     * Purpose: Save file metadata to database after successful S3 upload
     * Input: name, type, mimeType, size, url
     * Database: Insert into files table
     * Errors: Validation failures
     */
    create: protectedProcedure
      .input(fileUploadSchema.extend({ url: z.string().url().optional() }))
      .mutation(async ({ ctx, input }) => {
        try {
          const fileId = await db.createFile({
            userId: ctx.user.id,
            name: input.name,
            type: input.type,
            mimeType: input.mimeType || null,
            size: input.size || null,
            url: input.url || null,
            status: "pending",
          });

          logger.info("File created", { fileId, userId: ctx.user.id, fileName: input.name });

          return { id: fileId, userId: ctx.user.id, ...input, status: "pending" };
        } catch (error) {
          logger.error("Failed to create file", error instanceof Error ? error : new Error(String(error)), {
            userId: ctx.user.id,
          });
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "فشل في إنشاء الملف",
          });
        }
      }),

    /**
     * Update file status
     * Purpose: Update file analysis status and results
     * Input: fileId, status, analysisResult (optional)
     * Database: Update files table
     * Errors: File not found, unauthorized, validation failures
     */
    updateStatus: protectedProcedure
      .input(
        z.object({
          id: z.number().int().positive(),
          status: z.enum(["pending", "analyzing", "analyzed", "error"]),
          analysisResult: z.any().optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        try {
          // Verify file exists and belongs to user
          const file = await db.getFile(input.id);
          if (!file) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "الملف غير موجود",
            });
          }

          if (file.userId !== ctx.user.id) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "ليس لديك صلاحية لتحديث هذا الملف",
            });
          }

          await db.updateFileStatus(input.id, input.status, input.analysisResult);

          logger.info("File status updated", { fileId: input.id, status: input.status, userId: ctx.user.id });

          return { success: true, id: input.id, status: input.status };
        } catch (error) {
          if (error instanceof TRPCError) {
            throw error;
          }
          logger.error("Failed to update file status", error instanceof Error ? error : new Error(String(error)), {
            fileId: input.id,
            userId: ctx.user.id,
          });
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "فشل في تحديث حالة الملف",
          });
        }
      }),

    /**
     * Delete file
     * Purpose: Delete file from S3 and database
     * Input: fileId
     * Database: Delete from files table, delete from S3
     * Errors: File not found, unauthorized, delete failure
     */
    delete: protectedProcedure
      .input(z.object({ fileId: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        try {
          // Verify file exists and belongs to user
          const file = await db.getFile(input.fileId);
          if (!file) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "الملف غير موجود",
            });
          }

          if (file.userId !== ctx.user.id) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "ليس لديك صلاحية لحذف هذا الملف",
            });
          }

          // Delete from storage (S3/Forge) if file URL exists
          const { deleteFileFromStorage } = await import("./_core/storageDelete.js");
          if (file.url) {
            await deleteFileFromStorage(file.url);
          }

          // Delete from database
          await db.deleteFile(input.fileId);

          logger.info("File deleted", { fileId: input.fileId, userId: ctx.user.id });

          return { success: true, fileId: input.fileId };
        } catch (error) {
          if (error instanceof TRPCError) {
            throw error;
          }
          const errorObj = error instanceof Error ? error : new Error(String(error));
          logger.error("Failed to delete file", errorObj, {
            fileId: input.fileId,
            userId: ctx.user.id,
          });
          captureException(errorObj, { fileId: input.fileId, userId: ctx.user.id, operation: "file.delete" });
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "فشل في حذف الملف",
          });
        }
      }),
  }),

  // News Router
  news: router({
    list: publicProcedure
      .input(
        z
          .object({
            category: z.string().optional(),
            limit: z.number().optional(),
          })
          .optional()
      )
      .query(({ input }) => {
        return db.getNews(input?.category, input?.limit);
      }),
  }),

  // Admin Router - All endpoints require admin role
  admin: router({
    /**
     * Get dashboard statistics
     * Purpose: Get platform statistics for admin dashboard
     * Input: None
     * Database: Query all tables for counts
     * Errors: Unauthorized (not admin)
     */
    stats: adminProcedure.query(async () => {
      try {
        const usersCount = await getUsersCount();
        const conversationsCount = await getConversationsCount();
        const contractsCount = await getContractsCount();
        const stocksScreened = await getStocksScreenedCount();
        const consultations = await getConsultationsSummary();

        return {
          usersCount,
          conversationsCount,
          contractsCount,
          stocksScreened,
          consultations,
        };
      } catch (error) {
        logger.error("Failed to get admin stats", error instanceof Error ? error : new Error(String(error)), {});
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "فشل في جلب الإحصائيات",
        });
      }
    }),

    /**
     * Get all users (paginated)
     * Purpose: List all users for admin management
     * Input: page (optional), limit (optional), search (optional)
     * Database: Query users table with pagination
     * Errors: Unauthorized (not admin)
     */
    users: adminProcedure
      .input(
        paginationSchema.extend({
          search: z.string().optional(),
        }).optional(),
      )
      .query(async ({ input }) => {
        try {
          const users = await db.getAllUsers();
          // TODO: Implement search and pagination in db.getAllUsers
          // For now, return all users
          // Remove passwords from response
          return users.map(({ password: _, ...user }) => user);
        } catch (error) {
          logger.error("Failed to get users", error instanceof Error ? error : new Error(String(error)), {});
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "فشل في جلب المستخدمين",
          });
        }
      }),

    /**
     * Get user by ID
     * Purpose: Get single user details for admin
     * Input: userId
     * Database: Query users table
     * Errors: User not found, Unauthorized
     */
    getUser: adminProcedure
      .input(z.object({ userId: z.number().int().positive() }))
      .query(async ({ input }) => {
        try {
          const user = await db.getUserById(input.userId);
          if (!user) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "المستخدم غير موجود",
            });
          }
          // Remove password from response
          const { password: _, ...userWithoutPassword } = user;
          return userWithoutPassword;
        } catch (error) {
          if (error instanceof TRPCError) {
            throw error;
          }
          logger.error("Failed to get user", error instanceof Error ? error : new Error(String(error)), {
            userId: input.userId,
          });
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "فشل في جلب المستخدم",
          });
        }
      }),

    /**
     * Update user (admin)
     * Purpose: Update user details, role, tier, status
     * Input: userId, name, email, phone, role, tier, status
     * Database: Update users table
     * Errors: User not found, validation failures, Unauthorized
     */
    updateUser: adminProcedure
      .input(
        z.object({
          userId: z.number().int().positive(),
          name: nameSchema.optional(),
          email: emailSchema.optional(),
          phone: phoneSchema.optional(),
          role: z.enum(["user", "admin", "consultant"]).optional(),
          tier: z.enum(["free", "pro", "enterprise"]).optional(),
          status: z.enum(["active", "inactive", "suspended"]).optional(),
        }),
      )
      .mutation(async ({ input }) => {
        try {
          const user = await db.getUserById(input.userId);
          if (!user) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "المستخدم غير موجود",
            });
          }

          // TODO: Implement updateUser function in db.ts
          // For now, use upsertUser
          await db.upsertUser({
            openId: user.openId || `local_${user.id}`,
            name: input.name,
            email: input.email,
            phone: input.phone,
            role: input.role as any,
            tier: input.tier as any,
            status: input.status as any,
            updatedAt: new Date(),
          });

          logger.info("User updated by admin", { userId: input.userId, updates: input });

          const updatedUser = await db.getUserById(input.userId);
          if (!updatedUser) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "المستخدم غير موجود",
            });
          }

          const { password: _, ...userWithoutPassword } = updatedUser;
          return userWithoutPassword;
        } catch (error) {
          if (error instanceof TRPCError) {
            throw error;
          }
          logger.error("Failed to update user", error instanceof Error ? error : new Error(String(error)), {
            userId: input.userId,
          });
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "فشل في تحديث المستخدم",
          });
        }
      }),

    /**
     * Delete user (soft delete - set status to inactive)
     * Purpose: Soft delete user by setting status to inactive
     * Input: userId
     * Database: Update users table status
     * Errors: User not found, Unauthorized
     */
    deleteUser: adminProcedure
      .input(z.object({ userId: z.number().int().positive() }))
      .mutation(async ({ input }) => {
        try {
          const user = await db.getUserById(input.userId);
          if (!user) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "المستخدم غير موجود",
            });
          }

          // Soft delete: set status to inactive
          await db.upsertUser({
            openId: user.openId || `local_${user.id}`,
            email: user.email,
            status: "inactive" as any,
            updatedAt: new Date(),
          });

          logger.info("User deleted (soft) by admin", { userId: input.userId });

          return { success: true, userId: input.userId };
        } catch (error) {
          if (error instanceof TRPCError) {
            throw error;
          }
          logger.error("Failed to delete user", error instanceof Error ? error : new Error(String(error)), {
            userId: input.userId,
          });
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "فشل في حذف المستخدم",
          });
        }
      }),
  }),

  // Health check endpoint (public)
  health: router({
    /**
     * Health check endpoint
     * Purpose: Check if server and database are operational
     * Input: None
     * Database: Test connection
     * Errors: None (returns status)
     */
    check: publicProcedure.query(async () => {
      try {
        const dbInstance = await db.getDb();
        const dbConnected = dbInstance !== null;

        return {
          status: "ok",
          timestamp: new Date().toISOString(),
          database: dbConnected ? "connected" : "disconnected",
        };
      } catch (error) {
        logger.error("Health check failed", error instanceof Error ? error : new Error(String(error)), {});
        return {
          status: "error",
          timestamp: new Date().toISOString(),
          database: "error",
        };
      }
      }),
  }),

  // Stocks Router
  stocks: router({
    search: publicProcedure
      .input(z.object({ query: z.string() }))
      .query(({ input }) => {
        return db.searchStocks(input.query);
      }),

    get: publicProcedure
      .input(z.object({ symbol: z.string() }))
      .query(({ input }) => {
        return db.getStockBySymbol(input.symbol);
      }),

    watchlist: protectedProcedure.query(({ ctx }) => {
      return db.getUserWatchlist(ctx.user.id);
    }),

    addToWatchlist: protectedProcedure
      .input(z.object({ stockId: z.number() }))
      .mutation(({ ctx, input }) => {
        return db.addToWatchlist(ctx.user.id, input.stockId);
      }),

    removeFromWatchlist: protectedProcedure
      .input(z.object({ stockId: z.number() }))
      .mutation(({ ctx, input }) => {
        return db.removeFromWatchlist(ctx.user.id, input.stockId);
      }),
  }),

  // Consultants Router
  consultants: router({
    list: publicProcedure.query(() => {
      return db.getConsultants();
    }),

    create: publicProcedure
      .input(z.object({
        name: z.string(),
        email: z.string().email(),
        specialty: z.string(),
        bio: z.string().optional(),
        maxChatsPerDay: z.number().optional(),
      }))
      .mutation(({ input }) => {
        return db.createConsultant(input);
      }),

    update: publicProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(['active', 'inactive']).optional(),
        maxChatsPerDay: z.number().optional(),
      }))
      .mutation(({ input }) => {
        return db.updateConsultant(input.id, input);
      }),
  }),

  // Notifications Router
  notifications: router({
    triggers: publicProcedure.query(() => {
      return db.getNotificationTriggers();
    }),

    updateTrigger: publicProcedure
      .input(z.object({
        type: z.string(),
        enabled: z.boolean(),
        template: z.object({
          subject: z.string(),
          body: z.string(),
        }).optional(),
      }))
      .mutation(({ input }) => {
        return db.updateNotificationTrigger(input);
      }),

    broadcast: adminProcedure
      .input(z.object({
        title: z.string(),
        body: z.string(),
        target: z.enum(['all', 'free', 'pro', 'enterprise']),
      }))
      .mutation(async ({ input }) => {
        // Get all users matching target tier
        let users;
        if (input.target === 'all') {
          users = await db.getAllUsers();
        } else {
          users = (await db.getAllUsers()).filter((u: any) => u.tier === input.target);
        }

        // Send notification to each user
        let sentCount = 0;
        for (const user of users) {
          await dispatchNotification({
            userId: user.id,
            title: input.title,
            body: input.body,
            type: "broadcast",
          });
          sentCount++;
        }

        logger.info("Admin broadcast notification sent", { target: input.target, sentCount });
        return { success: true, sentCount };
      }),

    // Admin: List all notifications (for admin dashboard)
    adminList: adminProcedure
      .input(z.object({ limit: z.number().optional().default(50) }).optional())
      .query(async ({ input }) => {
        const dbClient = await db.getDb();
        if (!dbClient) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

        const result = await dbClient
          .select()
          .from(notifications)
          .orderBy(desc(notifications.createdAt))
          .limit(input?.limit || 50);
        
        return result;
      }),

    // Admin: Mark all notifications as read (for admin dashboard)
    adminMarkAllRead: adminProcedure.mutation(async () => {
      const dbClient = await db.getDb();
      if (!dbClient) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      // Mark all unread notifications as read
      await dbClient
        .update(notifications)
        .set({ status: "read", readAt: new Date() })
        .where(eq(notifications.status, "unread"));
      
      return { success: true };
    }),

    sendToVendor: publicProcedure
      .input(z.object({
        vendorId: z.number(),
        title: z.string(),
        message: z.string(),
        type: z.string().default('info'),
      }))
      .mutation(async ({ input }) => {
        await dispatchNotification({
          vendorId: input.vendorId,
          title: input.title,
          body: input.message,
          type: (input.type as any) || "vendor",
        });
        return { success: true };
      }),
    
    sendToAllVendors: publicProcedure
      .input(z.object({
        title: z.string(),
        message: z.string(),
        type: z.string().default('info'),
      }))
      .mutation(async ({ input }) => {
        const vendors = await db.getAllVendors();
        for (const v of vendors) {
          await dispatchNotification({
            vendorId: (v as any).id,
            title: input.title,
            body: input.message,
            type: (input.type as any) || "vendor",
          });
        }
        return { success: true, sent: vendors.length };
      }),

    // User-facing notifications: list and mark read
    list: protectedProcedure
      .input(z.object({ limit: z.number().optional().default(50) }).optional())
      .query(async ({ ctx, input }) => {
        if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED", message: "يجب تسجيل الدخول." });
        return listNotifications({ userId: ctx.user.id, limit: input?.limit });
      }),

    markAllRead: protectedProcedure.mutation(async ({ ctx }) => {
      if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED", message: "يجب تسجيل الدخول." });
      return markAllRead({ userId: ctx.user.id });
    }),
  }),

  // AI Settings Router
  aiSettings: router({
    get: publicProcedure.query(() => {
      return db.getAISettings();
    }),

    updateConversation: publicProcedure
      .input(z.object({
        systemPrompt: z.string(),
        maxTokens: z.number(),
        temperature: z.number(),
        enableMemory: z.boolean(),
      }))
      .mutation(({ input }) => {
        return db.updateAISettings('conversation', input);
      }),

    updateSources: publicProcedure
      .input(z.object({
        processingPrompt: z.string(),
        enableRAG: z.boolean(),
        sourcesPerAnswer: z.number(),
        similarityThreshold: z.number(),
      }))
      .mutation(({ input }) => {
        return db.updateAISettings('sources', input);
      }),

    updatePersonality: publicProcedure
      .input(z.object({
        name: z.string(),
        tone: z.string(),
        personality: z.string(),
        welcomeMessage: z.string(),
        useEmoji: z.boolean(),
        alwaysCiteSources: z.boolean(),
      }))
      .mutation(({ input }) => {
        return db.updateAISettings('personality', input);
      }),
  }),

  library: router({
    // Guests should be able to browse PUBLIC library files.
    // Authenticated users see public + personal (advisor/admin) files.
    list: publicProcedure.query(async ({ ctx }) => {
      const files = await listLibraryFilesForUser(ctx.user ?? null);
      // Return files without exposing raw storage paths
      // fileUrl is the storage path, not a signed URL
      return files.map((f: any) => ({
        id: f.id,
        title: f.title,
        description: f.description,
        fileSize: f.fileSize,
        mimeType: f.mimeType,
        createdAt: f.createdAt,
        createdByRole: f.createdByRole,
        createdById: f.createdById,
        targetUserId: f.targetUserId,
        consultationId: f.consultationId,
        isPublic: f.isPublic,
        // Do not expose fileUrl (storage path) - use download endpoint instead
      }));
    }),

    /**
     * Get signed download URL for a library file
     * Generates URL on demand (not cached) and enforces access control
     * Uses mutation to ensure it's called on-demand, not cached
     */
    // Allow downloading public files without login; keep private files protected.
    getDownloadUrl: publicProcedure
      .input(z.object({ fileId: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        const file = await db.getLibraryFileById(input.fileId);
        if (!file) {
          throw new TRPCError({ code: "NOT_FOUND", message: "الملف غير موجود." });
        }

        // Enforce access control:
        // - Public files: anyone can download
        // - Private files: must be logged in and authorized (target user or admin/advisor rules)
        if (!file.isPublic) {
          if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED", message: "يجب تسجيل الدخول." });
          assertLibraryFileAccess(ctx.user, file);
        }

        // Generate signed download URL (expires in 5 minutes)
        if (!supabase) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "التخزين غير مهيأ." });
        }

        const { data, error } = await supabase.storage
          .from("consultations")
          .createSignedUrl(file.fileUrl, 300); // 5 minutes expiry

        if (error || !data?.signedUrl) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "تعذر إنشاء رابط التحميل." });
        }

        return {
          downloadUrl: data.signedUrl,
          expiresIn: 300, // seconds
        };
      }),

    upload: protectedProcedure
      .input(
        z.object({
          title: z.string().min(1).max(500),
          description: z.string().max(2000).optional(),
          fileName: z.string().min(1),
          mimeType: z.string().optional(),
          size: z.number().int().positive().optional(),
          targetUserId: z.number().int().positive().optional(),
          consultationId: z.number().int().positive().optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED", message: "يجب تسجيل الدخول." });
        const uploaded = await uploadLibraryFile({
          user: ctx.user,
          title: input.title,
          description: input.description,
          fileName: input.fileName,
          mimeType: input.mimeType,
          size: input.size ?? null,
          targetUserId: input.targetUserId ?? null,
          consultationId: input.consultationId ?? null,
        });
        await notifyLibraryFileCreated(uploaded.file);
        return uploaded;
      }),

    adminBroadcast: adminProcedure
      .input(
        z.object({
          title: z.string().min(1).max(500),
          description: z.string().max(2000).optional(),
          fileName: z.string().min(1),
          mimeType: z.string().optional(),
          size: z.number().int().positive().optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const uploaded = await adminBroadcastLibraryFile({
          admin: ctx.user,
          title: input.title,
          description: input.description,
          fileName: input.fileName,
          mimeType: input.mimeType,
          size: input.size ?? null,
        });
        await notifyLibraryFileCreated(uploaded.file);
        return uploaded;
      }),

    advisorSend: protectedProcedure
      .input(
        z.object({
          title: z.string().min(1).max(500),
          description: z.string().max(2000).optional(),
          fileName: z.string().min(1),
          mimeType: z.string().optional(),
          size: z.number().int().positive().optional(),
          targetUserId: z.number().int().positive(),
          consultationId: z.number().int().positive(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user || !["advisor", "consultant"].includes(ctx.user.role)) {
          throw new TRPCError({ code: "FORBIDDEN", message: "مخصص للمستشارين فقط." });
        }
        const uploaded = await advisorSendLibraryFile({
          advisor: ctx.user,
          targetUserId: input.targetUserId,
          consultationId: input.consultationId,
          title: input.title,
          description: input.description,
          fileName: input.fileName,
          mimeType: input.mimeType,
          size: input.size ?? null,
        });
        await notifyLibraryFileCreated(uploaded.file);
        return uploaded;
      }),
  }),

  // Vendors (Partners) Management
  vendors: router({
    list: publicProcedure.query(() => db.getAllVendors()),
    
    get: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(({ input }) => db.getVendorById(input.id)),
    
    getByEmail: publicProcedure
      .input(z.object({ email: z.string().email() }))
      .query(({ input }) => db.getVendorByEmail(input.email)),
    
    create: publicProcedure
      .input(z.object({
        name: z.string().min(2),
        email: z.string().email(),
        phone: z.string().optional(),
        companyName: z.string().optional(),
        specialty: z.array(z.string()).optional(),
        bio: z.string().optional(),
        commissionRate: z.number().min(0).max(100).optional(),
      }))
      .mutation(({ input }) => db.createVendor(input)),
    
    update: publicProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        companyName: z.string().optional(),
        specialty: z.array(z.string()).optional(),
        bio: z.string().optional(),
        status: z.enum(['pending', 'approved', 'banned']).optional(),
        commissionRate: z.number().min(0).max(100).optional(),
        isAvailable: z.boolean().optional(),
      }))
      .mutation(({ input }) => {
        const { id, ...data } = input;
        return db.updateVendor(id, data);
      }),
    
    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => db.deleteVendor(input.id)),
    
    getStats: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(({ input }) => db.getVendorStats(input.id)),
    
    authenticate: publicProcedure
      .input(z.object({
        email: z.string().email(),
        password: z.string(),
      }))
      .mutation(async ({ input }) => {
        const vendor = await db.getVendorByEmail(input.email);
        if (!vendor) {
          throw new Error('البريد الإلكتروني غير مسجل');
        }
        if (vendor.status !== 'approved') {
          throw new Error('الحساب غير مفعل بعد');
        }
        if (!vendor.passwordHash) {
          throw new Error('لم يتم تعيين كلمة مرور لهذا الحساب');
        }
        const bcrypt = await import("bcrypt");
        const ok = await bcrypt.compare(input.password, vendor.passwordHash);
        if (!ok) {
          throw new Error('كلمة المرور غير صحيحة');
        }
        return { success: true, vendorId: vendor.id, email: vendor.email };
      }),
  }),

  // Orders Management
  orders: router({
    list: publicProcedure.query(() => db.getAllOrders()),
    
    getByVendor: publicProcedure
      .input(z.object({ vendorId: z.number() }))
      .query(({ input }) => db.getVendorOrders(input.vendorId)),
    
    create: publicProcedure
      .input(z.object({
        userId: z.number(),
        vendorId: z.number().optional(),
        serviceType: z.string(),
        priceKWD: z.number(),
        documentUrl: z.string().optional(),
        notes: z.string().optional(),
      }))
      .mutation(({ input }) => db.createOrder(input)),
    
    updateStatus: publicProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(['pending', 'assigned', 'in_progress', 'completed', 'cancelled']),
        vendorId: z.number().optional(),
      }))
      .mutation(({ input }) => db.updateOrderStatus(input.id, input.status, input.vendorId)),
  }),

  // Subscriptions Management
  subscriptions: router({
    get: publicProcedure
      .input(z.object({ userId: z.number() }))
      .query(({ input }) => db.getUserSubscription(input.userId)),
    
    create: publicProcedure
      .input(z.object({
        userId: z.number(),
        planName: z.string(),
        priceKWD: z.number(),
        paymentMethod: z.string().optional(),
        paymentReference: z.string().optional(),
      }))
      .mutation(({ input }) => db.createSubscription(input)),
    
    cancel: publicProcedure
      .input(z.object({ userId: z.number() }))
      .mutation(({ input }) => db.cancelSubscription(input.userId)),

    /**
     * Batch enforce subscription expiration
     * Purpose: Check and expire subscriptions for multiple users (for scheduled jobs)
     * 
     * This endpoint can be called by a cron job to batch-process subscription expirations.
     * Individual user enforcement happens automatically on every authenticated request.
     * 
     * Input: Optional array of user IDs (if not provided, checks all users with active subscriptions)
     * Returns: Number of users downgraded
     */
    enforceExpiration: adminProcedure
      .input(z.object({ userIds: z.array(z.number()).optional() }).optional())
      .mutation(async ({ input }) => {
        const { batchEnforceSubscriptionExpiration } = await import("./_core/subscriptionEnforcement.js");
        const count = await batchEnforceSubscriptionExpiration(input?.userIds);
        return { usersDowngraded: count };
      }),
  }),



  // Platform Statistics
  platform: router({
    stats: publicProcedure.query(() => db.getPlatformStats()),
  }),
});

export type AppRouter = typeof appRouter;
