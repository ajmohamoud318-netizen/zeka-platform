import { useEffect, useState } from "react";
import type { DbUser, ProjectStatus, ProjectWithProgress } from "../types";
import { STATUS_LABELS, STATUS_ORDER } from "../types";
import type { ApiClient } from "../api/client";
import { ProgressSection } from "./ProgressSection";
import { OzalitApprovalSection } from "./OzalitApprovalSection";

export function ProjectDrawer({
  projectId,
  onClose,
  api,
  me,
}: {
  projectId: string | null;
  onClose: () => void;
  api: ApiClient;
  me: DbUser;
}) {
  const [data, setData] = useState<{
    project: ProjectWithProgress;
    designerIds: string[];
    progressPercent: number;
  } | null>(null);
  const [users, setUsers] = useState<DbUser[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    if (!projectId) return;
    setError(null);
    try {
      const r = await api.get<{
        project: ProjectWithProgress;
        designerIds: string[];
        progressPercent: number;
      }>(`/api/projects/${projectId}`);
      setData({
        project: { ...r.project, progressPercent: r.progressPercent },
        designerIds: r.designerIds,
        progressPercent: r.progressPercent,
      });
    } catch (e) {
      setError((e as Error).message);
    }
  };

  useEffect(() => {
    void load();
  }, [projectId]);

  useEffect(() => {
    if (me.role !== "team_leader") return;
    void api.get<{ users: DbUser[] }>("/api/team/users").then((r) => setUsers(r.users));
  }, [api, me.role]);

  if (!projectId) {
    return null;
  }

  const tl = me.role === "team_leader";
  const mgr = me.role === "manager";
  const designerOnProject =
    me.role === "designer" && !!data?.designerIds?.includes(me.id);
  const canEditProgress = tl || designerOnProject;

  const patchProject = async (body: Record<string, unknown>) => {
    try {
      setError(null);
      const r = await api.patch<{ project: ProjectWithProgress & { progressPercent?: number } }>(
        `/api/projects/${projectId}`,
        body
      );
      setData({
        project: { ...r.project, progressPercent: r.project.progressPercent ?? data?.progressPercent ?? 0 },
        designerIds: data?.designerIds ?? [],
        progressPercent: r.project.progressPercent ?? data?.progressPercent ?? 0,
      });
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const patchProgress = async (patch: {
    completedPageCount?: number;
    kapakComplete?: boolean;
    kutuComplete?: boolean;
    medyaComplete?: boolean;
  }) => {
    try {
      setError(null);
      const r = await api.patch<{ project: ProjectWithProgress & { progressPercent?: number } }>(
        `/api/projects/${projectId}/progress`,
        {
          completedPageCount: patch.completedPageCount,
          kapakComplete: patch.kapakComplete,
          kutuComplete: patch.kutuComplete,
          medyaComplete: patch.medyaComplete,
        }
      );
      setData({
        project: { ...r.project, progressPercent: r.project.progressPercent ?? 0 },
        designerIds: data?.designerIds ?? [],
        progressPercent: r.project.progressPercent ?? 0,
      });
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const changeStatus = async (status: ProjectStatus) => {
    try {
      setError(null);
      await api.patch(`/api/projects/${projectId}/status`, { status });
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const assignDesigner = async (userId: string) => {
    try {
      setError(null);
      await api.post(`/api/projects/${projectId}/designers`, { userId });
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const unassign = async (userId: string) => {
    try {
      setError(null);
      await api.delete(`/api/projects/${projectId}/designers/${userId}`);
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const requestOzalitAgain = async () => {
    try {
      setError(null);
      await api.post(`/api/approvals/projects/${projectId}/request-again`, {});
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/50">
      <button type="button" className="h-full flex-1 cursor-default" aria-label="Close" onClick={onClose} />
      <div className="h-full w-full max-w-lg overflow-y-auto border-l border-slate-800 bg-slate-950 shadow-xl">
        <div className="sticky top-0 flex items-center justify-between border-b border-slate-800 bg-slate-950/95 px-4 py-3 backdrop-blur">
          <h2 className="text-lg font-semibold text-white">Project</h2>
          <button type="button" className="text-slate-400 hover:text-white" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="space-y-4 p-4">
          {error ? <p className="text-sm text-red-400">{error}</p> : null}
          {!data ? <p className="text-sm text-slate-500">Loading…</p> : null}

          {data ? (
            <>
              <CoreFields
                project={data.project}
                readOnly={!tl || mgr}
                onSave={async (patch) => {
                  await patchProject(patch);
                  await load();
                }}
              />

              {tl ? (
                <div className="space-y-2 rounded-lg border border-slate-800 p-3">
                  <div className="text-sm font-medium text-slate-300">Status</div>
                  <StatusControl
                    current={data.project.status}
                    onChange={(s) => void changeStatus(s)}
                  />
                </div>
              ) : (
                <div className="text-sm text-slate-500">
                  Status: {STATUS_LABELS[data.project.status]}
                </div>
              )}

              {tl ? (
                <div className="space-y-2 rounded-lg border border-slate-800 p-3">
                  <div className="text-sm font-medium text-slate-300">Designers</div>
                  <ul className="text-sm text-slate-400">
                    {data.designerIds.map((id) => {
                      const u = users.find((x) => x.id === id);
                      return (
                        <li key={id} className="flex items-center justify-between py-1">
                          <span>{u?.full_name ?? id}</span>
                          <button
                            type="button"
                            className="text-xs text-red-400 hover:underline"
                            onClick={() => void unassign(id)}
                          >
                            Remove
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                  <DesignerPicker
                    users={users.filter((u) => u.role === "designer" && u.is_active)}
                    assigned={data.designerIds}
                    onAssign={(id) => void assignDesigner(id)}
                  />
                </div>
              ) : null}

              {tl ? (
                <div className="grid gap-2 rounded-lg border border-slate-800 p-3 text-sm">
                  <label className="block text-slate-400">
                    Designer approver
                    <select
                      className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-1 text-slate-100"
                      value={data.project.designer_approver_id ?? ""}
                      onChange={(e) =>
                        void patchProject({
                          designerApproverId: e.target.value || null,
                        })
                      }
                    >
                      <option value="">—</option>
                      {data.designerIds.map((id) => {
                        const u = users.find((x) => x.id === id);
                        if (!u?.can_approve_ozalit) return null;
                        return (
                          <option key={id} value={id}>
                            {u.full_name}
                          </option>
                        );
                      })}
                    </select>
                  </label>
                  <label className="block text-slate-400">
                    Printer approver
                    <select
                      className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-1 text-slate-100"
                      value={data.project.printer_user_id ?? ""}
                      onChange={(e) =>
                        void patchProject({
                          printerUserId: e.target.value || null,
                        })
                      }
                    >
                      <option value="">—</option>
                      {users
                        .filter((u) => u.is_active)
                        .map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.full_name} ({u.role})
                          </option>
                        ))}
                    </select>
                  </label>
                </div>
              ) : null}

              <ProgressSection
                project={data.project}
                progressPercent={data.progressPercent}
                editable={canEditProgress && !mgr}
                onSave={patchProgress}
              />

              {data.project.status === "ozalit_onay" ? (
                <>
                  <OzalitApprovalSection
                    projectId={projectId}
                    api={api}
                    currentUserId={me.id}
                    canAct={!mgr}
                    onRefreshProject={() => void load()}
                  />
                  {tl ? (
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="rounded bg-amber-800 px-3 py-1.5 text-sm text-white hover:bg-amber-700"
                        onClick={() => void requestOzalitAgain()}
                      >
                        Request approval again
                      </button>
                      <button
                        type="button"
                        className="rounded border border-slate-600 px-3 py-1.5 text-sm text-slate-200 hover:bg-slate-800"
                        onClick={() => void changeStatus("demo")}
                      >
                        Move back to Demo
                      </button>
                    </div>
                  ) : null}
                </>
              ) : null}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function CoreFields({
  project,
  readOnly,
  onSave,
}: {
  project: ProjectWithProgress;
  readOnly: boolean;
  onSave: (patch: Record<string, unknown>) => Promise<void>;
}) {
  return (
    <div className="space-y-2 text-sm">
      <Field label="Name" readOnly={readOnly} defaultValue={project.name} onBlur={(v) => onSave({ name: v })} />
      <Field
        label="Short description"
        readOnly={readOnly}
        defaultValue={project.short_description}
        onBlur={(v) => onSave({ shortDescription: v })}
      />
      <Field
        label="Print house"
        readOnly={readOnly}
        defaultValue={project.print_house}
        onBlur={(v) => onSave({ printHouse: v })}
      />
      <label className="block text-slate-400">
        Start date
        <input
          type="date"
          disabled={readOnly}
          className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-1 text-slate-100 disabled:opacity-50"
          defaultValue={project.start_date?.slice(0, 10) ?? ""}
          onBlur={(e) => {
            const v = e.target.value;
            void onSave({ startDate: v || null });
          }}
        />
      </label>
      <label className="block text-slate-400">
        Total pages
        <input
          type="number"
          min={0}
          disabled={readOnly}
          className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-1 text-slate-100 disabled:opacity-50"
          defaultValue={project.total_page_count}
          onBlur={(e) => {
            const v = Number(e.target.value);
            if (!Number.isNaN(v)) void onSave({ totalPageCount: v });
          }}
        />
      </label>
      <div className="flex flex-wrap gap-3 pt-1">
        <Toggle
          label="Kapak"
          disabled={readOnly}
          checked={project.has_kapak}
          onChange={(v) => void onSave({ hasKapak: v })}
        />
        <Toggle
          label="Kutu"
          disabled={readOnly}
          checked={project.has_kutu}
          onChange={(v) => void onSave({ hasKutu: v })}
        />
        <Toggle
          label="Medya"
          disabled={readOnly}
          checked={project.has_medya}
          onChange={(v) => void onSave({ hasMedya: v })}
        />
      </div>
    </div>
  );
}

function Field({
  label,
  defaultValue,
  readOnly,
  onBlur,
}: {
  label: string;
  defaultValue: string;
  readOnly: boolean;
  onBlur: (v: string) => void;
}) {
  return (
    <label className="block text-slate-400">
      {label}
      <input
        disabled={readOnly}
        className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-1 text-slate-100 disabled:opacity-50"
        defaultValue={defaultValue}
        onBlur={(e) => onBlur(e.target.value)}
      />
    </label>
  );
}

function Toggle({
  label,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  checked: boolean;
  disabled: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-slate-300">
      <input
        type="checkbox"
        disabled={disabled}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="rounded border-slate-600"
      />
      {label}
    </label>
  );
}

function DesignerPicker({
  users,
  assigned,
  onAssign,
}: {
  users: DbUser[];
  assigned: string[];
  onAssign: (id: string) => void;
}) {
  return (
    <div className="flex gap-2 pt-1">
      <select
        className="flex-1 rounded border border-slate-700 bg-slate-950 px-2 py-1 text-sm text-slate-100"
        defaultValue=""
        onChange={(e) => {
          const v = e.target.value;
          if (v) onAssign(v);
          e.target.value = "";
        }}
      >
        <option value="">Add designer…</option>
        {users
          .filter((u) => !assigned.includes(u.id))
          .map((u) => (
            <option key={u.id} value={u.id}>
              {u.full_name}
            </option>
          ))}
      </select>
    </div>
  );
}

function StatusControl({
  current,
  onChange,
}: {
  current: ProjectStatus;
  onChange: (s: ProjectStatus) => void;
}) {
  return (
    <select
      className="w-full rounded border border-slate-700 bg-slate-950 px-2 py-2 text-slate-100"
      value={current}
      onChange={(e) => onChange(e.target.value as ProjectStatus)}
    >
      {STATUS_ORDER.map((s) => (
        <option key={s} value={s}>
          {STATUS_LABELS[s]}
        </option>
      ))}
    </select>
  );
}
