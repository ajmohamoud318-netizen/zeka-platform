import "express-async-errors";
import express, { type NextFunction, type Request, type Response } from "express";
import cors from "cors";
import { clerkWebhooksRouter } from "./modules/webhooks/clerk-webhooks.routes.js";
import { ZodError } from "zod";
import { AppError } from "./lib/errors.js";
import { usersRouter } from "./modules/users/users.routes.js";
import { teamRouter } from "./modules/team/team.routes.js";
import { projectsRouter } from "./modules/projects/projects.routes.js";
import { approvalsRouter } from "./modules/approvals/approvals.routes.js";
import { activityRouter } from "./modules/activity/activity.routes.js";

export function createApp() {
  const app = express();

  app.use(
    cors({
      origin: process.env.FRONTEND_ORIGIN ?? true,
      credentials: true,
    })
  );
  app.use(
    "/api/webhooks/clerk",
    express.raw({ type: "application/json" }),
    clerkWebhooksRouter
  );
  app.use(express.json());

  app.get("/", (_req, res) => {
    res.json({ ok: true, service: "pm-api", health: "/health" });
  });

  app.get("/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.use("/api/users", usersRouter);
  app.use("/api/team", teamRouter);
  app.use("/api/projects", projectsRouter);
  app.use("/api/approvals", approvalsRouter);
  app.use("/api/activity", activityRouter);

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof AppError) {
      res.status(err.statusCode).json({ error: err.message, code: err.code });
      return;
    }
    if (err instanceof ZodError) {
      res.status(400).json({ error: "Validation failed", details: err.flatten() });
      return;
    }
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  });

  return app;
}
