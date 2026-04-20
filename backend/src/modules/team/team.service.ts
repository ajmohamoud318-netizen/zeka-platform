import { z } from "zod";
import { AppError, assert } from "../../lib/errors.js";
import { getClerkClient } from "../../lib/clerk.js";
import type { DbUser, UserRole } from "../../types/domain.js";
import { usersRepository } from "../users/users.repository.js";

const createSchema = z.object({
  clerkId: z.string().min(1),
  email: z.string().email(),
  fullName: z.string().min(1),
  role: z.enum(["team_leader", "designer", "manager"]),
  canApproveOzalit: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

const updateSchema = z.object({
  email: z.string().email().optional(),
  fullName: z.string().min(1).optional(),
  role: z.enum(["team_leader", "designer", "manager"]).optional(),
  canApproveOzalit: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

const inviteSchema = z.object({
  email: z.string().email(),
  fullName: z.string().min(1),
  role: z.enum(["team_leader", "designer", "manager"]),
  canApproveOzalit: z.boolean().optional(),
});

function formatClerkInviteError(e: unknown): string {
  if (e && typeof e === "object" && "clerkError" in e && (e as { clerkError?: boolean }).clerkError) {
    const ce = e as {
      message?: string;
      errors?: Array<{ message?: string; long_message?: string; code?: string }>;
    };
    const parts = (ce.errors ?? [])
      .map((x) => x.long_message ?? x.message)
      .filter(Boolean);
    if (parts.length > 0) {
      return parts.join(" ");
    }
    return ce.message ?? "Unknown Clerk API error";
  }
  if (e instanceof Error) {
    return e.message;
  }
  return String(e);
}

export const teamService = {
  async listUsers(): Promise<DbUser[]> {
    return usersRepository.listAll();
  },

  async createUser(actor: DbUser, raw: unknown): Promise<DbUser> {
    assert(actor.role === "team_leader", 403, "Only team leaders can create users");
    const body = createSchema.parse(raw);
    const existing = await usersRepository.findByClerkId(body.clerkId);
    if (existing) {
      throw new AppError(409, "A user with this Clerk ID already exists", "CLERK_ID_TAKEN");
    }
    const emailTaken = await usersRepository.findByEmail(body.email);
    if (emailTaken) {
      throw new AppError(409, "A user with this email already exists", "EMAIL_TAKEN");
    }
    const canApprove =
      body.role === "designer" ? (body.canApproveOzalit ?? false) : false;
    return usersRepository.create({
      clerkId: body.clerkId,
      email: body.email,
      fullName: body.fullName,
      role: body.role as UserRole,
      canApproveOzalit: canApprove,
      isActive: body.isActive ?? true,
    });
  },

  async inviteUser(actor: DbUser, raw: unknown): Promise<void> {
    assert(actor.role === "team_leader", 403, "Only team leaders can send invites");
    const body = inviteSchema.parse(raw);
    const normalizedEmail = body.email.trim().toLowerCase();
    const existing = await usersRepository.findByEmail(normalizedEmail);
    if (existing) {
      throw new AppError(409, "A user with this email already exists in the app", "EMAIL_TAKEN");
    }
    const origin = process.env.FRONTEND_ORIGIN;
    if (!origin) {
      throw new AppError(500, "FRONTEND_ORIGIN is not configured");
    }
    const base = origin.replace(/\/$/, "");
    const clerk = getClerkClient();
    try {
      await clerk.invitations.createInvitation({
        emailAddress: normalizedEmail,
        redirectUrl: `${base}/`,
        publicMetadata: {
          zeka_role: body.role,
          zeka_full_name: body.fullName,
          zeka_can_approve_ozalit: body.role === "designer" ? (body.canApproveOzalit ?? false) : false,
        },
        notify: true,
      });
    } catch (e) {
      const detail = formatClerkInviteError(e);
      console.error("[team invite]", e);
      throw new AppError(502, `Clerk invitation failed: ${detail}`, "CLERK_INVITE_FAILED");
    }
  },

  async updateUser(actor: DbUser, userId: string, raw: unknown): Promise<DbUser> {
    assert(actor.role === "team_leader", 403, "Only team leaders can update users");
    const body = updateSchema.parse(raw);
    const existing = await usersRepository.findById(userId);
    if (!existing) {
      throw new AppError(404, "User not found");
    }

    if (body.email !== undefined && body.email.toLowerCase() !== existing.email.toLowerCase()) {
      const emailTaken = await usersRepository.findByEmail(body.email);
      if (emailTaken && emailTaken.id !== userId) {
        throw new AppError(409, "A user with this email already exists", "EMAIL_TAKEN");
      }
    }

    const mergedRole = (body.role ?? existing.role) as UserRole;
    if (body.canApproveOzalit === true && mergedRole !== "designer") {
      throw new AppError(400, "can_approve_ozalit applies only to designers");
    }

    const mustClearOzalitApproval =
      mergedRole !== "designer" && existing.can_approve_ozalit === true;
    let canApprovePatch: boolean | undefined;
    if (mergedRole === "designer" && body.canApproveOzalit !== undefined) {
      canApprovePatch = body.canApproveOzalit;
    } else if (mustClearOzalitApproval) {
      canApprovePatch = false;
    }

    const u = await usersRepository.update(userId, {
      email: body.email,
      fullName: body.fullName,
      role: body.role as UserRole | undefined,
      isActive: body.isActive,
      canApproveOzalit: canApprovePatch,
    });
    if (!u) {
      throw new AppError(404, "User not found");
    }
    return u;
  },
};
