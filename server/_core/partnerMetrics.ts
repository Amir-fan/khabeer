import { TRPCError } from "@trpc/server";
import { advisorRatings, consultationRequests } from "../../drizzle/schema";
import * as db from "../db";
import { eq } from "drizzle-orm";

export async function computePartnerMetrics(advisorId: number) {
  const dbClient = await db.getDb();
  if (!dbClient) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

  const requests = await dbClient.select().from(consultationRequests).where(eq(consultationRequests.advisorId, advisorId));
  const ratings = await dbClient.select().from(advisorRatings).where(eq(advisorRatings.advisorId, advisorId));

  const totalOrders = requests.length;
  const completed = requests.filter((r) => ["closed", "rated"].includes(r.status as string)).length;
  const active = requests.filter((r) => ["accepted", "in_progress", "paid"].includes(r.status as string)).length;

  const rating =
    ratings.length === 0
      ? 0
      : ratings.reduce((sum, r) => sum + (r.score || 0), 0) / ratings.length;

  return {
    advisorId,
    totalOrders,
    completedOrders: completed,
    activeOrders: active,
    rating,
    status: completed > 0 || active > 0 ? "active" : "new",
  };
}

