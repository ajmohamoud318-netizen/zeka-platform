import type { UserJSON } from "@clerk/backend";
import type { UserRole } from "../../types/domain.js";
import { usersRepository } from "../users/users.repository.js";

function primaryEmail(u: UserJSON): string | null {
  const list = u.email_addresses ?? [];
  const primary = list.find((e) => e.id === u.primary_email_address_id);
  return primary?.email_address ?? list[0]?.email_address ?? null;
}

function readInviteMetadata(data: UserJSON): {
  role: UserRole;
  fullName: string;
  canApproveOzalit: boolean;
} | null {
  const meta = data.public_metadata;
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) {
    return null;
  }
  const m = meta as Record<string, unknown>;
  const roleRaw = m.zeka_role;
  if (roleRaw === undefined || roleRaw === null) {
    return null;
  }
  const roleStr = String(roleRaw);
  if (roleStr !== "team_leader" && roleStr !== "designer" && roleStr !== "manager") {
    return null;
  }
  const fullMeta = m.zeka_full_name;
  const fromClerkName = [data.first_name, data.last_name].filter(Boolean).join(" ").trim();
  const fullName =
    typeof fullMeta === "string" && fullMeta.trim().length > 0
      ? fullMeta.trim()
      : fromClerkName.length > 0
        ? fromClerkName
        : "User";
  const canRaw = m.zeka_can_approve_ozalit;
  const canApprove =
    roleStr === "designer" ? canRaw === true || canRaw === "true" : false;
  return {
    role: roleStr,
    fullName,
    canApproveOzalit: canApprove,
  };
}

/** Called from Clerk webhooks when a user accepts an invite (metadata set on invitation). */
export async function provisionInvitedUserFromClerkUser(data: UserJSON): Promise<void> {
  const invite = readInviteMetadata(data);
  if (!invite) {
    return;
  }

  const clerkId = data.id;
  const email = primaryEmail(data);
  if (!email) {
    console.warn("[clerk provision] skipping user without email", clerkId);
    return;
  }

  const existingByClerk = await usersRepository.findByClerkId(clerkId);
  if (existingByClerk) {
    return;
  }

  const existingByEmail = await usersRepository.findByEmail(email);
  if (existingByEmail) {
    console.error(
      "[clerk provision] email already linked to another user; refusing auto-provision",
      email
    );
    return;
  }

  await usersRepository.create({
    clerkId,
    email: email.toLowerCase(),
    fullName: invite.fullName,
    role: invite.role,
    canApproveOzalit: invite.canApproveOzalit,
    isActive: true,
  });
}
