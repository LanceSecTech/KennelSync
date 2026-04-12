import "dotenv/config";
import cors from "cors";
import express from "express";
import { createServer } from "http";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
// OAuth removed - using Supabase Auth instead
import { appRouter } from "../routers";
import { createContext } from "./context";
import { logDevBackendSupabaseEnv } from "./logDevSupabaseEnv";
import { serveStatic, setupVite } from "./vite";

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
});

process.on("unhandledRejection", (err) => {
  console.error("Unhandled Rejection:", err);
});

/** Always allowed in production when NODE_ENV is production (Vercel frontend). */
const PRODUCTION_DEFAULT_ORIGIN = "https://kennelsync.vercel.app";

/** WKWebView / Capacitor file origins — not the same as browser localhost. */
function isCapacitorOrHybridOrigin(origin: string): boolean {
  const o = String(origin).trim();
  return (
    o === "capacitor://localhost" ||
    o === "ionic://localhost" ||
    o === "http://localhost" ||
    o === "https://localhost"
  );
}

/** Merge CORS_ORIGINS and ALLOWED_ORIGINS (both optional, comma-separated). */
function readCorsAllowedOrigins(): string[] {
  const pieces: string[] = [];
  for (const raw of [process.env.CORS_ORIGINS, process.env.ALLOWED_ORIGINS]) {
    if (raw == null || !String(raw).trim()) continue;
    for (const part of String(raw).split(",")) {
      const o = part.trim();
      if (o) pieces.push(o);
    }
  }
  const seen = new Set<string>();
  const uniq: string[] = [];
  for (const o of pieces) {
    if (!seen.has(o)) {
      seen.add(o);
      uniq.push(o);
    }
  }
  if (process.env.NODE_ENV === "production" && !seen.has(PRODUCTION_DEFAULT_ORIGIN)) {
    uniq.push(PRODUCTION_DEFAULT_ORIGIN);
    seen.add(PRODUCTION_DEFAULT_ORIGIN);
  }
  if (uniq.length > 0) {
    return uniq;
  }
  if (process.env.NODE_ENV !== "production") {
    return [
      "http://localhost:3000",
      "http://127.0.0.1:3000",
      "http://localhost:5173",
      "http://127.0.0.1:5173",
    ];
  }
  return [PRODUCTION_DEFAULT_ORIGIN];
}

async function startServer() {
  const host = "0.0.0.0";
  const port = Number(process.env.PORT) || 3000;

  logDevBackendSupabaseEnv();

  console.log("[startup] KennelSync server bootstrap starting…");
  console.log("[startup] NODE_ENV=%s", process.env.NODE_ENV ?? "(unset)");

  console.log("[startup] Creating Express app and HTTP server…");
  const app = express();
  const server = createServer(app);
  console.log("[startup] Express app init complete");

  const corsOrigins = readCorsAllowedOrigins();
  console.log(
    "[startup] CORS final allowed origins (%d): %s",
    corsOrigins.length,
    corsOrigins.join(", "),
  );
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin) {
          callback(null, true);
          return;
        }
        if (isCapacitorOrHybridOrigin(origin)) {
          callback(null, true);
          return;
        }
        if (corsOrigins.length === 0) {
          callback(null, false);
          return;
        }
        if (corsOrigins.includes(origin)) {
          callback(null, true);
          return;
        }
        callback(null, false);
      },
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: [
        "Content-Type",
        "Authorization",
        "x-trpc-source",
        "trpc-accept",
        "x-requested-with",
      ],
    }),
  );
  console.log("[startup] CORS middleware applied");

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });
  console.log("[startup] Registered GET /health → { status: \"ok\" }");

  try {
    console.log("[startup] Registering Stripe webhook (before body parsers)…");
    const { registerStripeWebhook } = await import("../stripeWebhook");
    registerStripeWebhook(app);
    console.log("[startup] Stripe webhook registration complete");
  } catch (err) {
    console.error("[startup] ERROR: Stripe webhook registration failed:", err);
    throw err;
  }

  console.log("[startup] Applying JSON and urlencoded middleware…");
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  console.log("[startup] Middleware setup complete");

  console.log("[startup] Mounting tRPC at /api/trpc…");
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    }),
  );
  console.log("[startup] tRPC setup complete");

  if (process.env.NODE_ENV === "development") {
    console.log("[startup] Configuring Vite (development)…");
    await setupVite(app, server);
    console.log("[startup] Vite setup complete");
  } else {
    console.log("[startup] Configuring static file serving (production / non-dev)…");
    serveStatic(app);
    console.log("[startup] Static / SPA setup complete");
  }

  server.on("error", (err: NodeJS.ErrnoException) => {
    console.error("[startup] HTTP server error:", err.code, err.message);
    console.error(err);
  });

  console.log("[startup] Calling server.listen(%d, %s)…", port, host);

  await new Promise<void>((resolve, reject) => {
    server.once("error", (err: Error) => {
      reject(err);
    });
    server.listen(port, host, () => {
      console.log(`Server running on ${host}:${port}`);
      console.log("[startup] Ready — health: http://%s:%d/health", host, port);
      resolve();
    });
  });

  // HTTP server has an active listener; Node keeps the process alive from here.
  // startServer() returns after listen succeeds; no process.exit on success.
}

(async () => {
  try {
    await startServer();
  } catch (err) {
    console.error("Startup error:", err);
    process.exit(1);
  }
})();
