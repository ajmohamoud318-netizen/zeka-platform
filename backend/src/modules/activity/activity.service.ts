import { z } from "zod";
import { AppError } from "../../lib/errors.js";
import type { DbUser } from "../../types/domain.js";
import { activityRepository } from "./activity.repository.js";
import { pool } from "../../db/pool.js";

const dailyLogSchema = z.object({
  logDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  workedOnSomethingElse: z.boolean(),
  description: z.string(),
});

export const activityService = {
  feed(limit?: number) {
    return activityRepository.listFeed(limit ?? 40);
  },

  projectProgressTimeline(limit?: number) {
    return activityRepository.listProjectProgressTimeline(limit ?? 50);
  },

  async upsertDailyLog(actor: DbUser, raw: unknown) {
    if (actor.role !== "designer") {
      throw new AppError(403, "Only designers can submit daily work logs");
    }

    const body = dailyLogSchema.parse(raw);

    await pool.query(
      `INSERT INTO daily_work_logs (user_id, log_date, worked_on_something_else, description)
       VALUES ($1, $2::date, $3, $4)
       ON CONFLICT (user_id, log_date) DO UPDATE SET
         worked_on_something_else = EXCLUDED.worked_on_something_else,
         description = EXCLUDED.description,
         updated_at = NOW()`,
      [actor.id, body.logDate, body.workedOnSomethingElse, body.description]
    );

    return { ok: true };
  },
};
