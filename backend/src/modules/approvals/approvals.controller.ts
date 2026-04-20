import type { Response } from "express";
import type { AuthedRequest } from "../../middleware/auth.js";
import { AppError } from "../../lib/errors.js";
import { approvalsService } from "./approvals.service.js";

export const approvalsController = {
  async getForProject(req: AuthedRequest, res: Response): Promise<void> {
    try {
      const state = await approvalsService.getCurrentState(req.params.projectId);
      res.json(state);
    } catch (e) {
      if (e instanceof AppError) {
        res.status(e.statusCode).json({ error: e.message, code: e.code });
        return;
      }
      throw e;
    }
  },

  async decision(req: AuthedRequest, res: Response): Promise<void> {
    try {
      const state = await approvalsService.submitDecision(req.dbUser!, req.params.approvalId, req.body);
      res.json(state);
    } catch (e) {
      if (e instanceof AppError) {
        res.status(e.statusCode).json({ error: e.message, code: e.code });
        return;
      }
      throw e;
    }
  },

  async requestAgain(req: AuthedRequest, res: Response): Promise<void> {
    try {
      const state = await approvalsService.requestApprovalAgain(req.dbUser!, req.params.projectId);
      res.json(state);
    } catch (e) {
      if (e instanceof AppError) {
        res.status(e.statusCode).json({ error: e.message, code: e.code });
        return;
      }
      throw e;
    }
  },
};
