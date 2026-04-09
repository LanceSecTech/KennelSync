import "dotenv/config";
import express from "express";
import { createServer } from "http";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
// OAuth removed - using Supabase Auth instead
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";

async function startServer() {
  const host = "0.0.0.0";
  const port = Number(process.env.PORT) || 3000;

  console.log("[startup] KennelSync server bootstrap starting…");
  console.log("[startup] NODE_ENV=%s", process.env.NODE_ENV ?? "(unset)");

  console.log("[startup] Creating Express app and HTTP server…");
  const app = express();
  const server = createServer(app);
  console.log("[startup] Express app init complete");

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
  server.listen(port, host, () => {
    console.log(`Server running on ${host}:${port}`);
    console.log("[startup] Ready — health: http://%s:%d/health", host, port);
  });
}

startServer().catch((err) => {
  console.error("[startup] FATAL: could not start server:", err);
  process.exit(1);
});
