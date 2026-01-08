import { TRPCError } from "@trpc/server";
import { supabase } from "./supabase";
import { libraryCreatorRoleEnum } from "../../drizzle/schema";
import * as db from "../db";
import { dispatchNotification } from "./notificationsCenter";

type Role = (typeof libraryCreatorRoleEnum.enumValues)[number];

export function assertLibraryFileAccess(user: any, file: any) {
  if (!file) throw new TRPCError({ code: "NOT_FOUND", message: "الملف غير موجود." });
  if (user?.role === "admin") return;
  if (file.isPublic) return;
  if (user?.role === "advisor" && file.createdByRole === "advisor" && file.createdById === user.id) return;
  if (user && file.targetUserId && file.targetUserId === user.id) return;
  throw new TRPCError({ code: "FORBIDDEN", message: "لا تملك صلاحية الوصول لهذا الملف." });
}

async function ensureAdvisorAssignment(advisorId: number, consultationId: number) {
  const isAssigned = await db.isAdvisorAssignedToConsultation(advisorId, consultationId);
  if (!isAssigned) {
    throw new TRPCError({ code: "FORBIDDEN", message: "لا يمكنك إرسال ملف لهذا الطلب." });
  }
}

export async function uploadLibraryFile(params: {
  user: any;
  title: string;
  description?: string | null;
  fileName: string;
  mimeType?: string | null;
  size?: number | null;
  targetUserId?: number | null;
  consultationId?: number | null;
}) {
  if (!supabase) {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "التخزين غير مهيأ. تحقق من SUPABASE_URL و SUPABASE_SERVICE_ROLE_KEY." });
  }

  const isAdmin = params.user?.role === "admin";
  const isAdvisor = params.user?.role === "advisor" || params.user?.role === "consultant";

  if (!isAdmin && !isAdvisor) {
    throw new TRPCError({ code: "FORBIDDEN", message: "صلاحيات غير كافية." });
  }

  if (isAdmin && params.consultationId) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "الملفات العامة لا ترتبط بالاستشارات." });
  }

  if (isAdvisor) {
    if (!params.targetUserId) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "يجب تحديد المستخدم المستهدف." });
    }
    if (params.consultationId) {
      await ensureAdvisorAssignment(params.user.id, params.consultationId);
    }
  }

  const safeName = params.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `library/${Date.now()}_${safeName}`;
  const { data, error } = await supabase.storage.from("consultations").createSignedUploadUrl(path);
  if (error || !data?.signedUrl) {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "تعذر إنشاء رابط الرفع." });
  }

  const isPublic = isAdmin;

  const created = await db.createLibraryFile({
    title: params.title,
    description: params.description || null,
    fileUrl: path,
    fileSize: params.size ?? null,
    mimeType: params.mimeType || null,
    createdByRole: isAdmin ? "admin" : "advisor",
    createdById: isAdmin ? null : params.user.id,
    targetUserId: isAdmin ? null : params.targetUserId ?? null,
    consultationId: params.consultationId ?? null,
    isPublic,
  });

  return {
    uploadUrl: data.signedUrl,
    token: (data as any).token,
    file: { id: created.id, ...params, fileUrl: path, isPublic, createdAt: created.createdAt },
  };
}

export async function listLibraryFilesForUser(user: any) {
  return db.listLibraryFilesVisibleToUser(user);
}

export async function adminBroadcastLibraryFile(params: {
  admin: any;
  title: string;
  description?: string | null;
  fileName: string;
  mimeType?: string | null;
  size?: number | null;
}) {
  if (!params.admin || params.admin.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "الأدمن فقط." });
  }
  const uploaded = await uploadLibraryFile({
    user: params.admin,
    title: params.title,
    description: params.description,
    fileName: params.fileName,
    mimeType: params.mimeType,
    size: params.size ?? null,
  });
  return uploaded;
}

export async function advisorSendLibraryFile(params: {
  advisor: any;
  targetUserId: number;
  consultationId: number;
  title: string;
  description?: string | null;
  fileName: string;
  mimeType?: string | null;
  size?: number | null;
}) {
  return uploadLibraryFile({
    user: params.advisor,
    title: params.title,
    description: params.description,
    fileName: params.fileName,
    mimeType: params.mimeType,
    size: params.size ?? null,
    targetUserId: params.targetUserId,
    consultationId: params.consultationId,
  });
}

export async function notifyLibraryFileCreated(file: any) {
  if (file.isPublic) {
    const users = await db.getAllUsers();
    for (const u of users) {
      await dispatchNotification({
        userId: u.id,
        title: "ملف جديد في المكتبة",
        body: file.title || "تمت إضافة ملف جديد",
        type: "general",
      });
    }
  } else if (file.targetUserId) {
    await dispatchNotification({
      userId: file.targetUserId,
      title: "ملف جديد لك",
      body: file.title || "ملف من المستشار",
      type: "general",
    });
  }
}

