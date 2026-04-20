import { Outlet } from "react-router-dom";
import { Sidebar } from "../components/Sidebar";
import type { DbUser } from "../types";

export function AppLayout({ user }: { user: DbUser }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar role={user.role} />
      <main className="min-w-0 flex-1 p-6">
        <Outlet />
      </main>
    </div>
  );
}
