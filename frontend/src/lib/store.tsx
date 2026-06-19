import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { areas as areasSeed, employeesSeed, type Employee } from "./mock/data";

export type PendingCheck = {
  id: string;
  empleadoId: string;
  empleadoNombre: string;
  motivo: string;
  fecha: string;
};

type Ctx = {
  employees: Employee[];
  areas: string[];
  pendingChecks: PendingCheck[];
  addEmployee: (e: Employee) => void;
  getEmployee: (id: string) => Employee | undefined;
  moveEmployee: (id: string, changes: { area?: string; jefe?: string }) => Employee | undefined;
  reorderAreas: (next: string[]) => void;
  renameArea: (oldName: string, newName: string) => void;
  removeArea: (name: string) => void;
  clearPendingCheck: (id: string) => void;
};

const EmployeesContext = createContext<Ctx | null>(null);

export function EmployeesProvider({ children }: { children: ReactNode }) {
  const [employees, setEmployees] = useState<Employee[]>(employeesSeed);
  const [areas, setAreas] = useState<string[]>(areasSeed);
  const [pendingChecks, setPendingChecks] = useState<PendingCheck[]>([]);

  const pushCheck = useCallback((emp: Employee, motivo: string) => {
    setPendingChecks((prev) => [
      {
        id: `chk-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        empleadoId: emp.id,
        empleadoNombre: emp.nombre,
        motivo,
        fecha: new Date().toISOString(),
      },
      ...prev,
    ]);
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      employees,
      areas,
      pendingChecks,
      addEmployee: (e) => setEmployees((prev) => [e, ...prev]),
      getEmployee: (id) => employees.find((x) => x.id === id),
      moveEmployee: (id, changes) => {
        let updated: Employee | undefined;
        setEmployees((prev) =>
          prev.map((e) => {
            if (e.id !== id) return e;
            const changedArea = changes.area && changes.area !== e.area;
            const changedJefe = changes.jefe !== undefined && changes.jefe !== e.jefe;
            if (!changedArea && !changedJefe) {
              updated = e;
              return e;
            }
            const next: Employee = {
              ...e,
              area: changes.area ?? e.area,
              jefe: changes.jefe ?? e.jefe,
            };
            updated = next;
            const motivo = changedArea && changedJefe
              ? `Cambió de área (${e.area} → ${next.area}) y jefe.`
              : changedArea
                ? `Cambió de área: ${e.area} → ${next.area}.`
                : `Cambió jefe inmediato: ${e.jefe} → ${next.jefe}.`;
            pushCheck(next, motivo);
            return next;
          }),
        );
        return updated;
      },
      reorderAreas: (next) => setAreas(next),
      renameArea: (oldName, newName) => {
        if (!newName.trim() || newName === oldName) return;
        setAreas((prev) => prev.map((a) => (a === oldName ? newName : a)));
        setEmployees((prev) => prev.map((e) => (e.area === oldName ? { ...e, area: newName } : e)));
      },
      removeArea: (name) => {
        setAreas((prev) => prev.filter((a) => a !== name));
      },
      clearPendingCheck: (id) => setPendingChecks((prev) => prev.filter((c) => c.id !== id)),
    }),
    [employees, areas, pendingChecks, pushCheck],
  );

  return <EmployeesContext.Provider value={value}>{children}</EmployeesContext.Provider>;
}

export function useEmployees() {
  const ctx = useContext(EmployeesContext);
  if (!ctx) throw new Error("useEmployees must be used inside EmployeesProvider");
  return ctx;
}
