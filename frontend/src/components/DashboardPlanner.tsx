import { Link } from "react-router-dom";
import type { ProjectWithProgress } from "../types";
import { STATUS_LABELS } from "../types";

type Props = { projects: ProjectWithProgress[] };

/** Monday 00:00 local */
function startOfWeekMonday(d: Date): Date {
  const x = new Date(d);
  const day = x.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + diff);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfWeekSunday(d: Date): Date {
  const start = startOfWeekMonday(d);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
}

function parseDay(iso: string | null): Date | null {
  if (!iso) return null;
  const [y, m, day] = iso.split("-").map(Number);
  if (!y || !m || !day) return null;
  return new Date(y, m - 1, day);
}

function formatDay(iso: string | null): string {
  const dt = parseDay(iso);
  if (!dt) return "—";
  return dt.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function DashboardPlanner({ projects }: Props) {
  const now = new Date();
  const weekStart = startOfWeekMonday(now);
  const weekEnd = endOfWeekSunday(now);

  const withDate = projects.filter((p) => p.start_date);
  const unscheduled = projects.filter((p) => !p.start_date);

  const thisWeek = withDate.filter((p) => {
    const dt = parseDay(p.start_date);
    if (!dt) return false;
    return dt >= weekStart && dt <= weekEnd;
  });
  thisWeek.sort((a, b) => (a.start_date! < b.start_date! ? -1 : 1));

  const later = withDate.filter((p) => {
    const dt = parseDay(p.start_date);
    if (!dt) return false;
    return dt > weekEnd;
  });
  later.sort((a, b) => (a.start_date! < b.start_date! ? -1 : 1));
  const laterSlice = later.slice(0, 8);

  const rangeLabel = `${weekStart.toLocaleDateString(undefined, { month: "short", day: "numeric" })} – ${weekEnd.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`;

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/40">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 px-3 py-2">
        <div>
          <div className="text-sm font-medium text-slate-300">Planner</div>
          <div className="text-xs text-slate-500">Starts this week ({rangeLabel})</div>
        </div>
        <Link to="/projects" className="text-xs text-violet-400 hover:text-violet-300">
          All projects →
        </Link>
      </div>

      <div className="divide-y divide-slate-800">
        <section className="p-3">
          {thisWeek.length === 0 ? (
            <p className="text-sm text-slate-500">No projects with a start date scheduled this week.</p>
          ) : (
            <ul className="space-y-2">
              {thisWeek.map((p) => (
                <li
                  key={p.id}
                  className="flex flex-wrap items-baseline justify-between gap-2 rounded-md border border-slate-800/80 bg-slate-950/40 px-2 py-1.5"
                >
                  <div className="min-w-0">
                    <div className="truncate font-medium text-slate-200">{p.name}</div>
                    <div className="text-xs text-slate-500">{STATUS_LABELS[p.status]}</div>
                  </div>
                  <div className="shrink-0 text-xs tabular-nums text-violet-300">{formatDay(p.start_date)}</div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="p-3">
          <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Upcoming starts</div>
          {laterSlice.length === 0 ? (
            <p className="text-sm text-slate-500">No later start dates on the calendar.</p>
          ) : (
            <ul className="space-y-1.5">
              {laterSlice.map((p) => (
                <li key={p.id} className="flex justify-between gap-2 text-sm">
                  <span className="truncate text-slate-300">{p.name}</span>
                  <span className="shrink-0 tabular-nums text-slate-500">{formatDay(p.start_date)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {unscheduled.length > 0 ? (
          <section className="px-3 py-2 text-xs text-slate-500">
            {unscheduled.length} project{unscheduled.length === 1 ? "" : "s"} with no start date — set one in the project
            drawer.
          </section>
        ) : null}
      </div>
    </div>
  );
}
