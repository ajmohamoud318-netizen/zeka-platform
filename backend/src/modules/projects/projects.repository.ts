import type { PoolClient } from "pg";
import { pool } from "../../db/pool.js";
import type { ProjectStatus } from "../../types/domain.js";

export type ProjectRow = {
  id: string;
  name: string;
  short_description: string;
  print_house: string;
  start_date: string | null;
  total_page_count: number;
  has_kapak: boolean;
  has_kutu: boolean;
  has_medya: boolean;
  status: ProjectStatus;
  team_leader_id: string;
  designer_approver_id: string | null;
  printer_user_id: string | null;
  completed_page_count: number;
  kapak_complete: boolean;
  kutu_complete: boolean;
  medya_complete: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  designer_ids?: string[];
};

export const projectsRepository = {
  async listAll(): Promise<ProjectRow[]> {
    const r = await pool.query<
      ProjectRow & { designer_ids: string[] | null }
    >(
      `SELECT p.id, p.name, p.short_description, p.print_house, p.start_date::text, p.total_page_count,
              p.has_kapak, p.has_kutu, p.has_medya, p.status::text AS status,
              p.team_leader_id, p.designer_approver_id, p.printer_user_id,
              p.completed_page_count, p.kapak_complete, p.kutu_complete, p.medya_complete,
              p.created_by, p.created_at, p.updated_at,
              COALESCE(array_agg(pd.user_id) FILTER (WHERE pd.user_id IS NOT NULL), ARRAY[]::uuid[]) AS designer_ids
       FROM projects p
       LEFT JOIN project_designers pd ON pd.project_id = p.id
       GROUP BY p.id
       ORDER BY p.created_at DESC`
    );
    return r.rows.map(({ designer_ids, ...p }) => ({
      ...p,
      designer_ids: designer_ids ?? [],
    }));
  },

  async findById(id: string, client?: PoolClient): Promise<ProjectRow | null> {
    const run = client ?? pool;
    const r = await run.query<ProjectRow>(
      `SELECT id, name, short_description, print_house, start_date::text, total_page_count,
              has_kapak, has_kutu, has_medya, status::text AS status,
              team_leader_id, designer_approver_id, printer_user_id,
              completed_page_count, kapak_complete, kutu_complete, medya_complete,
              created_by, created_at, updated_at
       FROM projects WHERE id = $1`,
      [id]
    );
    return r.rows[0] ?? null;
  },

  async countDesigners(projectId: string, client?: PoolClient): Promise<number> {
    const run = client ?? pool;
    const r = await run.query<{ c: string }>(
      `SELECT COUNT(*)::text AS c FROM project_designers WHERE project_id = $1`,
      [projectId]
    );
    return Number(r.rows[0]?.c ?? 0);
  },

  async isDesignerOnProject(projectId: string, userId: string): Promise<boolean> {
    const r = await pool.query(
      `SELECT 1 FROM project_designers WHERE project_id = $1 AND user_id = $2`,
      [projectId, userId]
    );
    return r.rowCount !== null && r.rowCount > 0;
  },

  async listDesignerIds(projectId: string): Promise<string[]> {
    const r = await pool.query<{ user_id: string }>(
      `SELECT user_id FROM project_designers WHERE project_id = $1`,
      [projectId]
    );
    return r.rows.map((x) => x.user_id);
  },

  async insert(
    input: {
      name: string;
      shortDescription: string;
      printHouse: string;
      startDate: string | null;
      totalPageCount: number;
      hasKapak: boolean;
      hasKutu: boolean;
      hasMedya: boolean;
      teamLeaderId: string;
      createdBy: string;
    },
    client?: PoolClient
  ): Promise<ProjectRow> {
    const run = client ?? pool;
    const r = await run.query<ProjectRow>(
      `INSERT INTO projects (
        name, short_description, print_house, start_date, total_page_count,
        has_kapak, has_kutu, has_medya, status, team_leader_id, created_by
      ) VALUES (
        $1, $2, $3, $4::date, $5, $6, $7, $8, 'new', $9, $10
      )
      RETURNING id, name, short_description, print_house, start_date::text, total_page_count,
                has_kapak, has_kutu, has_medya, status::text AS status,
                team_leader_id, designer_approver_id, printer_user_id,
                completed_page_count, kapak_complete, kutu_complete, medya_complete,
                created_by, created_at, updated_at`,
      [
        input.name,
        input.shortDescription,
        input.printHouse,
        input.startDate,
        input.totalPageCount,
        input.hasKapak,
        input.hasKutu,
        input.hasMedya,
        input.teamLeaderId,
        input.createdBy,
      ]
    );
    return r.rows[0];
  },

  async updateCore(
    id: string,
    patch: {
      name?: string;
      shortDescription?: string;
      printHouse?: string;
      startDate?: string | null;
      totalPageCount?: number;
      hasKapak?: boolean;
      hasKutu?: boolean;
      hasMedya?: boolean;
      designerApproverId?: string | null;
      printerUserId?: string | null;
    },
    client?: PoolClient
  ): Promise<ProjectRow | null> {
    const run = client ?? pool;
    const cols: string[] = [];
    const vals: unknown[] = [];
    let n = 1;

    if (patch.name !== undefined) {
      cols.push(`name = $${n++}`);
      vals.push(patch.name);
    }
    if (patch.shortDescription !== undefined) {
      cols.push(`short_description = $${n++}`);
      vals.push(patch.shortDescription);
    }
    if (patch.printHouse !== undefined) {
      cols.push(`print_house = $${n++}`);
      vals.push(patch.printHouse);
    }
    if (patch.startDate !== undefined) {
      cols.push(`start_date = $${n++}::date`);
      vals.push(patch.startDate);
    }
    if (patch.totalPageCount !== undefined) {
      cols.push(`total_page_count = $${n++}`);
      vals.push(patch.totalPageCount);
    }
    if (patch.hasKapak !== undefined) {
      cols.push(`has_kapak = $${n++}`);
      vals.push(patch.hasKapak);
    }
    if (patch.hasKutu !== undefined) {
      cols.push(`has_kutu = $${n++}`);
      vals.push(patch.hasKutu);
    }
    if (patch.hasMedya !== undefined) {
      cols.push(`has_medya = $${n++}`);
      vals.push(patch.hasMedya);
    }
    if (patch.designerApproverId !== undefined) {
      cols.push(`designer_approver_id = $${n++}`);
      vals.push(patch.designerApproverId);
    }
    if (patch.printerUserId !== undefined) {
      cols.push(`printer_user_id = $${n++}`);
      vals.push(patch.printerUserId);
    }

    if (cols.length === 0) {
      return this.findById(id, client);
    }

    cols.push(`updated_at = NOW()`);
    vals.push(id);

    const r = await run.query<ProjectRow>(
      `UPDATE projects SET ${cols.join(", ")} WHERE id = $${n}
       RETURNING id, name, short_description, print_house, start_date::text, total_page_count,
                 has_kapak, has_kutu, has_medya, status::text AS status,
                 team_leader_id, designer_approver_id, printer_user_id,
                 completed_page_count, kapak_complete, kutu_complete, medya_complete,
                 created_by, created_at, updated_at`,
      vals
    );
    return r.rows[0] ?? null;
  },

  async updateProgress(
    id: string,
    patch: {
      completedPageCount?: number;
      kapakComplete?: boolean;
      kutuComplete?: boolean;
      medyaComplete?: boolean;
    },
    client?: PoolClient
  ): Promise<ProjectRow | null> {
    const run = client ?? pool;
    const cols: string[] = [];
    const vals: unknown[] = [];
    let n = 1;

    if (patch.completedPageCount !== undefined) {
      cols.push(`completed_page_count = $${n++}`);
      vals.push(patch.completedPageCount);
    }
    if (patch.kapakComplete !== undefined) {
      cols.push(`kapak_complete = $${n++}`);
      vals.push(patch.kapakComplete);
    }
    if (patch.kutuComplete !== undefined) {
      cols.push(`kutu_complete = $${n++}`);
      vals.push(patch.kutuComplete);
    }
    if (patch.medyaComplete !== undefined) {
      cols.push(`medya_complete = $${n++}`);
      vals.push(patch.medyaComplete);
    }

    if (cols.length === 0) {
      return this.findById(id, client);
    }

    cols.push(`updated_at = NOW()`);
    vals.push(id);

    const r = await run.query<ProjectRow>(
      `UPDATE projects SET ${cols.join(", ")} WHERE id = $${n}
       RETURNING id, name, short_description, print_house, start_date::text, total_page_count,
                 has_kapak, has_kutu, has_medya, status::text AS status,
                 team_leader_id, designer_approver_id, printer_user_id,
                 completed_page_count, kapak_complete, kutu_complete, medya_complete,
                 created_by, created_at, updated_at`,
      vals
    );
    return r.rows[0] ?? null;
  },

  async setStatus(
    id: string,
    status: ProjectStatus,
    client?: PoolClient
  ): Promise<ProjectRow | null> {
    const run = client ?? pool;
    const r = await run.query<ProjectRow>(
      `UPDATE projects SET status = $1::project_status, updated_at = NOW() WHERE id = $2
       RETURNING id, name, short_description, print_house, start_date::text, total_page_count,
                 has_kapak, has_kutu, has_medya, status::text AS status,
                 team_leader_id, designer_approver_id, printer_user_id,
                 completed_page_count, kapak_complete, kutu_complete, medya_complete,
                 created_by, created_at, updated_at`,
      [status, id]
    );
    return r.rows[0] ?? null;
  },

  async addDesigner(projectId: string, userId: string, client?: PoolClient): Promise<void> {
    const run = client ?? pool;
    await run.query(
      `INSERT INTO project_designers (project_id, user_id) VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [projectId, userId]
    );
  },

  async removeDesigner(projectId: string, userId: string, client?: PoolClient): Promise<void> {
    const run = client ?? pool;
    await run.query(`DELETE FROM project_designers WHERE project_id = $1 AND user_id = $2`, [
      projectId,
      userId,
    ]);
  },

  async appendStatusHistory(
    input: {
      projectId: string;
      fromStatus: ProjectStatus | null;
      toStatus: ProjectStatus;
      changedBy: string;
      note?: string | null;
    },
    client?: PoolClient
  ): Promise<void> {
    const run = client ?? pool;
    await run.query(
      `INSERT INTO project_status_history (project_id, from_status, to_status, changed_by, note)
       VALUES ($1, $2::project_status, $3::project_status, $4, $5)`,
      [
        input.projectId,
        input.fromStatus,
        input.toStatus,
        input.changedBy,
        input.note ?? null,
      ]
    );
  },

  async appendProgressLog(
    input: {
      projectId: string;
      userId: string;
      fieldName: string;
      oldValue: string | null;
      newValue: string | null;
    },
    client?: PoolClient
  ): Promise<void> {
    const run = client ?? pool;
    await run.query(
      `INSERT INTO project_progress_logs (project_id, user_id, field_name, old_value, new_value)
       VALUES ($1, $2, $3, $4, $5)`,
      [input.projectId, input.userId, input.fieldName, input.oldValue, input.newValue]
    );
  },
};
