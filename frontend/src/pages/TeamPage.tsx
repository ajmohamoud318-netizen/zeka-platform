import { useEffect, useRef, useState } from "react";
import { useApi } from "../hooks/useApi";
import { useMe } from "../context/MeContext";
import type { DbUser, UserRole } from "../types";

export function TeamPage() {
  const api = useApi();
  const { me } = useMe();
  const [users, setUsers] = useState<DbUser[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [msgTone, setMsgTone] = useState<"ok" | "err">("ok");
  const [inviteSubmitting, setInviteSubmitting] = useState(false);
  const msgRef = useRef<HTMLParagraphElement>(null);

  const load = async () => {
    const r = await api.get<{ users: DbUser[] }>("/api/team/users");
    setUsers(r.users);
  };

  useEffect(() => {
    void load();
  }, [api]);

  if (me.status !== "ready") {
    return null;
  }

  const canEdit = me.user.role === "team_leader";

  const inviteUser = async (form: FormData) => {
    setInviteSubmitting(true);
    setMsg(null);
    const email = String(form.get("email") ?? "");
    const fullName = String(form.get("inviteFullName") ?? "");
    const role = String(form.get("inviteRole") ?? "designer") as UserRole;
    const canApprove = form.get("inviteCanApprove") === "on";
    try {
      await api.post("/api/team/invitations", {
        email,
        fullName,
        role,
        canApproveOzalit: role === "designer" ? canApprove : false,
      });
      setMsgTone("ok");
      setMsg(
        `Clerk recorded the invitation; the invitee should get an email (check spam). In Clerk → Configure → Paths, allow redirect URL: ${window.location.origin}/ — if this is missing, invitations fail or behave oddly. For auto-creating users in the database, set up POST /api/webhooks/clerk and CLERK_WEBHOOK_SIGNING_SECRET.`
      );
    } catch (e) {
      setMsgTone("err");
      setMsg((e as Error).message);
    } finally {
      setInviteSubmitting(false);
    }
  };

  const createUser = async (form: FormData) => {
    setMsg(null);
    setMsgTone("ok");
    const clerkId = String(form.get("clerkId") ?? "");
    const email = String(form.get("email") ?? "");
    const fullName = String(form.get("fullName") ?? "");
    const role = String(form.get("role") ?? "designer") as UserRole;
    const canApprove = form.get("canApprove") === "on";
    try {
      await api.post("/api/team/users", {
        clerkId,
        email,
        fullName,
        role,
        canApproveOzalit: role === "designer" ? canApprove : false,
      });
      setMsgTone("ok");
      setMsg("User created.");
      await load();
    } catch (e) {
      setMsgTone("err");
      setMsg((e as Error).message);
    }
  };

  useEffect(() => {
    if (msg) {
      msgRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [msg]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Team</h1>
        <p className="text-sm text-slate-500">
          {canEdit
            ? "Invite by email (Clerk sends the message), or add someone who already has a Clerk account using their user id."
            : "Directory (read-only)."}
        </p>
      </div>

      {canEdit ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void inviteUser(new FormData(e.currentTarget));
          }}
          className="space-y-3 rounded-lg border border-slate-800 bg-slate-900/40 p-4"
        >
          <div className="text-sm font-medium text-slate-300">Invite by email</div>
          <p className="text-xs text-slate-500">
            Sends a Clerk invitation to their inbox. Configure <code className="text-slate-400">POST /api/webhooks/clerk</code> in
            Clerk with <code className="text-slate-400">CLERK_WEBHOOK_SIGNING_SECRET</code> on the server so new accounts are
            provisioned automatically.
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            <input
              name="email"
              type="email"
              required
              placeholder="Email"
              autoComplete="email"
              className="rounded border border-slate-700 bg-slate-950 px-2 py-1 text-sm"
            />
            <input
              name="inviteFullName"
              required
              placeholder="Full name"
              className="rounded border border-slate-700 bg-slate-950 px-2 py-1 text-sm"
            />
            <select name="inviteRole" className="rounded border border-slate-700 bg-slate-950 px-2 py-1 text-sm sm:col-span-2">
              <option value="designer">Designer</option>
              <option value="team_leader">Team leader</option>
              <option value="manager">Manager</option>
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input type="checkbox" name="inviteCanApprove" className="rounded border-slate-600" />
            Can approve Ozalit (designers)
          </label>
          <button
            type="submit"
            disabled={inviteSubmitting}
            className="rounded bg-violet-600 px-4 py-1.5 text-sm text-white hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {inviteSubmitting ? "Sending…" : "Send invitation"}
          </button>
        </form>
      ) : null}

      {canEdit ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void createUser(new FormData(e.currentTarget));
          }}
          className="space-y-3 rounded-lg border border-slate-800 bg-slate-900/40 p-4"
        >
          <div className="text-sm font-medium text-slate-300">Add existing Clerk user (manual)</div>
          <div className="grid gap-2 sm:grid-cols-2">
            <input
              name="clerkId"
              required
              placeholder="Clerk user id"
              className="rounded border border-slate-700 bg-slate-950 px-2 py-1 text-sm"
            />
            <input name="email" type="email" required placeholder="Email" className="rounded border border-slate-700 bg-slate-950 px-2 py-1 text-sm" />
            <input name="fullName" required placeholder="Full name" className="rounded border border-slate-700 bg-slate-950 px-2 py-1 text-sm" />
            <select name="role" className="rounded border border-slate-700 bg-slate-950 px-2 py-1 text-sm">
              <option value="designer">Designer</option>
              <option value="team_leader">Team leader</option>
              <option value="manager">Manager</option>
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input type="checkbox" name="canApprove" className="rounded border-slate-600" />
            Can approve Ozalit (designers)
          </label>
          <button type="submit" className="rounded bg-violet-600 px-4 py-1.5 text-sm text-white hover:bg-violet-500">
            Create
          </button>
        </form>
      ) : null}

      {msg ? (
        <p
          ref={msgRef}
          role="status"
          className={
            msgTone === "err"
              ? "rounded-md border border-red-900/80 bg-red-950/40 px-3 py-2 text-sm text-red-200"
              : "rounded-md border border-emerald-900/50 bg-emerald-950/30 px-3 py-2 text-sm text-emerald-100"
          }
        >
          {msg}
        </p>
      ) : null}

      <div className="overflow-hidden rounded-lg border border-slate-800">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-800 bg-slate-900/60 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Email</th>
              <th className="px-3 py-2">Role</th>
              <th className="px-3 py-2">Active</th>
              <th className="px-3 py-2">Ozalit OK</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {users.map((u) => (
              <tr key={u.id} className="text-slate-300">
                <td className="px-3 py-2">{u.full_name}</td>
                <td className="px-3 py-2 text-slate-500">{u.email}</td>
                <td className="px-3 py-2 capitalize">{u.role.replace("_", " ")}</td>
                <td className="px-3 py-2">{u.is_active ? "yes" : "no"}</td>
                <td className="px-3 py-2">{u.can_approve_ozalit ? "yes" : "no"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
