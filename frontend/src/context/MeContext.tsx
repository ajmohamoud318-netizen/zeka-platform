import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { useAuth } from "@clerk/react";
import type { DbUser } from "../types";
import { useApi } from "../hooks/useApi";

type MeState =
  | { status: "loading" }
  | { status: "ready"; user: DbUser }
  | { status: "error"; message: string; code?: string };

const MeCtx = createContext<{
  me: MeState;
  refresh: () => Promise<void>;
} | null>(null);

export function MeProvider({ children }: { children: ReactNode }) {
  const { isSignedIn, isLoaded } = useAuth();
  const api = useApi();
  const [me, setMe] = useState<MeState>({ status: "loading" });

  const refresh = useCallback(async () => {
    if (!isLoaded || !isSignedIn) {
      setMe({ status: "loading" });
      return;
    }
    setMe({ status: "loading" });
    try {
      const r = await api.get<{ user: DbUser }>("/api/users/me");
      setMe({ status: "ready", user: r.user });
    } catch (e) {
      const err = e as Error & { code?: string };
      setMe({
        status: "error",
        message: err.message,
        code: err.code,
      });
    }
  }, [api, isLoaded, isSignedIn]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return <MeCtx.Provider value={{ me, refresh }}>{children}</MeCtx.Provider>;
}

export function useMe() {
  const v = useContext(MeCtx);
  if (!v) {
    throw new Error("useMe outside MeProvider");
  }
  return v;
}
