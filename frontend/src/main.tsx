import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ClerkProvider } from "@clerk/react";
import "./index.css";
import App from "./App.tsx";
import { ErrorBoundary } from "./ErrorBoundary.tsx";

const pk = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string | undefined;

const publishableKeyInvalid =
  !pk ||
  pk.includes("REPLACE") ||
  (!pk.startsWith("pk_test_") && !pk.startsWith("pk_live_"));

function MissingKeyScreen() {
  return (
    <div className="mx-auto max-w-lg p-8 text-center text-slate-300">
      <p className="text-red-400">
        Set <code className="text-red-300">VITE_CLERK_PUBLISHABLE_KEY</code> in{" "}
        <code className="text-red-300">frontend/.env.local</code> or <code className="text-red-300">frontend/.env</code>{" "}
        (must start with <code className="text-slate-400">pk_test_</code> or <code className="text-slate-400">pk_live_</code>).
      </p>
      <pre className="mt-4 rounded bg-slate-900 p-3 text-left text-sm text-slate-400">
        {`Copy from Clerk → Configure → API keys, then restart: npm run dev`}
      </pre>
    </div>
  );
}

const root = document.getElementById("root")!;

if (publishableKeyInvalid) {
  createRoot(root).render(
    <StrictMode>
      <MissingKeyScreen />
    </StrictMode>
  );
} else {
  createRoot(root).render(
    <StrictMode>
      <ErrorBoundary>
        <ClerkProvider publishableKey={pk} afterSignOutUrl="/">
          <App />
        </ClerkProvider>
      </ErrorBoundary>
    </StrictMode>
  );
}
