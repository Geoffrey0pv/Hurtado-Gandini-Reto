// src/shared/schemas.ts — Esquemas Zod de requests HTTP.
// (La salida de extraccion del LLM tendra su propio ExtractionSchema en la Hora 8-14.)
import { z } from "zod";

// Fecha 'YYYY-MM-DD' (compatible con columnas `date` de Postgres/Drizzle).
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato esperado YYYY-MM-DD");

// ── Auth ──────────────────────────────────────────────────────────────
export const RegisterSchema = z.object({
  orgName: z.string().min(2),
  nit: z.string().min(3),
  email: z.email(),
  password: z.string().min(6),
});
export type RegisterInput = z.infer<typeof RegisterSchema>;

export const LoginSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});
export type LoginInput = z.infer<typeof LoginSchema>;

// ── Organizacion ──────────────────────────────────────────────────────
export const UpdateOrgSchema = z.object({
  name: z.string().min(2),
});
export type UpdateOrgInput = z.infer<typeof UpdateOrgSchema>;

// ── Colaborador ───────────────────────────────────────────────────────
export const CreateColaboradorSchema = z.object({
  nombre: z.string().min(1),
  cedula: z.string().min(1),
  fechaNacimiento: isoDate.optional(),
  cargo: z.string().optional(),
});
export type CreateColaboradorInput = z.infer<typeof CreateColaboradorSchema>;

export const UpdateColaboradorSchema = CreateColaboradorSchema.partial();
export type UpdateColaboradorInput = z.infer<typeof UpdateColaboradorSchema>;

// UUID en params de ruta.
export const IdParamSchema = z.object({ id: z.uuid() });

// ── Salida estructurada del LLM (extraccion de contrato) ──────────────
// Se pasa como JSON Schema al parametro `format` de Ollama y se vuelve a
// validar la respuesta con este mismo schema (doble red de seguridad).
// Todos los campos son nullable: el LLM debe poner null si no lo halla,
// nunca inventar. Las columnas tipadas del contrato solo se llenan con lo
// que pase esta validacion.
export const CONTRACT_TYPES = [
  "TERMINO_FIJO", "TERMINO_INDEFINIDO", "OBRA_LABOR",
  "PRESTACION_SERVICIOS", "APRENDIZAJE", "OTRO",
] as const;

// Coerciones defensivas: el LLM (con format:"json") a veces devuelve tipos
// laxos (cedula como numero, salario con separadores, jornada como string).
// Normalizamos ANTES de validar para no descartar extracciones validas.
const nullableDigitsString = z.preprocess((v) => {
  if (v == null) return null;
  const s = String(v).replace(/\D/g, "");
  return s.length > 0 ? s : null;
}, z.string().nullable());

const nullableMoney = z.preprocess((v) => {
  if (v == null) return null;
  const n = Number(String(v).replace(/[^\d.]/g, ""));
  return Number.isFinite(n) ? n : null;
}, z.number().nonnegative().nullable());

const nullableInt = z.preprocess((v) => {
  if (v == null) return null;
  const n = Math.trunc(Number(v));
  return Number.isFinite(n) && n > 0 ? n : null;
}, z.number().int().positive().nullable());

export const ExtractionSchema = z.object({
  tipoContrato: z.enum(CONTRACT_TYPES).nullable().catch(null),
  nombreColaborador: z.string().nullable(),
  cedula: nullableDigitsString,
  cargo: z.string().nullable(),
  fechaInicio: isoDate.nullable().catch(null),
  fechaFin: isoDate.nullable().catch(null),
  salario: nullableMoney,
  jornadaHorasSemana: nullableInt,
  // Confianza global 0-1 que reporta el modelo sobre su propia extraccion.
  confianza: z.number().min(0).max(1).nullable().catch(null),
});
export type Extraction = z.infer<typeof ExtractionSchema>;

// ── RAG: Requests ─────────────────────────────────────────────────────
export const RagAnalyzeSchema = z.object({
  contratoId: z.uuid(),
  query: z.string().min(10, "La pregunta debe tener al menos 10 caracteres"),
});
export type RagAnalyzeInput = z.infer<typeof RagAnalyzeSchema>;

export const RagSimilarQuerySchema = z.object({
  q: z.string().min(1),
  k: z.coerce.number().int().min(1).max(20).default(5),
});
export type RagSimilarQuery = z.infer<typeof RagSimilarQuerySchema>;

export const AuditLogQuerySchema = z.object({
  action: z.string().optional(),
  entity: z.string().optional(),
  entityId: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});
export type AuditLogQuery = z.infer<typeof AuditLogQuerySchema>;

// ── RAG: Respuesta estructurada del LLM (doble red de seguridad) ──────
const SEVERIDAD = ["alta", "media", "baja"] as const;

export const RagRiskItemSchema = z.object({
  descripcion: z.string(),
  severidad: z.enum(SEVERIDAD).catch("media"),
  fuentesCitadas: z.array(z.string()).default([]),
  recomendacion: z.string(),
});
export type RagRiskItem = z.infer<typeof RagRiskItemSchema>;

export const RagResponseSchema = z.object({
  riesgos: z.array(RagRiskItemSchema).default([]),
  resumen: z.string(),
  abstenciones: z.array(z.string()).default([]),
  confianza: z.number().min(0).max(1).catch(0.5),
});
export type RagResponse = z.infer<typeof RagResponseSchema>;
