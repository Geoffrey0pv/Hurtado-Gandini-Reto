// store.tsx — Capa de compatibilidad: expone useEmployees() usando la API real.
// Preserva la misma interfaz para no romper componentes existentes.
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useColaboradores,
  useCreateColaborador,
  useUpdateColaborador,
} from "@/hooks/useColaboradores";
import { useAreas, useCreateArea, useDeleteArea, useUpdateArea } from "@/hooks/useAreas";
import { backendToEmployee, employeeToCreatePayload } from "./types";
import type { Employee } from "./mock/data";

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
  isLoading: boolean;
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
  const qc = useQueryClient();
  const { data: backendColabs = [], isLoading: loadingColabs } = useColaboradores();
  const { data: backendAreas = [], isLoading: loadingAreas } = useAreas();
  const createColaborador = useCreateColaborador();
  const updateColaborador = useUpdateColaborador();
  const createArea = useCreateArea();
  const updateArea = useUpdateArea();
  const deleteArea = useDeleteArea();

  // Pending checks remain local (informational only, no persistence needed yet)
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

  // Build a jefe lookup map
  const colabById = useMemo(() => {
    const map = new Map(backendColabs.map((c) => [c.id, c]));
    return map;
  }, [backendColabs]);

  const employees: Employee[] = useMemo(
    () =>
      backendColabs.map((c) => {
        const jefe = c.jefeId ? colabById.get(c.jefeId) : undefined;
        return backendToEmployee(c, undefined, jefe);
      }),
    [backendColabs, colabById],
  );

  const areas: string[] = useMemo(
    () => backendAreas.map((a) => a.nombre),
    [backendAreas],
  );

  const value = useMemo<Ctx>(
    () => ({
      employees,
      areas,
      isLoading: loadingColabs || loadingAreas,
      pendingChecks,

      addEmployee: (e: Employee) => {
        const payload = employeeToCreatePayload(e);
        createColaborador.mutate(payload);
      },

      getEmployee: (id) => employees.find((x) => x.id === id),

      moveEmployee: (id, changes) => {
        const emp = employees.find((e) => e.id === id);
        if (!emp) return undefined;

        const changedArea = changes.area !== undefined && changes.area !== emp.area;
        const changedJefe = changes.jefe !== undefined && changes.jefe !== emp.jefe;

        if (changedArea || changedJefe) {
          const motivo = changedArea && changedJefe
            ? `Cambió de área (${emp.area} → ${changes.area}) y jefe.`
            : changedArea
              ? `Cambió de área: ${emp.area} → ${changes.area}.`
              : `Cambió jefe inmediato: ${emp.jefe} → ${changes.jefe}.`;

          const updated: Employee = {
            ...emp,
            area: changes.area ?? emp.area,
            jefe: changes.jefe ?? emp.jefe,
          };

          // Find new jefe's id from their name
          let jefeId: string | undefined;
          if (changes.jefe) {
            const jefeColab = backendColabs.find((c) => c.nombre === changes.jefe);
            jefeId = jefeColab?.id;
          }

          updateColaborador.mutate({
            id,
            data: {
              ...(changedArea ? { area: changes.area } : {}),
              ...(jefeId !== undefined ? { jefeId } : {}),
            },
          });
          pushCheck(updated, motivo);
          return updated;
        }
        return emp;
      },

      reorderAreas: (next) => {
        // Update order in backend
        next.forEach((nombre, idx) => {
          const found = backendAreas.find((a) => a.nombre === nombre);
          if (found) updateArea.mutate({ id: found.id, data: { orden: idx } });
        });
      },

      renameArea: (oldName, newName) => {
        if (!newName.trim() || newName === oldName) return;
        const found = backendAreas.find((a) => a.nombre === oldName);
        if (found) updateArea.mutate({ id: found.id, data: { nombre: newName } });
        // Also update all collaborators in that area
        backendColabs
          .filter((c) => c.area === oldName)
          .forEach((c) => updateColaborador.mutate({ id: c.id, data: { area: newName } }));
      },

      removeArea: (name) => {
        const found = backendAreas.find((a) => a.nombre === name);
        if (found) deleteArea.mutate(found.id);
      },

      clearPendingCheck: (id) =>
        setPendingChecks((prev) => prev.filter((c) => c.id !== id)),
    }),
    [
      employees,
      areas,
      loadingColabs,
      loadingAreas,
      pendingChecks,
      backendColabs,
      backendAreas,
      createColaborador,
      updateColaborador,
      updateArea,
      deleteArea,
      pushCheck,
      qc,
    ],
  );

  return <EmployeesContext.Provider value={value}>{children}</EmployeesContext.Provider>;
}

export function useEmployees() {
  const ctx = useContext(EmployeesContext);
  if (!ctx) throw new Error("useEmployees must be used inside EmployeesProvider");
  return ctx;
}
