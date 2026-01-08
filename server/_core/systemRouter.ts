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
