import type { Project } from "../types";

export function ProgressSection({
  project,
  progressPercent,
  editable,
  onSave,
}: {
  project: Project;
  progressPercent: number;
  editable: boolean;
  onSave: (patch: {
    completedPageCount?: number;
    kapakComplete?: boolean;
    kutuComplete?: boolean;
    medyaComplete?: boolean;
  }) => Promise<void>;
}) {
  return (
    <div className="space-y-3 rounded-lg border border-slate-800 p-3">
      <div className="flex items-center justify-between text-sm">
        <span className="text-slate-400">Progress</span>
        <span className="tabular-nums text-violet-400">{progressPercent}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-800">
        <div
          className="h-full rounded-full bg-violet-500 transition-all"
          style={{ width: `${Math.min(progressPercent, 100)}%` }}
        />
      </div>

      <label className="block text-xs text-slate-500">
        Completed pages
        <input
          type="number"
          min={0}
          max={project.total_page_count}
          disabled={!editable}
          defaultValue={project.completed_page_count}
          key={`${project.id}-${project.completed_page_count}`}
          className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-1 text-slate-100 disabled:opacity-50"
          onBlur={(e) => {
            const v = Number(e.target.value);
            if (!editable || Number.isNaN(v)) return;
            if (v !== project.completed_page_count) {
              void onSave({ completedPageCount: v });
            }
          }}
        />
      </label>

      {project.has_kapak ? (
        <FlagRow
          label="Kapak"
          checked={project.kapak_complete}
          disabled={!editable}
          onChange={(v) => void onSave({ kapakComplete: v })}
        />
      ) : null}
      {project.has_kutu ? (
        <FlagRow
          label="Kutu"
          checked={project.kutu_complete}
          disabled={!editable}
          onChange={(v) => void onSave({ kutuComplete: v })}
        />
      ) : null}
      {project.has_medya ? (
        <FlagRow
          label="Medya"
          checked={project.medya_complete}
          disabled={!editable}
          onChange={(v) => void onSave({ medyaComplete: v })}
        />
      ) : null}
    </div>
  );
}

function FlagRow({
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
    <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-300">
      <input
        type="checkbox"
        disabled={disabled}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="rounded border-slate-600"
      />
      {label} complete
    </label>
  );
}
