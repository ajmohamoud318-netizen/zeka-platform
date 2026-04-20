import { pool } from "../../db/pool.js";

export type FeedItem = {
  kind: "status_change" | "progress" | "daily_log";
  at: string;
  project_id: string | null;
  project_name: string | null;
  summary: string;
  actor_name: string | null;
};

export const activityRepository = {
  async listFeed(limit = 40): Promise<FeedItem[]> {
    const r = await pool.query<{
      kind: FeedItem["kind"];
      at: string;
      project_id: string | null;
      project_name: string | null;
      summary: string;
      actor_name: string | null;
    }>(
      `
      SELECT * FROM (
        SELECT 'status_change'::text AS kind,
               h.created_at AS at,
               h.project_id,
               p.name AS project_name,
               CASE WHEN h.from_status IS NULL THEN h.to_status::text
                    ELSE h.from_status::text || ' → ' || h.to_status::text END AS summary,
               u.full_name AS actor_name
        FROM project_status_history h
        JOIN users u ON u.id = h.changed_by
        JOIN projects p ON p.id = h.project_id

        UNION ALL

        SELECT 'progress'::text AS kind,
               l.created_at AS at,
               l.project_id,
               p.name AS project_name,
               l.field_name || ': ' || COALESCE(l.old_value, '') || ' → ' || COALESCE(l.new_value, '') AS summary,
               u.full_name AS actor_name
        FROM project_progress_logs l
        JOIN users u ON u.id = l.user_id
        JOIN projects p ON p.id = l.project_id

        UNION ALL

        SELECT 'daily_log'::text AS kind,
               GREATEST(d.updated_at, d.created_at) AS at,
               NULL::uuid AS project_id,
               NULL::text AS project_name,
               CASE WHEN d.worked_on_something_else THEN 'Other work: ' ELSE 'Log: ' END ||
                 COALESCE(NULLIF(TRIM(d.description), ''), '(no description)') AS summary,
               u.full_name AS actor_name
        FROM daily_work_logs d
        JOIN users u ON u.id = d.user_id
      ) feed
      ORDER BY at DESC
      LIMIT $1
      `,
      [limit]
    );
    return r.rows;
  },

  /** Status changes + page/component progress only (no daily designer logs) — for dashboard timeline. */
  async listProjectProgressTimeline(limit = 50): Promise<FeedItem[]> {
    const r = await pool.query<{
      kind: FeedItem["kind"];
      at: string;
      project_id: string | null;
      project_name: string | null;
      summary: string;
      actor_name: string | null;
    }>(
      `
      SELECT * FROM (
        SELECT 'status_change'::text AS kind,
               h.created_at AS at,
               h.project_id,
               p.name AS project_name,
               CASE WHEN h.from_status IS NULL THEN h.to_status::text
                    ELSE h.from_status::text || ' → ' || h.to_status::text END AS summary,
               u.full_name AS actor_name
        FROM project_status_history h
        JOIN users u ON u.id = h.changed_by
        JOIN projects p ON p.id = h.project_id

        UNION ALL

        SELECT 'progress'::text AS kind,
               l.created_at AS at,
               l.project_id,
               p.name AS project_name,
               l.field_name || ': ' || COALESCE(l.old_value, '') || ' → ' || COALESCE(l.new_value, '') AS summary,
               u.full_name AS actor_name
        FROM project_progress_logs l
        JOIN users u ON u.id = l.user_id
        JOIN projects p ON p.id = l.project_id
      ) feed
      ORDER BY at DESC
      LIMIT $1
      `,
      [limit]
    );
    return r.rows;
  },
};
