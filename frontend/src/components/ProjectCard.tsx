import type { ProjectWithProgress } from "../types";
import { STATUS_LABELS } from "../types";

export function ProjectCard({
  project,
  onOpen,
}: {
  project: ProjectWithProgress;
  onOpen: (id: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(project.id)}
      className="w-full rounded-lg border border-slate-700 bg-slate-900 p-3 text-left text-sm shadow-sm transition hover:border-slate-500"
    >
      <div className="font-medium text-slate-100">{project.name}</div>
      {project.short_description ? (
        <p className="mt-1 line-clamp-2 text-xs text-slate-500">{project.short_description}</p>
      ) : null}
      <div className="mt-2 flex items-center justify-between gap-2 text-xs text-slate-500">
        <span>{STATUS_LABELS[project.status]}</span>
        <span className="tabular-nums text-violet-400">{project.progressPercent}%</span>
      </div>
    </button>
  );
}
