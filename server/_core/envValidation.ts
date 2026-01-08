/**
 * Environment variable validation
 * Validates all required environment variables on startup
 */

import { logger } from "./logger";
import { ENV } from "./env";

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate all environment variables
 * Returns validation result with errors and warnings
 */
export function validateEnvironment(): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required for production
  if (ENV.isProduction) {
    if (!ENV.databaseUrl || ENV.databaseUrl.trim() === "") {
      errors.push("DATABASE_URL is required in production");
    }

    if (!ENV.cookieSecret || ENV.cookieSecret === "change-me-in-production" || ENV.cookieSecret.length < 32) {
      errors.push("JWT_SECRET must be set and at least 32 characters in production");
    }

    if (!ENV.geminiApiKey || ENV.geminiApiKey.trim() === "") {
      errors.push("GEMINI_API_KEY is required in production");
    }
  }

  // Warnings for development
  if (!ENV.isProduction) {
    if (!ENV.databaseUrl || ENV.databaseUrl.trim() === "") {
      warnings.push("DATABASE_URL not set - database features will not work");
    }

    if (!ENV.cookieSecret || ENV.cookieSecret === "change-me-in-production") {
      warnings.push("JWT_SECRET is using default value - change in production");
    }

    if (!ENV.geminiApiKey || ENV.geminiApiKey.trim() === "") {
      warnings.push("GEMINI_API_KEY not set - AI features will not work");
    }
  }

  // Optional but recommended
  if (!process.env.REDIS_URL) {
    warnings.push("REDIS_URL not set - rate limiting will use in-memory (not suitable for production scaling)");
  }

  // Validate database URL format
  if (ENV.databaseUrl && !ENV.databaseUrl.startsWith("postgresql://") && !ENV.databaseUrl.startsWith("postgres://")) {
    warnings.push("DATABASE_URL should start with 'postgresql://' or 'postgres://'");
  }

  // Validate JWT secret strength
  if (ENV.cookieSecret && ENV.cookieSecret.length < 32 && ENV.isProduction) {
    errors.push("JWT_SECRET must be at least 32 characters in production");
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate and log environment on startup
 * Throws error if critical variables are missing in production
 */
export function validateEnvironmentOnStartup(): void {
  const result = validateEnvironment();

  // Log warnings
  result.warnings.forEach((warning) => {
    logger.warn("Environment variable warning", { warning });
  });

  // Log errors
  result.errors.forEach((error) => {
    logger.error("Environment variable error", new Error(error));
  });

  // Throw in production if invalid
  if (ENV.isProduction && !result.valid) {
    throw new Error(
      `Environment validation failed:\n${result.errors.join("\n")}\n\nPlease fix these issues before starting the server.`
    );
  }

  // Warn in development
  if (!ENV.isProduction && result.errors.length > 0) {
    logger.warn("Environment validation found errors (non-production mode, continuing anyway)", {
      errors: result.errors,
    });
  }
}

