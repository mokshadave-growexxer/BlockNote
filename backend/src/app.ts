import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./config/env.js";
import { errorHandler, notFoundHandler } from "./middleware/error.middleware.js";
import { authRouter } from "./routes/auth.routes.js";
import { documentRouter } from "./routes/document.routes.js";
import { blockRouter } from "./routes/block.routes.js";
import { aiRouter } from "./routes/ai.routes.js";
import { requireAuth } from "./middleware/auth.middleware.js";
import { enableSharing, disableSharing, getSharedDocument } from "./controllers/share.controller.js";

export function createApp() {
  const app = express();

  app.use(cors({ origin: env.FRONTEND_URL, credentials: true }));
  app.use(helmet({ crossOriginResourcePolicy: false }));
  app.use(morgan("dev"));
  app.use(express.json());
  app.use(cookieParser());

  app.get("/api/health", (_req, res) => res.status(200).json({ status: "ok" }));

  app.use("/api/auth", authRouter);
  app.use("/api/documents", documentRouter);
  app.use("/api/documents/:documentId/blocks", blockRouter);
  app.use("/api/ai", aiRouter);

  // Share endpoints
  app.post("/api/documents/:id/share", requireAuth, enableSharing);
  app.delete("/api/documents/:id/share", requireAuth, disableSharing);
  app.get("/api/share/:token", getSharedDocument);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
