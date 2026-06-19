import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { TipoHora } from "./mock/data";

export type TimesheetEntry = {
  id: string;
  empleadoId: string;
  fecha: string; // YYYY-MM-DD
  horas: number;
  tipo: TipoHora;
  notas?: string;
  origen?: "manual" | "importado";
};

const STORAGE_KEY = "laborapp.timesheet.v1";

type Ctx = {
  entries: TimesheetEntry[];
  addEntry: (e: Omit<TimesheetEntry, "id">) => { ok: true } | { ok: false; reason: string };
  removeEntry: (id: string) => void;
  forEmployee: (empId: string) => TimesheetEntry[];
};

const TimesheetContext = createContext<Ctx | null>(null);

export function TimesheetProvider({ children }: { children: ReactNode }) {
  const [entries, setEntries] = useState<TimesheetEntry[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as TimesheetEntry[]) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries)); } catch { /* ignore */ }
  }, [entries]);

  const addEntry = useCallback<Ctx["addEntry"]>((e) => {
    // Tope: 2h extras (familia "extra" o "dom") por día por empleado.
    if (e.tipo.startsWith("extra_")) {
      const acum = entries
        .filter((x) => x.empleadoId === e.empleadoId && x.fecha === e.fecha && x.tipo.startsWith("extra_"))
        .reduce((s, x) => s + x.horas, 0);
      if (acum + e.horas > 2) {
        return { ok: false, reason: `Excede el tope legal de 2h extra por día (ya registradas: ${acum}h).` };
      }
    }
    setEntries((prev) => [
      { ...e, id: `ts-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, origen: e.origen ?? "manual" },
      ...prev,
    ]);
    return { ok: true };
  }, [entries]);

  const value = useMemo<Ctx>(() => ({
    entries,
    addEntry,
    removeEntry: (id) => setEntries((prev) => prev.filter((x) => x.id !== id)),
    forEmployee: (empId) => entries.filter((x) => x.empleadoId === empId),
  }), [entries, addEntry]);

  return <TimesheetContext.Provider value={value}>{children}</TimesheetContext.Provider>;
}

export function useTimesheet() {
  const ctx = useContext(TimesheetContext);
  if (!ctx) throw new Error("useTimesheet must be used inside TimesheetProvider");
  return ctx;
}
