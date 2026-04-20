import type { ActivityFeedItem } from "../types";

export function TeamActivityPanel({ items }: { items: ActivityFeedItem[] | null }) {
  if (!items) {
    return (
      <div className="rounded-lg border border-slate-800 bg-slate-900/40 px-3 py-4">
        <p className="text-sm text-slate-500">Loading activity…</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/40">
      <div className="border-b border-slate-800 px-3 py-2 text-sm font-medium text-slate-300">
        Team activity
      </div>
      <ul className="max-h-80 divide-y divide-slate-800 overflow-y-auto">
        {items.length === 0 ? (
          <li className="px-3 py-4 text-sm text-slate-500">No events yet.</li>
        ) : (
          items.map((it, i) => (
            <li key={`${it.at}-${i}`} className="px-3 py-2 text-sm">
              <div className="text-xs text-slate-500">
                {new Date(it.at).toLocaleString()} · {it.actor_name ?? "—"}
              </div>
              <div className="text-slate-200">
                {it.project_name ? <span className="text-slate-400">{it.project_name}: </span> : null}
                {it.summary}
              </div>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
