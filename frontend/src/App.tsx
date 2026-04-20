import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { SignIn, useAuth } from "@clerk/react";
import { MeProvider, useMe } from "./context/MeContext";
import { AppLayout } from "./layout/AppLayout";
import { Dashboard } from "./pages/Dashboard";
import { ProjectsPage } from "./pages/ProjectsPage";
import { DesignerHome } from "./pages/DesignerHome";
import { TeamPage } from "./pages/TeamPage";

function Gate() {
  const { isLoaded, isSignedIn } = useAuth();
  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-400">
        Loading…
      </div>
    );
  }
  if (!isSignedIn) {
    return <Navigate to="/sign-in" replace />;
  }
  return (
    <MeProvider>
      <SignedInShell />
    </MeProvider>
  );
}

function SignedInShell() {
  const { me } = useMe();

  if (me.status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-400">
        Loading profile…
      </div>
    );
  }

  if (me.status === "error") {
    return (
      <div className="mx-auto max-w-lg p-8 text-center">
        <h1 className="text-xl font-semibold text-white">Cannot access app</h1>
        <p className="mt-2 text-sm text-slate-400">{me.message}</p>
        {me.code === "USER_NOT_PROVISIONED" ? (
          <p className="mt-4 text-sm text-slate-500">
            Ask a team leader to invite you by email from the Team page, or to add your user with your Clerk user id (Clerk
            dashboard → Users).
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <Routes>
      <Route element={<AppLayout user={me.user} />}>
        <Route index element={<Dashboard />} />
        <Route path="projects" element={<ProjectsPage />} />
        <Route path="designer" element={<DesignerHome />} />
        <Route path="team" element={<TeamPage />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/sign-in/*"
          element={<SignIn routing="path" path="/sign-in" signUpUrl="/sign-in" />}
        />
        <Route path="/*" element={<Gate />} />
      </Routes>
    </BrowserRouter>
  );
}
