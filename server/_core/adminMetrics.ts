import { sql, eq } from "drizzle-orm";
import { users, conversations, files, stocks, consultationRequests, advisorRatings, orders, requestTransitions } from "../../drizzle/schema";
import * as db from "../db";

type ConsultationsSummary = {
  total: number;
  statusCounts: Record<string, number>;
  avgRating: number | null;
  netRevenueKwd: number;
  avgAcceptanceMinutes: number | null;
};

async function countTable(table: any, where?: any) {
  const dbClient = await db.getDb();
  if (!dbClient) throw new Error("Database not available");
  const res = await dbClient.select({ count: sql<number>`cast(count(*) as int)` }).from(table).where(where as any);
  return res[0]?.count || 0;
}

export async function getUsersCount(): Promise<number> {
  return countTable(users);
}

export async function getConversationsCount(): Promise<number> {
  return countTable(conversations);
}

export async function getContractsCount(): Promise<number> {
  const dbClient = await db.getDb();
  if (!dbClient) throw new Error("Database not available");
  const res = await dbClient
    .select({ count: sql<number>`cast(count(*) as int)` })
    .from(files)
    .where(eq(files.type, "contract" as any));
  return res[0]?.count || 0;
}

export async function getStocksScreenedCount(): Promise<number> {
  return countTable(stocks);
}

export async function getConsultationsSummary(): Promise<ConsultationsSummary> {
  const dbClient = await db.getDb();
  if (!dbClient) throw new Error("Database not available");

  const requests = await dbClient.select().from(consultationRequests);
  const ratings = await dbClient.select().from(advisorRatings);
  const consultationOrders = await dbClient.select().from(orders).where(eq(orders.serviceType, "consultation"));

  const statusCounts: Record<string, number> = {};
  requests.forEach((r) => {
    statusCounts[r.status] = (statusCounts[r.status] || 0) + 1;
  });

  const avgRating =
    ratings.length === 0
      ? null
      : ratings.reduce((sum, r) => sum + (r.score || 0), 0) / ratings.length;

  const netRevenue = consultationOrders.reduce((sum, o) => {
    if (o.netAmountKwd !== null && o.netAmountKwd !== undefined) return sum + o.netAmountKwd;
    if (o.priceKWD) {
      const discount = o.discountAmountKwd ?? 0;
      return sum + (o.priceKWD - discount);
    }
    return sum;
  }, 0);

  const transitions = await dbClient.select().from(requestTransitions);
  const requestMap = new Map<number, { createdAt: Date }>();
  requests.forEach((r) => requestMap.set(r.id, { createdAt: r.createdAt }));
  const acceptanceDurations: number[] = [];
  transitions
    .filter((t) => t.toStatus === "accepted")
    .forEach((t) => {
      const req = requestMap.get(t.requestId);
      if (req) {
        const from = req.createdAt instanceof Date ? req.createdAt.getTime() : new Date(req.createdAt as any).getTime();
        const to = t.createdAt instanceof Date ? t.createdAt.getTime() : new Date(t.createdAt as any).getTime();
        acceptanceDurations.push((to - from) / 60000);
      }
    });
  const avgAcceptanceMinutes =
    acceptanceDurations.length === 0
      ? null
      : acceptanceDurations.reduce((a, b) => a + b, 0) / acceptanceDurations.length;

  return {
    total: requests.length,
    statusCounts,
    avgRating,
    netRevenueKwd: netRevenue,
    avgAcceptanceMinutes,
  };
}

