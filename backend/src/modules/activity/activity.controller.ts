import type { Response } from "express";
import type { AuthedRequest } from "../../middleware/auth.js";
import { AppError } from "../../lib/errors.js";
import { activityService } from "./activity.service.js";

export const activityController = {
  async feed(req: AuthedRequest, res: Response): Promise<void> {
    const raw = req.query.limit;
    const n = typeof raw === "string" ? Number.parseInt(raw, 10) : NaN;
    const limit = Number.isFinite(n) && n > 0 && n <= 200 ? n : 40;
    const items = await activityService.feed(limit);
    res.json({ items });
  },

  async projectTimeline(req: AuthedRequest, res: Response): Promise<void> {
    const raw = req.query.limit;
    const n = typeof raw === "string" ? Number.parseInt(raw, 10) : NaN;
    const limit = Number.isFinite(n) && n > 0 && n <= 200 ? n : 50;
    const items = await activityService.projectProgressTimeline(limit);
    res.json({ items });
  },

  async dailyLog(req: AuthedRequest, res: Response): Promise<void> {
    try {
      const result = await activityService.upsertDailyLog(req.dbUser!, req.body);
      res.json(result);
    } catch (e) {
      if (e instanceof AppError) {
        res.status(e.statusCode).json({ error: e.message, code: e.code });
        return;
      }
      throw e;
    }
  },
};
