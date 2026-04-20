import type { ProjectStatus, ProjectWithProgress } from "../types";
import { STATUS_LABELS } from "../types";

type Props = { projects: ProjectWithProgress[] };

function countByStatus(projects: ProjectWithProgress[], statuses: ProjectStatus[]): number {
  const set = new Set(statuses);
  return projects.filter((p) => set.has(p.status)).length;
}

function Card({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: number;
  hint: string;
  accent: "slate" | "violet" | "amber" | "emerald";
}) {
  const ring =
    accent === "violet"
      ? "border-violet-500/30 bg-violet-950/20"
      : accent === "amber"
        ? "border-amber-500/30 bg-amber-950/20"
        : accent === "emerald"
          ? "border-emerald-500/30 bg-emerald-950/20"
          : "border-slate-700 bg-slate-900/40";

  return (
    <div className={`rounded-xl border px-4 py-3 ${ring}`}>
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums text-white">{value}</div>
      <div className="mt-1 text-xs text-slate-500">{hint}</div>
    </div>
  );
}

export function DashboardSummaryCards({ projects }: Props) {
  const total = projects.length;
  const newCount = countByStatus(projects, ["new"]);
  const inFlight = countByStatus(projects, [
    "active",
    "demo",
    "ozalit_onay",
    "uretim",
    "satis",
  ]);
  const completed = countByStatus(projects, ["completed"]);

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Card label="All projects" value={total} hint="In the workspace" accent="slate" />
      <Card
        label={STATUS_LABELS.new}
        value={newCount}
        hint="Not yet in pipeline"
        accent="violet"
      />
      <Card
        label="In progress"
        value={inFlight}
        hint={`${STATUS_LABELS.active} → ${STATUS_LABELS.satis}`}
        accent="amber"
      />
      <Card label="Completed" value={completed} hint="Shipped / closed" accent="emerald" />
    </div>
  );
}
