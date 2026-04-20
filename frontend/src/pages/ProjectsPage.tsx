import { useEffect, useState } from "react";
import { useApi } from "../hooks/useApi";
import { useMe } from "../context/MeContext";
import type { ProjectWithProgress, ProjectStatus } from "../types";
import { STATUS_ORDER, STATUS_LABELS } from "../types";
import { ProjectCard } from "../components/ProjectCard";
import { ProjectDrawer } from "../components/ProjectDrawer";

export function ProjectsPage() {
  const api = useApi();
  const { me } = useMe();
  const [projects, setProjects] = useState<ProjectWithProgress[]>([]);
  const [drawerId, setDrawerId] = useState<string | null>(null);

  const load = async () => {
    const r = await api.get<{ projects: ProjectWithProgress[] }>("/api/projects");
    setProjects(r.projects);
  };

  useEffect(() => {
    void load();
  }, [api]);

  if (me.status !== "ready") {
    return null;
  }

  const byStatus = (s: ProjectStatus) => projects.filter((p) => p.status === s);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">Projects</h1>
          <p className="text-sm text-slate-500">Kanban by status — click a card for details.</p>
        </div>
        {me.user.role === "team_leader" ? (
          <button
            type="button"
            className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500"
            onClick={async () => {
              await api.post("/api/projects", {
                name: "New project",
                shortDescription: "",
                printHouse: "",
                startDate: null,
                totalPageCount: 0,
                hasKapak: false,
                hasKutu: false,
                hasMedya: false,
              });
              await load();
            }}
          >
            New project
          </button>
        ) : null}
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2">
        {STATUS_ORDER.map((col) => (
          <div key={col} className="w-64 shrink-0">
            <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
              {STATUS_LABELS[col]}
            </div>
            <div className="flex min-h-[200px] flex-col gap-2 rounded-lg border border-slate-800 bg-slate-900/30 p-2">
              {byStatus(col).map((p) => (
                <ProjectCard key={p.id} project={p} onOpen={setDrawerId} />
              ))}
            </div>
          </div>
        ))}
      </div>

      <ProjectDrawer
        projectId={drawerId}
        onClose={() => setDrawerId(null)}
        api={api}
        me={me.user}
      />
    </div>
  );
}
