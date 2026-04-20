import type { ActivityFeedItem } from "../types";

export function DashboardProgressTimeline({ items }: { items: ActivityFeedItem[] | null }) {
  if (!items) {
    return (
      <div className="rounded-lg border border-slate-800 bg-slate-900/40 px-3 py-4">
        <p className="text-sm text-slate-500">Loading project timeline…</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-slate-800 bg-slate-900/40 px-3 py-4">
        <div className="text-sm font-medium text-slate-300">Project &amp; progress timeline</div>
        <p className="mt-1 text-sm text-slate-500">
          No status or progress events yet. Move a project in the pipeline or update progress on a card.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/40">
      <div className="border-b border-slate-800 px-3 py-2">
        <div className="text-sm font-medium text-slate-300">Project &amp; progress timeline</div>
        <p className="text-xs text-slate-500">Status moves and page / component progress (newest first).</p>
      </div>
      <div className="max-h-96 overflow-y-auto px-2 py-3">
        <ul className="relative border-l border-slate-700 pl-6">
          {items.map((it, i) => (
            <li key={`${it.at}-${it.kind}-${i}`} className="relative pb-6 last:pb-0">
              <span
                className={
                  it.kind === "status_change"
                    ? "absolute -left-[5px] top-1.5 h-2.5 w-2.5 rounded-full border border-slate-900 bg-violet-500"
                    : "absolute -left-[5px] top-1.5 h-2.5 w-2.5 rounded-full border border-slate-900 bg-amber-500"
                }
                aria-hidden
              />
              <div className="text-xs text-slate-500">
                {new Date(it.at).toLocaleString()} · {it.actor_name ?? "—"}
              </div>
              {it.project_name ? (
                <div className="text-sm font-medium text-slate-200">{it.project_name}</div>
              ) : null}
              <div className="text-sm text-slate-400">
                <span className="mr-2 rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-400">
                  {it.kind === "status_change" ? "Status" : "Progress"}
                </span>
                {it.summary}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
