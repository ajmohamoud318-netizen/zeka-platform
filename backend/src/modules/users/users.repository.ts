import type { PoolClient } from "pg";
import { pool } from "../../db/pool.js";
import type { DbUser, UserRole } from "../../types/domain.js";

export const usersRepository = {
  async findByClerkId(clerkId: string): Promise<DbUser | null> {
    const r = await pool.query<DbUser>(
      `SELECT id, clerk_id, email, full_name, role::text AS role, is_active, can_approve_ozalit, created_at, updated_at
       FROM users WHERE clerk_id = $1`,
      [clerkId]
    );
    return r.rows[0] ?? null;
  },

  async findById(id: string): Promise<DbUser | null> {
    const r = await pool.query<DbUser>(
      `SELECT id, clerk_id, email, full_name, role::text AS role, is_active, can_approve_ozalit, created_at, updated_at
       FROM users WHERE id = $1`,
      [id]
    );
    return r.rows[0] ?? null;
  },

  async findByEmail(email: string): Promise<DbUser | null> {
    const r = await pool.query<DbUser>(
      `SELECT id, clerk_id, email, full_name, role::text AS role, is_active, can_approve_ozalit, created_at, updated_at
       FROM users WHERE lower(email) = lower($1)`,
      [email]
    );
    return r.rows[0] ?? null;
  },

  async listAll(): Promise<DbUser[]> {
    const r = await pool.query<DbUser>(
      `SELECT id, clerk_id, email, full_name, role::text AS role, is_active, can_approve_ozalit, created_at, updated_at
       FROM users ORDER BY full_name ASC`
    );
    return r.rows;
  },

  async create(
    input: {
      clerkId: string;
      email: string;
      fullName: string;
      role: UserRole;
      canApproveOzalit: boolean;
      isActive: boolean;
    },
    client?: PoolClient
  ): Promise<DbUser> {
    const run = client ?? pool;
    const r = await run.query<DbUser>(
      `INSERT INTO users (clerk_id, email, full_name, role, can_approve_ozalit, is_active)
       VALUES ($1, $2, $3, $4::user_role, $5, $6)
       RETURNING id, clerk_id, email, full_name, role::text AS role, is_active, can_approve_ozalit, created_at, updated_at`,
      [
        input.clerkId,
        input.email,
        input.fullName,
        input.role,
        input.canApproveOzalit,
        input.isActive,
      ]
    );
    return r.rows[0];
  },

  async update(
    id: string,
    patch: {
      email?: string;
      fullName?: string;
      role?: UserRole;
      isActive?: boolean;
      canApproveOzalit?: boolean;
    },
    client?: PoolClient
  ): Promise<DbUser | null> {
    const run = client ?? pool;
    const cols: string[] = [];
    const vals: unknown[] = [];
    let n = 1;

    if (patch.email !== undefined) {
      cols.push(`email = $${n++}`);
      vals.push(patch.email);
    }
    if (patch.fullName !== undefined) {
      cols.push(`full_name = $${n++}`);
      vals.push(patch.fullName);
    }
    if (patch.role !== undefined) {
      cols.push(`role = $${n++}::user_role`);
      vals.push(patch.role);
    }
    if (patch.isActive !== undefined) {
      cols.push(`is_active = $${n++}`);
      vals.push(patch.isActive);
    }
    if (patch.canApproveOzalit !== undefined) {
      cols.push(`can_approve_ozalit = $${n++}`);
      vals.push(patch.canApproveOzalit);
    }

    if (cols.length === 0) {
      return this.findById(id);
    }

    cols.push(`updated_at = NOW()`);
    vals.push(id);

    const r = await run.query<DbUser>(
      `UPDATE users SET ${cols.join(", ")} WHERE id = $${n}
       RETURNING id, clerk_id, email, full_name, role::text AS role, is_active, can_approve_ozalit, created_at, updated_at`,
      vals
    );
    return r.rows[0] ?? null;
  },
};
