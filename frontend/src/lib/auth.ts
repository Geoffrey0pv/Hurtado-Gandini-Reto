// lib/auth.ts — Estado de sesión JWT.
import { apiPost } from "./api";

export interface AuthUser {
  id: string;
  email: string;
  role: string;
  organizationId: string;
}

const TOKEN_KEY = "laborapp-token";
const USER_KEY = "laborapp-user";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
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
