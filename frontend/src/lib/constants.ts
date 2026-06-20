// lib/constants.ts — Constantes y etiquetas de dominio compartidas por la UI.
//
// Antes vivían dentro de varios *-store.tsx client-side (documentos, disciplinario,
// novedades) que ya fueron reemplazados por hooks de la API real. Aquí solo quedan
// las constantes/labels de presentación, sin estado ni persistencia.

// ── Documentos (slots exigidos por la legislación laboral colombiana) ──────
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
  {
    key: "contrato",
    label: "Contrato de trabajo firmado",
    descripcion: "Art. 39 CST · obligatorio",
    icon: "file-text",
  },
  {
    key: "manual_funciones",
    label: "Manual de funciones",
    descripcion: "Funciones del cargo entregadas al ingreso",
    icon: "clipboard-list",
  },
  {
    key: "afiliacion_eps",
    label: "Afiliación EPS",
    descripcion: "Sistema de salud (Ley 100)",
    icon: "heart-pulse",
  },
  {
    key: "afiliacion_arl",
    label: "Afiliación ARL",
    descripcion: "Riesgos laborales (Dec. 1295/94)",
    icon: "hard-hat",
  },
  {
    key: "afiliacion_pension",
    label: "Afiliación Pensión",
    descripcion: "Fondo de pensiones obligatorio",
    icon: "building-2",
  },
  {
    key: "caja_compensacion",
    label: "Caja de compensación",
    descripcion: "Aporte parafiscal del 4%",
    icon: "building",
  },
  {
    key: "examen_ingreso",
    label: "Examen médico de ingreso",
    descripcion: "Res. 2346/2007 SG-SST",
    icon: "stethoscope",
  },
  {
    key: "hoja_vida",
    label: "Hoja de vida + soportes",
    descripcion: "Diplomas, certificaciones y referencias",
    icon: "id-card",
  },
];

// ── Disciplinario (gravedad y etapas del debido proceso) ───────────────────
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

export type EtapaKey =
  | "conocimiento"
  | "citacion"
  | "diligencia"
  | "analisis"
  | "decision"
  | "recursos";

export const ETAPAS: { key: EtapaKey; label: string }[] = [
  { key: "conocimiento", label: "Conocimiento del hecho" },
  { key: "citacion", label: "Citación a descargos" },
  { key: "diligencia", label: "Diligencia de descargos" },
  { key: "analisis", label: "Análisis y valoración" },
  { key: "decision", label: "Decisión y comunicación" },
  { key: "recursos", label: "Recursos / firmeza" },
];

// ── Novedades de nómina ────────────────────────────────────────────────────
export type NovedadTipo =
  | "vacaciones"
  | "incapacidad"
  | "licencia"
  | "permiso_remunerado"
  | "suspension";

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

// Días calendario inclusivos entre dos fechas ISO (YYYY-MM-DD).
export function diasEntre(desde: string, hasta: string): number {
  const a = new Date(desde + "T00:00:00");
  const b = new Date(hasta + "T00:00:00");
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime()) || b < a) return 0;
  return Math.floor((b.getTime() - a.getTime()) / 86_400_000) + 1;
}
