import { TRPCError } from "@trpc/server";
import { hashPassword } from "./auth";
import { supabase } from "./supabase";
import * as db from "../db";
import { partnerApplicationStatusEnum } from "../../drizzle/schema";
import { dispatchNotification } from "./notificationsCenter";
import { ensureConsultantForUser } from "../db";
import { generateToken } from "./jwt";
import { logger } from "./logger";
import { createUser } from "../db";

export async function createPartnerApplication(payload: {
  fullName: string;
  email: string;
  password: string;
  phone?: string | null;
  title?: string | null;
  specialization?: string | null;
  yearsExperience?: number | null;
  bio?: string | null;
}) {
  const existing = await db.getPartnerApplicationById(0); // dummy to ensure db initialized
  const passwordHash = await hashPassword(payload.password);
  const id = await db.createPartnerApplication({
    fullName: payload.fullName,
    email: payload.email,
    passwordHash,
    phone: payload.phone || null,
    title: payload.title || null,
    specialization: payload.specialization || null,
    yearsExperience: payload.yearsExperience ?? null,
    bio: payload.bio || null,
    status: "pending_review",
  } as any);
  // Notify admins
  const admins = (await db.getAllUsers()).filter((u: any) => u.role === "admin");
  for (const admin of admins) {
    await dispatchNotification({
      userId: admin.id,
      title: "طلب شراكة جديد",
      body: `متقدم جديد: ${payload.fullName} (${payload.email})`,
      type: "registration",
    });
  }
  return { id };
}

export async function storePartnerDocuments(params: { applicationId: number; fileName: string; mimeType?: string; size?: number | null }) {
  if (!supabase) {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "التخزين غير مهيأ. تحقق من SUPABASE_URL و SUPABASE_SERVICE_ROLE_KEY." });
  }
  const safeName = params.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `partner_applications/${params.applicationId}/${Date.now()}_${safeName}`;
  const { data, error } = await supabase.storage.from("consultations").createSignedUploadUrl(path);
  if (error || !data?.signedUrl) {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "تعذر إنشاء رابط الرفع." });
  }
  const fileId = await db.addPartnerApplicationFile({
    applicationId: params.applicationId,
    fileName: params.fileName,
    storagePath: path,
    mimeType: params.mimeType || null,
    size: params.size || null,
  });
  return { uploadUrl: data.signedUrl, path, fileId, token: (data as any).token };
}

export async function approvePartnerApplication(params: { applicationId: number; reviewerUserId: number }) {
  const app = await db.getPartnerApplicationById(params.applicationId);
  if (!app) throw new TRPCError({ code: "NOT_FOUND", message: "الطلب غير موجود." });
  if (app.status === "approved") return { userId: app.userId, advisorId: app.advisorId };

  const user = await createUser({
    email: app.email,
    passwordHash: app.passwordHash,
    role: "advisor",
    openId: `partner_${app.email}`,
    loginMethod: "email",
  } as any);

  const advisor = await ensureConsultantForUser({
    id: user.id,
    email: user.email,
    name: app.fullName,
    role: "advisor",
    tier: "free",
    status: "active",
    lastSignedIn: new Date(),
    loginMethod: "email",
  } as any);

  await db.updatePartnerApplication(app.id, {
    status: "approved",
    approvedAt: new Date(),
    userId: user.id,
    advisorId: advisor?.id ?? null,
    reviewerUserId: params.reviewerUserId,
  });

  await dispatchNotification({
    userId: user.id,
    title: "تمت الموافقة على طلب الشراكة",
    body: "يمكنك الآن تسجيل الدخول إلى بوابة الشركاء.",
    type: "general",
  });

  return { userId: user.id, advisorId: advisor?.id ?? null };
}

export async function rejectPartnerApplication(params: { applicationId: number; reviewerUserId: number }) {
  const app = await db.getPartnerApplicationById(params.applicationId);
  if (!app) throw new TRPCError({ code: "NOT_FOUND", message: "الطلب غير موجود." });
  await db.updatePartnerApplication(app.id, {
    status: "rejected",
    rejectedAt: new Date(),
    reviewerUserId: params.reviewerUserId,
  });
  await dispatchNotification({
    userId: app.userId || null,
    title: "تم رفض طلب الشراكة",
    body: "نأسف، لم يتم قبول طلبك للشراكة حالياً.",
    type: "general",
  });
  return { success: true };
}

export async function listPartnerApplications(status?: (typeof partnerApplicationStatusEnum.enumValues)[number]) {
  return db.listPartnerApplications(status);
}

