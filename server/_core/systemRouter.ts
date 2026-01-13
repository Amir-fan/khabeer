import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { notifyOwner } from "./notification";
import { adminProcedure, publicProcedure, router } from "./trpc";
import * as db from "../db";

export const systemRouter = router({
  health: publicProcedure
    .input(
      z.object({
        timestamp: z.number().min(0, "timestamp cannot be negative"),
      }),
    )
    .query(() => ({
      ok: true,
    })),

  notifyOwner: adminProcedure
    .input(
      z.object({
        title: z.string().min(1, "title is required"),
        content: z.string().min(1, "content is required"),
      }),
    )
    .mutation(async ({ input }) => {
      const delivered = await notifyOwner(input);
      return {
        success: delivered,
      } as const;
    }),

  // Payment gateway settings
  getPaymentSettings: adminProcedure.query(async () => {
    return {
      myfatoorah: {
        enabled: (await db.getSetting("payment.myfatoorah.enabled")) === "true",
        token: await db.getSetting("payment.myfatoorah.token"),
        environment: await db.getSetting("payment.myfatoorah.environment") || "sandbox",
      },
      stripe: {
        enabled: (await db.getSetting("payment.stripe.enabled")) === "true",
        publicKey: await db.getSetting("payment.stripe.publicKey"),
        secretKey: await db.getSetting("payment.stripe.secretKey"),
      },
      tap: {
        enabled: (await db.getSetting("payment.tap.enabled")) === "true",
        secretKey: await db.getSetting("payment.tap.secretKey"),
      },
      inApp: {
        enabled: (await db.getSetting("payment.inapp.enabled")) !== "false", // default true
      },
    };
  }),

  updatePaymentSettings: adminProcedure
    .input(
      z.object({
        gateway: z.enum(["myfatoorah", "stripe", "tap", "inapp"]),
        settings: z.record(z.string(), z.any()),
      }),
    )
    .mutation(async ({ input }) => {
      const prefix = `payment.${input.gateway}.`;
      for (const [key, value] of Object.entries(input.settings)) {
        await db.setSetting(`${prefix}${key}`, String(value));
      }
      return { success: true };
    }),

  // System settings (platform fee, pricing, etc.)
  getSystemSettings: adminProcedure.query(async () => {
    return {
      platformFeeBps: parseInt((await db.getSystemSetting("platform.fee.bps")) || "3000", 10), // 30% default
      proPrice: parseInt((await db.getSystemSetting("pricing.pro.price")) || "8000", 10), // 8 KWD default
      platformCommission: parseInt((await db.getSystemSetting("pricing.platform.commission")) || "30", 10), // 30% default
      minExpertPrice: parseInt((await db.getSystemSetting("pricing.expert.min")) || "5000", 10), // 5 KWD default
      maxExpertPrice: parseInt((await db.getSystemSetting("pricing.expert.max")) || "10000", 10), // 10 KWD default
      freeDailyLimit: parseInt((await db.getSystemSetting("limits.free.daily")) || "5", 10),
      guestDailyLimit: parseInt((await db.getSystemSetting("limits.guest.daily")) || "3", 10),
      financialThreshold: parseInt((await db.getSystemSetting("complexity.financial.threshold")) || "100000", 10),
      aiConfidenceThreshold: parseInt((await db.getSystemSetting("complexity.ai.confidence.threshold")) || "70", 10),
      sensitiveKeywords: (await db.getSystemSetting("complexity.sensitive.keywords")) || "",
      blurEnabled: (await db.getSystemSetting("blur.enabled")) !== "false",
      showIssueCount: (await db.getSystemSetting("blur.show.issue.count")) !== "false",
    };
  }),

  updateSystemSettings: adminProcedure
    .input(
      z.object({
        platformFeeBps: z.number().int().min(0).max(10000).optional(),
        proPrice: z.number().int().min(0).optional(),
        platformCommission: z.number().int().min(0).max(100).optional(),
        minExpertPrice: z.number().int().min(0).optional(),
        maxExpertPrice: z.number().int().min(0).optional(),
        freeDailyLimit: z.number().int().min(1).max(1000).optional(),
        guestDailyLimit: z.number().int().min(1).max(1000).optional(),
        financialThreshold: z.number().int().min(0).optional(),
        aiConfidenceThreshold: z.number().int().min(0).max(100).optional(),
        sensitiveKeywords: z.string().optional(),
        blurEnabled: z.boolean().optional(),
        showIssueCount: z.boolean().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const updatedBy = ctx.user?.id;
      
      if (input.platformFeeBps !== undefined) {
        await db.setSystemSetting("platform.fee.bps", String(input.platformFeeBps), updatedBy);
      }
      if (input.proPrice !== undefined) {
        await db.setSystemSetting("pricing.pro.price", String(input.proPrice), updatedBy);
      }
      if (input.platformCommission !== undefined) {
        await db.setSystemSetting("pricing.platform.commission", String(input.platformCommission), updatedBy);
      }
      if (input.minExpertPrice !== undefined) {
        await db.setSystemSetting("pricing.expert.min", String(input.minExpertPrice), updatedBy);
      }
      if (input.maxExpertPrice !== undefined) {
        await db.setSystemSetting("pricing.expert.max", String(input.maxExpertPrice), updatedBy);
      }
      if (input.freeDailyLimit !== undefined) {
        await db.setSystemSetting("limits.free.daily", String(input.freeDailyLimit), updatedBy);
      }
      if (input.guestDailyLimit !== undefined) {
        await db.setSystemSetting("limits.guest.daily", String(input.guestDailyLimit), updatedBy);
      }
      if (input.financialThreshold !== undefined) {
        await db.setSystemSetting("complexity.financial.threshold", String(input.financialThreshold), updatedBy);
      }
      if (input.aiConfidenceThreshold !== undefined) {
        await db.setSystemSetting("complexity.ai.confidence.threshold", String(input.aiConfidenceThreshold), updatedBy);
      }
      if (input.sensitiveKeywords !== undefined) {
        await db.setSystemSetting("complexity.sensitive.keywords", input.sensitiveKeywords, updatedBy);
      }
      if (input.blurEnabled !== undefined) {
        await db.setSystemSetting("blur.enabled", String(input.blurEnabled), updatedBy);
      }
      if (input.showIssueCount !== undefined) {
        await db.setSystemSetting("blur.show.issue.count", String(input.showIssueCount), updatedBy);
      }
      
      return { success: true };
    }),

  // AI settings (admin)
  getAiAdminSettings: adminProcedure.query(async () => {
    const rawSystemPrompt = await db.getSystemSetting("ai:systemPrompt");
    const rawMaxTokens = await db.getSystemSetting("ai:maxTokens");
    const rawMemoryEnabled = await db.getSystemSetting("ai:memoryEnabled");
    const rawTemperature = await db.getSystemSetting("ai:temperature");
    const rawSourceProcessingPrompt = await db.getSystemSetting("ai:sourceProcessingPrompt");
    const rawEnableRag = await db.getSystemSetting("ai:ragEnabled");
    const rawSourcesPerAnswer = await db.getSystemSetting("ai:sourcesPerAnswer");
    const rawSimilarityThreshold = await db.getSystemSetting("ai:similarityThreshold");
    const rawAiName = await db.getSystemSetting("ai:persona.name");
    const rawAiTone = await db.getSystemSetting("ai:persona.tone");
    const rawAiPersonality = await db.getSystemSetting("ai:persona.description");
    const rawWelcomeMessage = await db.getSystemSetting("ai:persona.welcomeMessage");
    const rawUseEmoji = await db.getSystemSetting("ai:persona.useEmoji");
    const rawAlwaysCiteSources = await db.getSystemSetting("ai:persona.alwaysCiteSources");

    return {
      systemPrompt: rawSystemPrompt,
      maxTokens: rawMaxTokens ? parseInt(rawMaxTokens, 10) : null,
      memoryEnabled: rawMemoryEnabled ? rawMemoryEnabled !== "false" : null,
      temperature: rawTemperature ? parseInt(rawTemperature, 10) : null,
      sourceProcessingPrompt: rawSourceProcessingPrompt,
      ragEnabled: rawEnableRag ? rawEnableRag !== "false" : null,
      sourcesPerAnswer: rawSourcesPerAnswer ? parseInt(rawSourcesPerAnswer, 10) : null,
      similarityThreshold: rawSimilarityThreshold ? parseInt(rawSimilarityThreshold, 10) : null,
      aiName: rawAiName,
      aiTone: rawAiTone,
      aiPersonality: rawAiPersonality,
      welcomeMessage: rawWelcomeMessage,
      useEmoji: rawUseEmoji ? rawUseEmoji === "true" : null,
      alwaysCiteSources: rawAlwaysCiteSources ? rawAlwaysCiteSources !== "false" : null,
    };
  }),

  updateAiAdminSettings: adminProcedure
    .input(
      z.object({
        systemPrompt: z.string().min(1).max(20000).optional(),
        maxTokens: z.number().int().min(50).max(20000).optional(),
        memoryEnabled: z.boolean().optional(),
        temperature: z.number().int().min(0).max(100).optional(),
        sourceProcessingPrompt: z.string().min(1).max(20000).optional(),
        ragEnabled: z.boolean().optional(),
        sourcesPerAnswer: z.number().int().min(1).max(50).optional(),
        similarityThreshold: z.number().int().min(0).max(100).optional(),
        aiName: z.string().min(1).max(50).optional(),
        aiTone: z.enum(["formal", "friendly", "simple"]).optional(),
        aiPersonality: z.string().min(1).max(5000).optional(),
        welcomeMessage: z.string().min(1).max(2000).optional(),
        useEmoji: z.boolean().optional(),
        alwaysCiteSources: z.boolean().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const updatedBy = ctx.user?.id;
      if (input.systemPrompt !== undefined) await db.setSystemSetting("ai:systemPrompt", input.systemPrompt, updatedBy);
      if (input.maxTokens !== undefined) await db.setSystemSetting("ai:maxTokens", String(input.maxTokens), updatedBy);
      if (input.memoryEnabled !== undefined) await db.setSystemSetting("ai:memoryEnabled", String(input.memoryEnabled), updatedBy);
      if (input.temperature !== undefined) await db.setSystemSetting("ai:temperature", String(input.temperature), updatedBy);
      if (input.sourceProcessingPrompt !== undefined) await db.setSystemSetting("ai:sourceProcessingPrompt", input.sourceProcessingPrompt, updatedBy);
      if (input.ragEnabled !== undefined) await db.setSystemSetting("ai:ragEnabled", String(input.ragEnabled), updatedBy);
      if (input.sourcesPerAnswer !== undefined) await db.setSystemSetting("ai:sourcesPerAnswer", String(input.sourcesPerAnswer), updatedBy);
      if (input.similarityThreshold !== undefined) await db.setSystemSetting("ai:similarityThreshold", String(input.similarityThreshold), updatedBy);
      if (input.aiName !== undefined) await db.setSystemSetting("ai:persona.name", input.aiName, updatedBy);
      if (input.aiTone !== undefined) await db.setSystemSetting("ai:persona.tone", input.aiTone, updatedBy);
      if (input.aiPersonality !== undefined) await db.setSystemSetting("ai:persona.description", input.aiPersonality, updatedBy);
      if (input.welcomeMessage !== undefined) await db.setSystemSetting("ai:persona.welcomeMessage", input.welcomeMessage, updatedBy);
      if (input.useEmoji !== undefined) await db.setSystemSetting("ai:persona.useEmoji", String(input.useEmoji), updatedBy);
      if (input.alwaysCiteSources !== undefined) await db.setSystemSetting("ai:persona.alwaysCiteSources", String(input.alwaysCiteSources), updatedBy);
      return { success: true };
    }),

  // Notification automation settings (admin)
  getNotificationAdminSettings: adminProcedure.query(async () => {
    const rawRegistrationEnabled = await db.getSystemSetting("notifications.registration.enabled");
    const rawPurchaseEnabled = await db.getSystemSetting("notifications.purchase.enabled");
    const rawCartEnabled = await db.getSystemSetting("notifications.cart.enabled");
    const rawCartDelay = await db.getSystemSetting("notifications.cart.delay");
    const rawUnreadEnabled = await db.getSystemSetting("notifications.unread_messages.enabled");
    const rawNewFilesEnabled = await db.getSystemSetting("notifications.new_files.enabled");

    const rawTemplates = await db.getSystemSetting("notifications.templates");
    let templates: any = null;
    try {
      templates = rawTemplates ? JSON.parse(rawTemplates) : null;
    } catch {
      templates = null;
    }

    return {
      registrationEnabled: rawRegistrationEnabled ? rawRegistrationEnabled !== "false" : true,
      purchaseEnabled: rawPurchaseEnabled ? rawPurchaseEnabled !== "false" : true,
      cartEnabled: rawCartEnabled ? rawCartEnabled !== "false" : true,
      cartDelay: rawCartDelay || "بعد ساعة",
      unreadMessagesEnabled: rawUnreadEnabled ? rawUnreadEnabled !== "false" : true,
      newFilesEnabled: rawNewFilesEnabled ? rawNewFilesEnabled !== "false" : true,
      templates: templates || {
        registration: { subject: "مرحباً بك في خبير!", body: "مرحباً {{name}}،\n\nشكراً لتسجيلك في منصة خبير..." },
        purchase: { subject: "تأكيد الاشتراك", body: "مرحباً {{name}}،\n\nتم تفعيل باقة {{package}} بنجاح..." },
        cart: { subject: "أكمل اشتراكك", body: "مرحباً {{name}}،\n\nلاحظنا أنك لم تكمل عملية الاشتراك..." },
      },
    };
  }),

  updateNotificationAdminSettings: adminProcedure
    .input(
      z.object({
        registrationEnabled: z.boolean().optional(),
        purchaseEnabled: z.boolean().optional(),
        cartEnabled: z.boolean().optional(),
        cartDelay: z.string().min(1).max(50).optional(),
        unreadMessagesEnabled: z.boolean().optional(),
        newFilesEnabled: z.boolean().optional(),
        templates: z
          .object({
            registration: z.object({ subject: z.string(), body: z.string() }).optional(),
            purchase: z.object({ subject: z.string(), body: z.string() }).optional(),
            cart: z.object({ subject: z.string(), body: z.string() }).optional(),
          })
          .optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const updatedBy = ctx.user?.id;
      if (input.registrationEnabled !== undefined) {
        await db.setSystemSetting("notifications.registration.enabled", String(input.registrationEnabled), updatedBy);
      }
      if (input.purchaseEnabled !== undefined) {
        await db.setSystemSetting("notifications.purchase.enabled", String(input.purchaseEnabled), updatedBy);
      }
      if (input.cartEnabled !== undefined) {
        await db.setSystemSetting("notifications.cart.enabled", String(input.cartEnabled), updatedBy);
      }
      if (input.cartDelay !== undefined) {
        await db.setSystemSetting("notifications.cart.delay", input.cartDelay, updatedBy);
      }
      if (input.unreadMessagesEnabled !== undefined) {
        await db.setSystemSetting("notifications.unread_messages.enabled", String(input.unreadMessagesEnabled), updatedBy);
      }
      if (input.newFilesEnabled !== undefined) {
        await db.setSystemSetting("notifications.new_files.enabled", String(input.newFilesEnabled), updatedBy);
      }
      if (input.templates !== undefined) {
        await db.setSystemSetting("notifications.templates", JSON.stringify(input.templates), updatedBy);
      }
      return { success: true };
    }),

  // Withdrawal management (admin)
  listWithdrawals: adminProcedure
    .input(z.object({ status: z.string().optional() }).optional())
    .query(async ({ input }) => {
      const { listAllWithdrawals } = await import("./withdrawals.js");
      return listAllWithdrawals(input?.status);
    }),

  approveWithdrawal: adminProcedure
    .input(z.object({ withdrawalId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new Error("Unauthorized");
      const { approveWithdrawal } = await import("./withdrawals.js");
      return approveWithdrawal({
        withdrawalId: input.withdrawalId,
        adminUserId: ctx.user.id,
      });
    }),

  rejectWithdrawal: adminProcedure
    .input(
      z.object({
        withdrawalId: z.number().int().positive(),
        reason: z.string().optional().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new Error("Unauthorized");
      const { rejectWithdrawal } = await import("./withdrawals.js");
      return rejectWithdrawal({
        withdrawalId: input.withdrawalId,
        adminUserId: ctx.user.id,
        reason: input.reason || null,
      });
    }),
});
