const base = () => import.meta.env.VITE_API_URL ?? "";

export type ApiErrorBody = { error?: string; code?: string; details?: unknown };

export function createApiClient(getToken: () => Promise<string | null>) {
  async function request<T>(path: string, init?: RequestInit): Promise<T> {
    const token = await getToken();
    const headers = new Headers(init?.headers);
    if (!headers.has("Content-Type") && init?.body) {
      headers.set("Content-Type", "application/json");
    }
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    const res = await fetch(`${base()}${path}`, {
      ...init,
      headers,
    });

    const text = await res.text();
    if (res.status === 204) {
      return null as T;
    }
    const data = text ? (JSON.parse(text) as unknown) : null;

    if (!res.ok) {
      const err = (data ?? {}) as ApiErrorBody;
      let msg = err.error ?? res.statusText;
      if (res.status === 502 && !err.error) {
        msg =
          import.meta.env.VITE_API_URL && import.meta.env.VITE_API_URL.length > 0
            ? "Bad gateway—could not reach the configured API (check deployment and VITE_API_URL)."
            : "Cannot reach the API server. Start the backend (e.g. npm run dev in backend on port 4000) while using the Vite dev server.";
      }
      const e = new Error(msg) as Error & {
        status: number;
        code?: string;
        details?: unknown;
      };
      e.status = res.status;
      e.code = err.code;
      e.details = err.details;
      throw e;
    }

    return data as T;
  }

  return {
    get: <T>(path: string) => request<T>(path),
    post: <T>(path: string, body?: unknown) =>
      request<T>(path, { method: "POST", body: body !== undefined ? JSON.stringify(body) : undefined }),
    patch: <T>(path: string, body?: unknown) =>
      request<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
    delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
