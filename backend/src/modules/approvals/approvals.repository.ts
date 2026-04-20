import type { PoolClient } from "pg";
import { pool } from "../../db/pool.js";
import type { OzalitApprovalKind, OzalitApprovalStatus } from "../../types/domain.js";

export type OzalitRoundRow = {
  id: string;
  project_id: string;
  round_number: number;
  is_current: boolean;
  superseded_at: string | null;
  created_at: string;
};

export type OzalitApprovalRow = {
  id: string;
  round_id: string;
  kind: OzalitApprovalKind;
  target_user_id: string;
  status: OzalitApprovalStatus;
  acted_by: string | null;
  acted_at: string | null;
  note: string | null;
  created_at: string;
};

export const approvalsRepository = {
  async getCurrentRound(
    projectId: string,
    client?: PoolClient
  ): Promise<OzalitRoundRow | null> {
    const run = client ?? pool;
    const r = await run.query<OzalitRoundRow>(
      `SELECT id, project_id, round_number, is_current, superseded_at::text, created_at
       FROM ozalit_approval_rounds WHERE project_id = $1 AND is_current = TRUE`,
      [projectId]
    );
    return r.rows[0] ?? null;
  },

  async maxRoundNumber(projectId: string, client?: PoolClient): Promise<number> {
    const run = client ?? pool;
    const r = await run.query<{ m: string | null }>(
      `SELECT MAX(round_number)::text AS m FROM ozalit_approval_rounds WHERE project_id = $1`,
      [projectId]
    );
    return r.rows[0]?.m ? Number(r.rows[0].m) : 0;
  },

  async supersedeCurrentRound(projectId: string, client?: PoolClient): Promise<void> {
    const run = client ?? pool;
    await run.query(
      `UPDATE ozalit_approval_rounds
       SET is_current = FALSE, superseded_at = NOW()
       WHERE project_id = $1 AND is_current = TRUE`,
      [projectId]
    );
  },

  async createRound(
    projectId: string,
    roundNumber: number,
    client?: PoolClient
  ): Promise<OzalitRoundRow> {
    const run = client ?? pool;
    const r = await run.query<OzalitRoundRow>(
      `INSERT INTO ozalit_approval_rounds (project_id, round_number, is_current)
       VALUES ($1, $2, TRUE)
       RETURNING id, project_id, round_number, is_current, superseded_at::text, created_at`,
      [projectId, roundNumber]
    );
    return r.rows[0];
  },

  async insertApproval(
    input: {
      roundId: string;
      kind: OzalitApprovalKind;
      targetUserId: string;
    },
    client?: PoolClient
  ): Promise<OzalitApprovalRow> {
    const run = client ?? pool;
    const r = await run.query<OzalitApprovalRow>(
      `INSERT INTO ozalit_approvals (round_id, kind, target_user_id, status)
       VALUES ($1, $2::ozalit_approval_kind, $3, 'pending')
       RETURNING id, round_id, kind::text AS kind, target_user_id, status::text AS status,
                 acted_by, acted_at::text, note, created_at`,
      [input.roundId, input.kind, input.targetUserId]
    );
    return r.rows[0];
  },

  async listApprovalsForRound(roundId: string, client?: PoolClient): Promise<OzalitApprovalRow[]> {
    const run = client ?? pool;
    const r = await run.query<OzalitApprovalRow>(
      `SELECT id, round_id, kind::text AS kind, target_user_id, status::text AS status,
              acted_by, acted_at::text, note, created_at
       FROM ozalit_approvals WHERE round_id = $1 ORDER BY kind`,
      [roundId]
    );
    return r.rows;
  },

  async findRoundById(roundId: string, client?: PoolClient): Promise<OzalitRoundRow | null> {
    const run = client ?? pool;
    const r = await run.query<OzalitRoundRow>(
      `SELECT id, project_id, round_number, is_current, superseded_at::text, created_at
       FROM ozalit_approval_rounds WHERE id = $1`,
      [roundId]
    );
    return r.rows[0] ?? null;
  },

  async findApprovalById(id: string): Promise<OzalitApprovalRow | null> {
    const r = await pool.query<OzalitApprovalRow>(
      `SELECT id, round_id, kind::text AS kind, target_user_id, status::text AS status,
              acted_by, acted_at::text, note, created_at
       FROM ozalit_approvals WHERE id = $1`,
      [id]
    );
    return r.rows[0] ?? null;
  },

  async updateApprovalDecision(
    id: string,
    input: {
      status: OzalitApprovalStatus;
      actedBy: string;
      note: string | null;
    },
    client?: PoolClient
  ): Promise<OzalitApprovalRow | null> {
    const run = client ?? pool;
    const r = await run.query<OzalitApprovalRow>(
      `UPDATE ozalit_approvals
       SET status = $1::ozalit_approval_status, acted_by = $2, acted_at = NOW(), note = $3
       WHERE id = $4
       RETURNING id, round_id, kind::text AS kind, target_user_id, status::text AS status,
                 acted_by, acted_at::text, note, created_at`,
      [input.status, input.actedBy, input.note, id]
    );
    return r.rows[0] ?? null;
  },

  /**
   * Üretim gate: exactly three approval rows (TL, designer approver, printer), all approved.
   * Empty or partial rounds must not pass.
   */
  async allApprovedInRound(roundId: string, client?: PoolClient): Promise<boolean> {
    const run = client ?? pool;
    const r = await run.query<{ total: string; approved: string }>(
      `SELECT
        COUNT(*)::text AS total,
        COUNT(*) FILTER (WHERE status = 'approved')::text AS approved
       FROM ozalit_approvals
       WHERE round_id = $1`,
      [roundId]
    );
    const total = Number(r.rows[0]?.total ?? 0);
    const approved = Number(r.rows[0]?.approved ?? 0);
    return total === 3 && approved === 3;
  },

  async anyRejectedInRound(roundId: string, client?: PoolClient): Promise<boolean> {
    const run = client ?? pool;
    const r = await run.query<{ c: string }>(
      `SELECT COUNT(*)::text AS c FROM ozalit_approvals
       WHERE round_id = $1 AND status = 'rejected'`,
      [roundId]
    );
    return Number(r.rows[0]?.c ?? 0) > 0;
  },
};
