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
import { useContratos } from "@/hooks/useContratos";
import { backendToEmployee, employeeToCreatePayload } from "./types";
import type { Employee } from "./mock/data";
import type { BackendContrato } from "./types";

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
  // `jefe`/`area` pueden ser null para "limpiar": area null = "Sin área",
  // jefe null = reporta directo a la cima (sin jefe).
  moveEmployee: (
    id: string,
    changes: { area?: string | null; jefe?: string | null },
  ) => Employee | undefined;
  reorderAreas: (next: string[]) => void;
  addArea: (nombre: string) => boolean;
  renameArea: (oldName: string, newName: string) => void;
  // Devuelve cuántos colaboradores quedaron sin área (reasignados).
  removeArea: (name: string) => number;
  clearPendingCheck: (id: string) => void;
};

const EmployeesContext = createContext<Ctx | null>(null);

export function EmployeesProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const { data: backendColabs = [], isLoading: loadingColabs } = useColaboradores();
  const { data: backendAreas = [], isLoading: loadingAreas } = useAreas();
  const { data: backendContratos = [] } = useContratos();
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

  // Contrato "vigente" por colaborador: preferimos el procesado (DONE) y, entre
  // ellos, el más reciente. Sus datos (salario, jornada, tipo, fechas) alimentan
  // el perfil automáticamente (extraídos del contrato), en vez de valores por defecto.
  const contratoByColab = useMemo(() => {
    const map = new Map<string, BackendContrato>();
    for (const c of backendContratos) {
      const prev = map.get(c.colaboradorId);
      if (!prev) {
        map.set(c.colaboradorId, c);
        continue;
      }
      const mejor =
        (c.status === "DONE" ? 1 : 0) - (prev.status === "DONE" ? 1 : 0) ||
        c.createdAt.localeCompare(prev.createdAt);
      if (mejor > 0) map.set(c.colaboradorId, c);
    }
    return map;
  }, [backendContratos]);

  const employees: Employee[] = useMemo(
    () =>
      backendColabs.map((c) => {
        const jefe = c.jefeId ? colabById.get(c.jefeId) : undefined;
        return backendToEmployee(c, contratoByColab.get(c.id), jefe);
      }),
    [backendColabs, colabById, contratoByColab],
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

        // Normalizamos los "valores vacíos" al texto que usa el UI:
        // area null → "Sin área", jefe null → "—".
        const nextArea = changes.area === undefined ? undefined : (changes.area ?? "Sin área");
        const nextJefe = changes.jefe === undefined ? undefined : (changes.jefe ?? "—");

        const changedArea = nextArea !== undefined && nextArea !== emp.area;
        const changedJefe = nextJefe !== undefined && nextJefe !== emp.jefe;

        if (changedArea || changedJefe) {
          const motivo = changedArea && changedJefe
            ? `Cambió de área (${emp.area} → ${nextArea}) y de jefe (${emp.jefe} → ${nextJefe}).`
            : changedArea
              ? `Cambió de área: ${emp.area} → ${nextArea}.`
              : `Cambió jefe inmediato: ${emp.jefe} → ${nextJefe}.`;

          const updated: Employee = {
            ...emp,
            area: nextArea ?? emp.area,
            jefe: nextJefe ?? emp.jefe,
          };

          // Resolver jefeId: null = sin jefe (cima); nombre desconocido (p. ej.
          // el CEO sintético) también equivale a "sin jefe en BD".
          let jefeIdField: string | null | undefined;
          if (changes.jefe !== undefined) {
            jefeIdField = changes.jefe
              ? (backendColabs.find((c) => c.nombre === changes.jefe)?.id ?? null)
              : null;
          }

          // area: null limpia la columna; un string la asigna.
          const areaField = changes.area === undefined ? undefined : changes.area;

          updateColaborador.mutate({
            id,
            data: {
              ...(areaField !== undefined ? { area: areaField } : {}),
              ...(jefeIdField !== undefined ? { jefeId: jefeIdField } : {}),
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

      addArea: (nombre) => {
        const name = nombre.trim();
        if (!name) return false;
        // Evita duplicados (ignorando mayúsculas/minúsculas).
        if (areas.some((a) => a.toLowerCase() === name.toLowerCase())) return false;
        createArea.mutate({ nombre: name, orden: areas.length });
        return true;
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
        // Antes de borrar el área, reasignamos a sus colaboradores a "Sin área"
        // (area=null) para no dejar referencias colgando ni perderlos del
        // organigrama (siguen visibles bajo el grupo "Sin área").
        const miembros = backendColabs.filter((c) => c.area === name);
        miembros.forEach((c) =>
          updateColaborador.mutate({ id: c.id, data: { area: null } }),
        );
        if (found) deleteArea.mutate(found.id);
        return miembros.length;
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
      createArea,
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
