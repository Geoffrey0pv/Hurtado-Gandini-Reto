// lib/auth.ts — Estado de sesión JWT.
// Las claves de localStorage y getToken viven en api.ts (fuente única); aquí solo
// se gestionan guardado/limpieza de sesión y las peticiones de auth.
import { apiPost, getToken, TOKEN_KEY, USER_KEY } from "./api";

export { getToken };

export interface AuthUser {
  id: string;
  email: string;
  role: string;
  organizationId: string;
}

export function getUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

export function isAuthenticated(): boolean {
  return !!getToken();
}

const ROLE_LABEL: Record<string, string> = {
  admin: "Administrador",
  abogado: "Abogado laboral",
  hr: "Talento Humano",
};

export function roleLabel(role?: string | null): string {
  if (!role) return "Usuario";
  return ROLE_LABEL[role] ?? role;
}

// Nombre legible derivado del email (no tenemos campo nombre en el backend de
// usuarios). "ana.restrepo@empresa.com" → "Ana Restrepo".
export function displayNameFromEmail(email?: string | null): string {
  if (!email) return "Usuario";
  const local = email.split("@")[0] ?? email;
  return (
    local
      .split(/[._-]+/)
      .filter(Boolean)
      .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
      .join(" ") || email
  );
}

export function userInitials(email?: string | null): string {
  const name = displayNameFromEmail(email);
  return name
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export function saveSession(token: string, user: AuthUser) {
  window.localStorage.setItem(TOKEN_KEY, token);
  window.localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession() {
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(USER_KEY);
  // legacy key kept for back-compat during transition
  window.localStorage.removeItem("laborapp-auth");
}

export async function loginRequest(email: string, password: string): Promise<{ token: string; user: AuthUser }> {
  const res = await apiPost<{ token: string; user: { id: string; email: string; role: string }; organizationId?: string }>(
    "/auth/login",
    { email, password },
  );
  // Decode organizationId from JWT payload
  let organizationId = "";
  try {
    const payload = JSON.parse(atob(res.token.split(".")[1]));
    organizationId = payload.organizationId ?? "";
  } catch {
    organizationId = "";
  }
  const user: AuthUser = { ...res.user, organizationId };
  saveSession(res.token, user);
  return { token: res.token, user };
}

export async function registerRequest(payload: {
  orgName: string;
  nit: string;
  email: string;
  password: string;
}): Promise<{ token: string; user: AuthUser }> {
  const res = await apiPost<{ token: string; organization: unknown; user: AuthUser }>(
    "/auth/register",
    payload,
  );
  saveSession(res.token, res.user);
  return { token: res.token, user: res.user };
}
