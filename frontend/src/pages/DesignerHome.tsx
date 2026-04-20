import { useEffect, useState } from "react";
import { useApi } from "../hooks/useApi";
import { useMe } from "../context/MeContext";
import type { ProjectWithProgress } from "../types";
import { ProjectCard } from "../components/ProjectCard";
import { ProjectDrawer } from "../components/ProjectDrawer";

export function DesignerHome() {
  const api = useApi();
  const { me } = useMe();
  const [projects, setProjects] = useState<ProjectWithProgress[]>([]);
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [logDate, setLogDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [workedElse, setWorkedElse] = useState(false);
  const [desc, setDesc] = useState("");
  const [logMsg, setLogMsg] = useState<string | null>(null);

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

  const mine = projects.filter((p) => p.designer_ids?.includes(me.user.id));

  const submitLog = async () => {
    setLogMsg(null);
    try {
      await api.post("/api/activity/daily-log", {
        logDate,
        workedOnSomethingElse: workedElse,
        description: desc,
      });
      setLogMsg("Saved.");
      setDesc("");
    } catch (e) {
      setLogMsg((e as Error).message);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-white">Designer home</h1>
        <p className="text-sm text-slate-500">Your assigned projects and daily work log.</p>
      </div>

      {me.user.role === "designer" ? (
      <section className="rounded-lg border border-slate-800 bg-slate-900/40 p-4">
        <h2 className="text-sm font-medium text-slate-300">Daily work log</h2>
        <p className="mt-1 text-xs text-slate-500">Does not affect project progress.</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="block text-xs text-slate-400">
            Date
            <input
              type="date"
              className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-1 text-sm"
              value={logDate}
              onChange={(e) => setLogDate(e.target.value)}
            />
          </label>
          <label className="flex items-center gap-2 pt-6 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={workedElse}
              onChange={(e) => setWorkedElse(e.target.checked)}
              className="rounded border-slate-600"
            />
            Worked on something else
          </label>
        </div>
        <textarea
          className="mt-3 w-full rounded border border-slate-700 bg-slate-950 px-2 py-2 text-sm text-slate-100"
          rows={3}
          placeholder="Description"
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
        />
        <button
          type="button"
          className="mt-2 rounded bg-slate-700 px-4 py-1.5 text-sm text-white hover:bg-slate-600"
          onClick={() => void submitLog()}
        >
          Save log
        </button>
        {logMsg ? <p className="mt-2 text-sm text-slate-400">{logMsg}</p> : null}
      </section>
      ) : (
        <p className="text-sm text-slate-500">Daily logs are available to designers.</p>
      )}

      <section>
        <h2 className="mb-3 text-sm font-medium text-slate-300">Your projects</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {mine.length === 0 ? (
            <p className="text-sm text-slate-500">No assignments yet.</p>
          ) : (
            mine.map((p) => <ProjectCard key={p.id} project={p} onOpen={setDrawerId} />)
          )}
        </div>
      </section>

      <ProjectDrawer projectId={drawerId} onClose={() => setDrawerId(null)} api={api} me={me.user} />
    </div>
  );
}
