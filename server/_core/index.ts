import "dotenv/config";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { validateEnvironmentOnStartup } from "./envValidation";
import { initErrorMonitoring } from "./monitoring";
import { seedTierLimits } from "../db";
import { seedAccounts } from "./seedAccounts";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  // Validate environment variables on startup
  validateEnvironmentOnStartup();

  // Initialize error monitoring (Sentry)
  await initErrorMonitoring();

  // Seed tier limits if missing (idempotent)
  await seedTierLimits();

  // Seed default admin and partner accounts (idempotent)
  await seedAccounts();

  const app = express();
  const server = createServer(app);

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

  // Add logging middleware to debug tRPC requests
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

  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
      // tRPC v11: transformer is set on the tRPC instance, not here
      // The middleware automatically uses the transformer from the router
    }),
  );

  // Serve admin dashboard
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  app.use("/admin", express.static(path.join(__dirname, "../../admin-web")));
  
  // Serve trpc-client.js from admin-web directory
  app.get("/admin/trpc-client.js", (_req, res) => {
    res.sendFile(path.join(__dirname, "../../admin-web/trpc-client.js"));
  });

  // Prefer a fixed dev port for API (frontend uses 11000); allow override via PORT
  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`[api] server listening on port ${port}`);
  });
}

startServer().catch(console.error);
