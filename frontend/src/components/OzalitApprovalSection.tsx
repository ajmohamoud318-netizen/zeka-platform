import { useEffect, useState } from "react";
import type { OzalitApproval } from "../types";
import type { ApiClient } from "../api/client";

type State =
  | { loading: true }
  | {
      loading: false;
      approvals: OzalitApproval[];
      round: { id: string; round_number: number } | null;
    };

export function OzalitApprovalSection({
  projectId,
  api,
  currentUserId,
  canAct,
  onRefreshProject,
}: {
  projectId: string;
  api: ApiClient;
  currentUserId: string;
  /** show decision controls for rows where target is current user */
  canAct: boolean;
  onRefreshProject: () => void;
}) {
  const [state, setState] = useState<State>({ loading: true });

  const load = async () => {
    setState({ loading: true });
    try {
      const r = await api.get<{
        round: { id: string; round_number: number } | null;
        approvals: OzalitApproval[];
      }>(`/api/approvals/projects/${projectId}`);
      setState({ loading: false, approvals: r.approvals, round: r.round });
    } catch {
      setState({ loading: false, approvals: [], round: null });
    }
  };

  useEffect(() => {
    void load();
  }, [projectId]);

  const decide = async (approvalId: string, decision: "approved" | "rejected", note: string) => {
    await api.post(`/api/approvals/${approvalId}/decisions`, { decision, note: note || null });
    await load();
    onRefreshProject();
  };

  if (state.loading) {
    return <p className="text-sm text-slate-500">Loading approvals…</p>;
  }

  if (!state.round) {
    return <p className="text-sm text-amber-600">No active Ozalit round yet.</p>;
  }

  const rejected = state.approvals.find((a) => a.status === "rejected");

  return (
    <div className="space-y-3 rounded-lg border border-amber-900/50 bg-amber-950/20 p-3">
      <div className="text-sm font-medium text-amber-200">
        Ozalit approvals — round {state.round.round_number}
      </div>
      {rejected ? (
        <div className="rounded border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm text-red-200">
          Rejected: approval needs a new round or move back to Demo (team leader).
          {rejected.note ? <div className="mt-1 text-xs opacity-90">Note: {rejected.note}</div> : null}
        </div>
      ) : null}
      <ul className="space-y-2">
        {state.approvals.map((a) => (
          <li
            key={a.id}
            className="flex flex-col gap-2 rounded border border-slate-800 bg-slate-900/60 p-2 text-sm"
          >
            <div className="flex justify-between gap-2">
              <span className="text-slate-300">{kindLabel(a.kind)}</span>
              <span
                className={
                  a.status === "approved"
                    ? "text-emerald-400"
                    : a.status === "rejected"
                      ? "text-red-400"
                      : "text-slate-500"
                }
              >
                {a.status}
              </span>
            </div>
            {a.status === "pending" && canAct && a.target_user_id === currentUserId ? (
              <DecisionForm onSubmit={(d, n) => void decide(a.id, d, n)} />
            ) : null}
            {a.note && a.status !== "pending" ? (
              <div className="text-xs text-slate-500">Note: {a.note}</div>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

function kindLabel(k: OzalitApproval["kind"]) {
  switch (k) {
    case "team_leader":
      return "Team Leader";
    case "designer_approver":
      return "Designer approver";
    case "printer":
      return "Printer";
    default:
      return k;
  }
}

function DecisionForm({ onSubmit }: { onSubmit: (d: "approved" | "rejected", note: string) => void }) {
  const [note, setNote] = useState("");
  return (
    <div className="flex flex-wrap gap-2">
      <input
        className="min-w-[120px] flex-1 rounded border border-slate-700 bg-slate-950 px-2 py-1 text-xs"
        placeholder="Note (optional)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
      <button
        type="button"
        className="rounded bg-emerald-700 px-2 py-1 text-xs text-white hover:bg-emerald-600"
        onClick={() => onSubmit("approved", note)}
      >
        Approve
      </button>
      <button
        type="button"
        className="rounded bg-red-900 px-2 py-1 text-xs text-white hover:bg-red-800"
        onClick={() => onSubmit("rejected", note)}
      >
        Reject
      </button>
    </div>
  );
}
