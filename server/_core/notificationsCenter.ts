import { TRPCError } from "@trpc/server";
import { notifications, users, vendors } from "../../drizzle/schema";
import * as db from "../db";
import { eq, desc } from "drizzle-orm";

export type NotificationType = "registration" | "purchase" | "unread_messages" | "broadcast" | "vendor" | "payout" | "general";

export async function dispatchNotification(params: {
  userId?: number | null;
  vendorId?: number | null;
  title: string;
  body: string;
  type?: NotificationType;
}) {
  const dbClient = await db.getDb();
  if (!dbClient) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

  // Validate target
  if (!params.userId && !params.vendorId) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "يجب تحديد مستلم للإشعار." });
  }

  if (params.userId) {
    const u = await dbClient.select().from(users).where(eq(users.id, params.userId));
    if (!u[0]) throw new TRPCError({ code: "NOT_FOUND", message: "المستخدم غير موجود." });
  }

  if (params.vendorId) {
    const v = await dbClient.select().from(vendors).where(eq(vendors.id, params.vendorId));
    if (!v[0]) throw new TRPCError({ code: "NOT_FOUND", message: "البائع غير موجود." });
  }

  const result = await dbClient
    .insert(notifications)
    .values({
      userId: params.userId ?? null,
      vendorId: params.vendorId ?? null,
      title: params.title,
      body: params.body,
      type: params.type || "general",
      status: "unread",
    } as any)
    .returning({ id: notifications.id });

  return { id: result[0].id };
}

export async function listNotifications(params: { userId: number; limit?: number }) {
  const dbClient = await db.getDb();
  if (!dbClient) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

  const rows = await dbClient
    .select()
    .from(notifications)
    .where(eq(notifications.userId, params.userId))
    .orderBy(desc(notifications.createdAt))
    .limit(params.limit ?? 50);

  return rows;
}

export async function markAllRead(params: { userId: number }) {
  const dbClient = await db.getDb();
  if (!dbClient) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });
  await dbClient.update(notifications).set({ status: "read" }).where(eq(notifications.userId, params.userId));
  return { success: true };
}

