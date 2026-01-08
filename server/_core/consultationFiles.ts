import { TRPCError } from "@trpc/server";
import { supabase } from "./supabase";
import * as db from "../db";

type UploaderRole = "user" | "advisor" | "system";

export async function attachConsultationFile(params: {
  requestId: number;
  fileName: string;
  fileType: "pdf" | "image" | "doc" | "other";
  mimeType?: string | null;
  size?: number | null;
  uploaderRole: UploaderRole;
  uploaderUserId?: number | null;
  uploaderAdvisorId?: number | null;
}) {
  if (!supabase) {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "التخزين غير مهيأ. تحقق من SUPABASE_URL و SUPABASE_SERVICE_ROLE_KEY." });
  }

  const safeName = params.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `consultations/${params.requestId}/${Date.now()}_${safeName}`;

  const { data, error } = await supabase.storage.from("consultations").createSignedUploadUrl(path, 300);
  if (error || !data?.signedUrl) {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "تعذر إنشاء رابط الرفع." });
  }

  const fileId = await db.addConsultationFile({
    consultationId: params.requestId,
    uploaderUserId: params.uploaderUserId ?? null,
    uploaderAdvisorId: params.uploaderAdvisorId ?? null,
    uploaderRole: params.uploaderRole,
    fileType: params.fileType,
    storagePath: path,
    mimeType: params.mimeType || null,
    size: params.size || null,
  });

  return {
    fileId,
    uploadUrl: data.signedUrl,
    token: (data as any).token,
    path,
  };
}

