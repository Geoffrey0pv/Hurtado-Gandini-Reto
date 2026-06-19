import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type Gravedad = "leve" | "grave" | "gravisima";

export const GRAVEDAD_LABEL: Record<Gravedad, string> = {
  leve: "Leve",
  grave: "Grave",
  gravisima: "Gravísima",
};

export const GRAVEDAD_TONE: Record<Gravedad, "success" | "warning" | "primary"> = {
  leve: "success",
  grave: "warning",
  gravisima: "primary",
};

export type EtapaKey = "conocimiento" | "citacion" | "diligencia" | "analisis" | "decision" | "recursos";

export const ETAPAS: { key: EtapaKey; label: string }[] = [
  { key: "conocimiento", label: "Conocimiento del hecho" },
  { key: "citacion", label: "Citación a descargos" },
  { key: "diligencia", label: "Diligencia de descargos" },
  { key: "analisis", label: "Análisis y valoración" },
  { key: "decision", label: "Decisión y comunicación" },
  { key: "recursos", label: "Recursos / firmeza" },
];

export type Expediente = {
  id: string;
  empleadoId: string;
  hechos: string;
  fechaHechos: string; // ISO yyyy-mm-dd
  gravedad: Gravedad;
  normaVulnerada: string;
  fechaDiligencia: string;
  hora: string;
  modalidad: "Presencial" | "Virtual";
  lugar: string;
  asistentes: string;
  ciudad: string;
  estado: "abierto" | "cerrado";
  createdAt: string;
  cartaTexto: string;
  etapas: Record<EtapaKey, boolean>;
  notificado?: { canal: "email" | "telefono"; fecha: string }[];
};

const STORAGE_KEY = "laborapp.disciplinario.v1";

type Ctx = {
  expedientes: Expediente[];
  add: (e: Omit<Expediente, "id" | "createdAt" | "etapas" | "estado"> & { etapas?: Partial<Record<EtapaKey, boolean>>; estado?: "abierto" | "cerrado" }) => Expediente;
  remove: (id: string) => void;
  toggleEtapa: (id: string, etapa: EtapaKey) => void;
  setEstado: (id: string, estado: "abierto" | "cerrado") => void;
  registrarNotificacion: (id: string, canal: "email" | "telefono") => void;
  forEmployee: (empId: string) => Expediente[];
};

const Ctx = createContext<Ctx | null>(null);

export function DisciplinarioProvider({ children }: { children: ReactNode }) {
  const [expedientes, setExpedientes] = useState<Expediente[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as Expediente[]) : [];
    } catch { return []; }
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(expedientes)); } catch { /* ignore */ }
  }, [expedientes]);

  const add = useCallback<Ctx["add"]>((data) => {
    const base: Record<EtapaKey, boolean> = {
      conocimiento: true,
      citacion: true,
      diligencia: false,
      analisis: false,
      decision: false,
      recursos: false,
    };
    const item: Expediente = {
      ...data,
      id: `exp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      createdAt: new Date().toISOString(),
      estado: data.estado ?? "abierto",
      etapas: { ...base, ...(data.etapas ?? {}) },
    };
    setExpedientes((prev) => [item, ...prev]);
    return item;
  }, []);

  const value = useMemo<Ctx>(() => ({
    expedientes,
    add,
    remove: (id) => setExpedientes((prev) => prev.filter((x) => x.id !== id)),
    toggleEtapa: (id, etapa) => setExpedientes((prev) => prev.map((x) => x.id === id ? { ...x, etapas: { ...x.etapas, [etapa]: !x.etapas[etapa] } } : x)),
    setEstado: (id, estado) => setExpedientes((prev) => prev.map((x) => x.id === id ? { ...x, estado } : x)),
    registrarNotificacion: (id, canal) => setExpedientes((prev) => prev.map((x) => x.id === id ? { ...x, notificado: [...(x.notificado ?? []), { canal, fecha: new Date().toISOString() }] } : x)),
    forEmployee: (empId) => expedientes.filter((x) => x.empleadoId === empId),
  }), [expedientes, add]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useDisciplinario() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useDisciplinario must be used inside DisciplinarioProvider");
  return ctx;
}
