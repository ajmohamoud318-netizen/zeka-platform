import { Router } from "express";
import { clerkAuth } from "../../middleware/auth.js";
import { approvalsController } from "./approvals.controller.js";

export const approvalsRouter = Router();

approvalsRouter.get("/projects/:projectId", clerkAuth, approvalsController.getForProject);
approvalsRouter.post("/:approvalId/decisions", clerkAuth, approvalsController.decision);
approvalsRouter.post(
  "/projects/:projectId/request-again",
  clerkAuth,
  approvalsController.requestAgain
);
