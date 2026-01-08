/**
 * JWT token utilities
 * Handles token generation and verification for session management
 * 
 * REQUIRES: npm install jsonwebtoken @types/jsonwebtoken
 */

import jwt from "jsonwebtoken";
import { ENV } from "./env";
import { logger } from "./logger";

const JWT_SECRET = ENV.cookieSecret || process.env.JWT_SECRET || "change-me-in-production";
const JWT_EXPIRES_IN = "7d"; // 7 days

export interface JWTPayload {
  userId: number;
  email: string;
  role: string;
  advisorId?: number; // present for advisor/consultant roles
}

/**
 * Generate JWT token for user
 * @param payload - User data to encode in token
 * @returns JWT token string
 */
export function generateToken(payload: JWTPayload): string {
  if (!JWT_SECRET || JWT_SECRET === "change-me-in-production") {
    logger.warn("JWT_SECRET is not set or using default value", {});
  }
  
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
}

/**
 * Verify and decode JWT token
 * Checks blacklist before verification to ensure logged-out tokens are rejected.
 * 
 * @param token - JWT token string
 * @returns Decoded payload or null if invalid/blacklisted
 */
export async function verifyToken(token: string): Promise<JWTPayload | null> {
  // Check blacklist first (reject logged-out tokens)
  const { isTokenBlacklisted } = await import("./jwtBlacklist");
  const blacklisted = await isTokenBlacklisted(token);
  if (blacklisted) {
    logger.debug("Token is blacklisted (logged out)", {});
    return null;
  }

  // Verify token signature and expiration
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload & { exp?: number; iat?: number };
    return decoded;
  } catch (error) {
    logger.debug("JWT verification failed", { error: error instanceof Error ? error.message : "unknown" });
    return null;
  }
}

/**
 * Extract token from Authorization header
 * @param authHeader - Authorization header value
 * @returns Token string or null
 */
export function extractTokenFromHeader(authHeader: string | string[] | undefined): string | null {
  if (!authHeader) return null;
  
  const header = Array.isArray(authHeader) ? authHeader[0] : authHeader;
  if (header && typeof header === "string" && header.startsWith("Bearer ")) {
    return header.substring(7);
  }
  return null;
}

