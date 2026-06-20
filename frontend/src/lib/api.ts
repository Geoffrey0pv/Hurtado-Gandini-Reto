// lib/api.ts — Cliente HTTP centralizado con JWT automático.
const BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:3000";

// Claves de sesión en localStorage (fuente única de verdad; auth.ts las reutiliza).
export const TOKEN_KEY = "laborapp-token";
export const USER_KEY = "laborapp-user";

// Tiempo máximo por petición antes de abortar (evita requests colgados).
const DEFAULT_TIMEOUT_MS = 30_000;

export class ApiError extends Error {
  constructor(
    public status: number,
    public body: unknown,
  ) {
    super(`API error ${status}`);
  }
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

// Sesión expirada/invalidada: limpia credenciales y manda al login una sola vez.
// No se dispara en los propios endpoints de autenticación (allí el 401 = credenciales).
function handleUnauthorized(path: string) {
  if (typeof window === "undefined") return;
  if (path.startsWith("/auth/login") || path.startsWith("/auth/register")) return;
  const hadToken = !!window.localStorage.getItem(TOKEN_KEY);
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(USER_KEY);
  if (hadToken && window.location.pathname !== "/login") {
    window.location.assign("/login");
  }
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken();
  const isFormData = init?.body instanceof FormData;

  const headers: Record<string, string> = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(!isFormData ? { "Content-Type": "application/json" } : {}),
    ...(init?.headers as Record<string, string> | undefined),
  };

  // Timeout vía AbortController, respetando una señal externa si se pasó.
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
  if (init?.signal) {
    init.signal.addEventListener("abort", () => controller.abort(), { once: true });
  }

  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, { ...init, headers, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }

  if (!res.ok) {
    if (res.status === 401) handleUnauthorized(path);
    let body: unknown;
    try {
      body = await res.json();
    } catch {
      body = { error: res.statusText };
    }
    throw new ApiError(res.status, body);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export function apiGet<T>(path: string) {
  return apiFetch<T>(path, { method: "GET" });
}

export function apiPost<T>(path: string, body: unknown) {
  return apiFetch<T>(path, { method: "POST", body: JSON.stringify(body) });
}

export function apiPatch<T>(path: string, body: unknown) {
  return apiFetch<T>(path, { method: "PATCH", body: JSON.stringify(body) });
}

export function apiDelete(path: string) {
  return apiFetch<void>(path, { method: "DELETE" });
}

export function apiUpload<T>(path: string, form: FormData) {
  return apiFetch<T>(path, { method: "POST", body: form });
}
