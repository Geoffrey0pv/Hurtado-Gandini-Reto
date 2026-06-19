import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type DocSlotKey =
  | "contrato"
  | "manual_funciones"
  | "afiliacion_eps"
  | "afiliacion_arl"
  | "afiliacion_pension"
  | "caja_compensacion"
  | "examen_ingreso"
  | "hoja_vida";

export const DOC_SLOTS: { key: DocSlotKey; label: string; descripcion: string; icon: string }[] = [
  { key: "contrato", label: "Contrato de trabajo firmado", descripcion: "Art. 39 CST · obligatorio", icon: "file-text" },
  { key: "manual_funciones", label: "Manual de funciones", descripcion: "Funciones del cargo entregadas al ingreso", icon: "clipboard-list" },
  { key: "afiliacion_eps", label: "Afiliación EPS", descripcion: "Sistema de salud (Ley 100)", icon: "heart-pulse" },
  { key: "afiliacion_arl", label: "Afiliación ARL", descripcion: "Riesgos laborales (Dec. 1295/94)", icon: "hard-hat" },
  { key: "afiliacion_pension", label: "Afiliación Pensión", descripcion: "Fondo de pensiones obligatorio", icon: "building-2" },
  { key: "caja_compensacion", label: "Caja de compensación", descripcion: "Aporte parafiscal del 4%", icon: "building" },
  { key: "examen_ingreso", label: "Examen médico de ingreso", descripcion: "Res. 2346/2007 SG-SST", icon: "stethoscope" },
  { key: "hoja_vida", label: "Hoja de vida + soportes", descripcion: "Diplomas, certificaciones y referencias", icon: "id-card" },
];

export type DocFile = { nombre: string; size: number; subidoEn: string };

type Store = {
  files: Record<string, Partial<Record<DocSlotKey, DocFile>>>;
  notes: Record<string, string>;
};

const STORAGE_KEY = "laborapp.documentos.v1";

type Ctx = {
  getFile: (empId: string, slot: DocSlotKey) => DocFile | undefined;
  setFile: (empId: string, slot: DocSlotKey, file: DocFile) => void;
  removeFile: (empId: string, slot: DocSlotKey) => void;
  getNote: (empId: string) => string;
  setNote: (empId: string, value: string) => void;
};

const DocumentosContext = createContext<Ctx | null>(null);

export function DocumentosProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Store>(() => {
    if (typeof window === "undefined") return { files: {}, notes: {} };
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as Store) : { files: {}, notes: {} };
    } catch { return { files: {}, notes: {} }; }
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* ignore */ }
  }, [state]);

  const setFile = useCallback<Ctx["setFile"]>((empId, slot, file) => {
    setState((prev) => ({
      ...prev,
      files: { ...prev.files, [empId]: { ...(prev.files[empId] || {}), [slot]: file } },
    }));
  }, []);

  const removeFile = useCallback<Ctx["removeFile"]>((empId, slot) => {
    setState((prev) => {
      const cur = { ...(prev.files[empId] || {}) };
      delete cur[slot];
      return { ...prev, files: { ...prev.files, [empId]: cur } };
    });
  }, []);

  const setNote = useCallback<Ctx["setNote"]>((empId, value) => {
    setState((prev) => ({ ...prev, notes: { ...prev.notes, [empId]: value } }));
  }, []);

  const value = useMemo<Ctx>(() => ({
    getFile: (empId, slot) => state.files[empId]?.[slot],
    setFile,
    removeFile,
    getNote: (empId) => state.notes[empId] || "",
    setNote,
  }), [state, setFile, removeFile, setNote]);

  return <DocumentosContext.Provider value={value}>{children}</DocumentosContext.Provider>;
}

export function useDocumentos() {
  const ctx = useContext(DocumentosContext);
  if (!ctx) throw new Error("useDocumentos must be used inside DocumentosProvider");
  return ctx;
}
