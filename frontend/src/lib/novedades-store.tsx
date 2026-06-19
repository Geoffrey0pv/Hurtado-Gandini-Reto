import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type NovedadTipo = "vacaciones" | "incapacidad" | "licencia" | "permiso_remunerado" | "suspension";

export const NOVEDAD_LABEL: Record<NovedadTipo, string> = {
  vacaciones: "Vacaciones",
  incapacidad: "Incapacidad",
  licencia: "Licencia",
  permiso_remunerado: "Permiso remunerado",
  suspension: "Suspensión",
};

export const NOVEDAD_TONE: Record<NovedadTipo, "primary" | "warning" | "muted" | "success"> = {
  vacaciones: "primary",
  incapacidad: "warning",
  licencia: "muted",
  permiso_remunerado: "success",
  suspension: "warning",
};

export type Novedad = {
  id: string;
  empleadoId: string;
  tipo: NovedadTipo;
  desde: string; // YYYY-MM-DD
  hasta: string; // YYYY-MM-DD
  nota?: string;
  documento?: { nombre: string; size: number };
  creadoEn: string;
};

const STORAGE_KEY = "laborapp.novedades.v1";

type Ctx = {
  novedades: Novedad[];
  add: (n: Omit<Novedad, "id" | "creadoEn">) => Novedad;
  remove: (id: string) => void;
  forEmployee: (empId: string) => Novedad[];
};

const NovedadesContext = createContext<Ctx | null>(null);

export function NovedadesProvider({ children }: { children: ReactNode }) {
  const [novedades, setNovedades] = useState<Novedad[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as Novedad[]) : [];
    } catch { return []; }
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(novedades)); } catch { /* ignore */ }
  }, [novedades]);

  const add = useCallback<Ctx["add"]>((n) => {
    const item: Novedad = {
      ...n,
      id: `nov-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      creadoEn: new Date().toISOString(),
    };
    setNovedades((prev) => [item, ...prev]);
    return item;
  }, []);

  const value = useMemo<Ctx>(() => ({
    novedades,
    add,
    remove: (id) => setNovedades((prev) => prev.filter((x) => x.id !== id)),
    forEmployee: (empId) => novedades.filter((x) => x.empleadoId === empId),
  }), [novedades, add]);

  return <NovedadesContext.Provider value={value}>{children}</NovedadesContext.Provider>;
}

export function useNovedades() {
  const ctx = useContext(NovedadesContext);
  if (!ctx) throw new Error("useNovedades must be used inside NovedadesProvider");
  return ctx;
}

// Días calendario inclusivos entre dos fechas ISO
export function diasEntre(desde: string, hasta: string): number {
  const a = new Date(desde + "T00:00:00");
  const b = new Date(hasta + "T00:00:00");
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime()) || b < a) return 0;
  return Math.floor((b.getTime() - a.getTime()) / 86_400_000) + 1;
}
