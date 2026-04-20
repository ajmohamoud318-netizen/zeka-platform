import { useEffect, useState } from "react";
import { useApi } from "../hooks/useApi";
import { DashboardPlanner } from "../components/DashboardPlanner";
import { DashboardProgressTimeline } from "../components/DashboardProgressTimeline";
import { DashboardSummaryCards } from "../components/DashboardSummaryCards";
import { TeamActivityPanel } from "../components/TeamActivityPanel";
import type { ActivityFeedItem, ProjectWithProgress } from "../types";

function projectTimelineItems(feed: ActivityFeedItem[] | null): ActivityFeedItem[] | null {
  if (!feed) return null;
  return feed.filter((x) => x.kind === "status_change" || x.kind === "progress");
}

export function Dashboard() {
  const api = useApi();
  const [projects, setProjects] = useState<ProjectWithProgress[] | null>(null);
  const [feed, setFeed] = useState<ActivityFeedItem[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      api.get<{ projects: ProjectWithProgress[] }>("/api/projects").then((r) => {
        if (!cancelled) setProjects(r.projects);
      }),
      api.get<{ items: ActivityFeedItem[] }>("/api/activity/feed?limit=60").then((r) => {
        if (!cancelled) setFeed(r.items);
      }),
    ]);
    return () => {
      cancelled = true;
    };
  }, [api]);

  const timelineItems = projectTimelineItems(feed);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">
          Summary, project progress timeline, planner, and team activity.
        </p>
      </div>

      {projects === null ? (
        <p className="text-sm text-slate-500">Loading projects…</p>
      ) : (
        <DashboardSummaryCards projects={projects} />
      )}

      <DashboardProgressTimeline items={timelineItems} />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {projects === null ? (
            <p className="text-sm text-slate-500">Loading planner…</p>
          ) : (
            <DashboardPlanner projects={projects} />
          )}
        </div>
        <div className="lg:col-span-1">
          <TeamActivityPanel items={feed} />
        </div>
      </div>
    </div>
  );
}
