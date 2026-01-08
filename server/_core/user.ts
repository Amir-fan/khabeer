import type { User } from "../../drizzle/schema";
import { logger } from "./logger";
import * as db from "../db";

/**
 * Normalize an authenticated identity into a single persisted User record.
 * - Ensures we return exactly one user row with stable id/role/tier.
 * - For fallback/system tokens (negative IDs), we upsert a lightweight record.
 * - Prefers DB lookups by id, then by email.
 */
export async function normalizeUserFromToken(payload: { userId: number; email: string; role: string }): Promise<User | null> {
  try {
    // 1) If token carries a positive userId, try by id first.
    if (payload.userId > 0) {
      const byId = await db.getUserById(payload.userId);
      if (byId) return byId;
    }

    // 2) Fallback by email.
    if (payload.email) {
      const byEmail = await db.getUserByEmail(payload.email);
      if (byEmail) return byEmail as User;
    }

    // 3) For fallback/system identities (negative IDs), ensure a persisted row.
    if (payload.userId < 0 && payload.email) {
      const openId = `fallback_${payload.userId}`;
      await db.upsertUser({
        openId,
        email: payload.email,
        role: payload.role as any,
        lastSignedIn: new Date(),
      });
      const created = await db.getUserByEmail(payload.email);
      if (created) return created as User;
    }

    // 4) As a last resort, return a minimal in-memory user to avoid null contexts.
    return {
      id: payload.userId,
      openId: `fallback_${payload.userId}`,
      email: payload.email,
      role: payload.role as any,
      tier: "pro" as any,
      status: "active" as any,
      name: payload.email,
      loginMethod: "fallback",
      lastSignedIn: new Date(),
      packageId: null as any,
    } as User;
  } catch (error) {
    logger.error(
      "normalizeUserFromToken failed",
      error instanceof Error ? error : new Error(String(error))
    );
    return null;
  }
}

