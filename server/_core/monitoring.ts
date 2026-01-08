/**
 * Error monitoring integration
 * Supports Sentry or console logging fallback
 */

import { logger } from "./logger";
import { ENV } from "./env";

let sentryInitialized = false;
let sentryClient: any = null;

/**
 * Initialize error monitoring (Sentry)
 */
export async function initErrorMonitoring(): Promise<void> {
  const sentryDsn = process.env.SENTRY_DSN;
  
  if (!sentryDsn || sentryDsn.trim() === "") {
    logger.info("SENTRY_DSN not set, using console logging for error monitoring");
    return;
  }

  try {
    // Dynamic import to avoid requiring @sentry/node in dev
    const Sentry = await import("@sentry/node");
    
    Sentry.init({
      dsn: sentryDsn,
      environment: ENV.isProduction ? "production" : "development",
      tracesSampleRate: ENV.isProduction ? 0.1 : 1.0, // 10% in production, 100% in dev
      beforeSend(event) {
        // Don't send if it's a known, non-critical error
        if (event.exception) {
          const error = event.exception.values?.[0];
          if (error?.value?.includes("AI service is not configured")) {
            return null; // Don't send to Sentry
          }
        }
        return event;
      },
    });

    sentryClient = Sentry;
    sentryInitialized = true;
    logger.info("Sentry error monitoring initialized");
  } catch (error) {
    logger.warn("Sentry initialization failed, using console logging", {
      error: error instanceof Error ? error.message : String(error),
    });
    sentryInitialized = false;
  }
}

/**
 * Capture exception to error monitoring
 */
export function captureException(error: Error, context?: Record<string, any>): void {
  if (sentryInitialized && sentryClient) {
    try {
      sentryClient.captureException(error, {
        extra: context,
      });
    } catch {
      // Fall through to logger
    }
  }

  // Always log to console/logger
  logger.error("Exception captured", error, context);
}

/**
 * Capture message to error monitoring
 */
export function captureMessage(message: string, level: "info" | "warning" | "error" = "info", context?: Record<string, any>): void {
  if (sentryInitialized && sentryClient) {
    try {
      sentryClient.captureMessage(message, {
        level: level === "info" ? "info" : level === "warning" ? "warning" : "error",
        extra: context,
      });
    } catch {
      // Fall through to logger
    }
  }

  // Always log to console/logger
  logger[level](message, context);
}

/**
 * Set user context for error monitoring
 */
export function setUserContext(userId: number, email?: string, role?: string): void {
  if (sentryInitialized && sentryClient) {
    try {
      sentryClient.setUser({
        id: userId.toString(),
        email,
        role,
      });
    } catch {
      // Ignore
    }
  }
}

/**
 * Clear user context
 */
export function clearUserContext(): void {
  if (sentryInitialized && sentryClient) {
    try {
      sentryClient.setUser(null);
    } catch {
      // Ignore
    }
  }
}

