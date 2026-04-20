import type { NextFunction, Request, Response } from "express";
import { verifyToken } from "@clerk/backend";
import type { DbUser } from "../types/domain.js";
import { pool } from "../db/pool.js";
import { AppError } from "../lib/errors.js";

export type AuthedRequest = Request & {
  clerkUserId?: string;
  dbUser?: DbUser;
};

async function loadUserByClerkId(clerkId: string): Promise<DbUser | null> {
  const r = await pool.query<DbUser>(
    `SELECT id, clerk_id, email, full_name, role::text AS role, is_active, can_approve_ozalit, created_at, updated_at
     FROM users WHERE clerk_id = $1`,
    [clerkId]
  );
  return r.rows[0] ?? null;
}

export async function clerkAuth(
  req: AuthedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      throw new AppError(401, "Missing bearer token");
    }
    const token = header.slice("Bearer ".length);
    const secretKey = process.env.CLERK_SECRET_KEY;
    if (!secretKey) {
      throw new AppError(500, "CLERK_SECRET_KEY is not configured");
    }

    const payload = await verifyToken(token, { secretKey });
    const sub = payload.sub;
    if (!sub) {
      throw new AppError(401, "Invalid token payload");
    }

    req.clerkUserId = sub;
    const dbUser = await loadUserByClerkId(sub);
    if (!dbUser) {
      throw new AppError(403, "User is not provisioned in the system", "USER_NOT_PROVISIONED");
    }
    if (!dbUser.is_active) {
      throw new AppError(403, "User account is deactivated", "USER_INACTIVE");
    }

    req.dbUser = dbUser;
    next();
  } catch (e) {
    if (e instanceof AppError) {
      res.status(e.statusCode).json({ error: e.message, code: e.code });
      return;
    }
    console.error("[clerkAuth] verifyToken failed — check CLERK_SECRET_KEY matches the same Clerk app as VITE_CLERK_PUBLISHABLE_KEY:", e);
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

export function requireRoles(...roles: DbUser["role"][]) {
  return (req: AuthedRequest, res: Response, next: NextFunction): void => {
    const u = req.dbUser;
    if (!u) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    if (!roles.includes(u.role)) {
      res.status(403).json({ error: "Insufficient permissions" });
      return;
    }
    next();
  };
}

/** Team leader or designer (not manager-only read elsewhere) */
export function forbidManagerWrite(req: AuthedRequest, res: Response, next: NextFunction): void {
  if (req.dbUser?.role === "manager") {
    res.status(403).json({ error: "Managers are read-only" });
    return;
  }
  next();
}
