import { NavLink } from "react-router-dom";
import { UserButton } from "@clerk/react";
import type { UserRole } from "../types";

const links: { to: string; label: string; roles?: UserRole[] }[] = [
  { to: "/", label: "Dashboard" },
  { to: "/projects", label: "Projects" },
  { to: "/designer", label: "Designer Home", roles: ["designer", "team_leader"] },
  { to: "/team", label: "Team", roles: ["team_leader", "manager"] },
];

export function Sidebar({ role }: { role: UserRole }) {
  const visible = links.filter((l) => !l.roles || l.roles.includes(role));

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-slate-800 bg-slate-900/80">
      <div className="border-b border-slate-800 px-4 py-4">
        <div className="text-sm font-semibold tracking-tight text-white">PM Console</div>
        <div className="text-xs text-slate-500">Internal</div>
      </div>
      <nav className="flex flex-1 flex-col gap-0.5 p-2">
        {visible.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.to === "/"}
            className={({ isActive }) =>
              [
                "rounded-md px-3 py-2 text-sm transition-colors",
                isActive
                  ? "bg-slate-800 text-white"
                  : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200",
              ].join(" ")
            }
          >
            {l.label}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-slate-800 p-3">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-xs capitalize text-slate-500">{role.replace("_", " ")}</span>
          <UserButton />
        </div>
      </div>
    </aside>
  );
}
