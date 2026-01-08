/**
 * Vercel Serverless Function Entry Point
 * 
 * This file serves as the entry point for Vercel serverless functions.
 * It exports the Express app as a serverless function.
 * 
 * Max duration: 30 seconds (configured via vercel.json)
 */

import "dotenv/config";
import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "../server/_core/oauth";
import { appRouter } from "../server/routers";
import { createContext } from "../server/_core/context";
import { validateEnvironmentOnStartup } from "../server/_core/envValidation";
import { initErrorMonitoring } from "../server/_core/monitoring";
import { seedTierLimits } from "../server/db";
import { seedAccounts } from "../server/_core/seedAccounts";
import path from "path";

// Initialize server (only once, not on every request)
let app: express.Express | null = null;
let isInitialized = false;

async function initializeServer() {
  if (isInitialized && app) {
    return app;
  }

  // Validate environment variables on startup
  validateEnvironmentOnStartup();

  // Initialize error monitoring (Sentry)
  await initErrorMonitoring();

  // Seed tier limits if missing (idempotent)
  await seedTierLimits();

  // Seed default admin and partner accounts (idempotent, only if env vars are set)
  await seedAccounts();

  app = express();

  // Enable CORS for all routes - reflect the request origin to support credentials
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin) {
      res.header("Access-Control-Allow-Origin", origin);
    }
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.header(
      "Access-Control-Allow-Headers",
      "Origin, X-Requested-With, Content-Type, Accept, Authorization",
    );
    res.header("Access-Control-Allow-Credentials", "true");

    // Handle preflight requests
    if (req.method === "OPTIONS") {
      res.sendStatus(200);
      return;
    }
    next();
  });

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  registerOAuthRoutes(app);

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, timestamp: Date.now() });
  });

  // Add logging middleware to debug tRPC requests (only in development)
  if (process.env.NODE_ENV !== "production") {
    app.use("/api/trpc", (req, res, next) => {
      if (req.method === "POST") {
        console.log("[tRPC] Request received:", {
          path: req.path,
          method: req.method,
          contentType: req.headers["content-type"],
          body: req.body ? JSON.stringify(req.body).substring(0, 200) : "no body",
          hasInput: !!req.body?.input,
        });
      }
      next();
    });
  }

  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    }),
  );

  // Serve admin dashboard
  // Use process.cwd() for Vercel serverless compatibility (instead of import.meta.url)
  const adminWebPath = path.join(process.cwd(), "admin-web");
  
  app.use("/admin", express.static(adminWebPath));
  
  // Serve trpc-client.js from admin-web directory
  app.get("/admin/trpc-client.js", (_req, res) => {
    res.sendFile(path.join(adminWebPath, "trpc-client.js"));
  });

  isInitialized = true;
  return app;
}

// Vercel serverless function handler
// Max duration is configured in vercel.json builds config
export default async function handler(req: express.Request, res: express.Response) {
  const serverApp = await initializeServer();
  return serverApp(req, res);
}
