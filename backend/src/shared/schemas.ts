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
  email: z.string().email().optional(),
  telefono: z.string().optional(),
  // area/jefeId aceptan null para poder "limpiar" el valor: al eliminar un area
  // sus colaboradores pasan a area=null ("Sin area"), y al promover a alguien a
  // la cima se le quita el jefe (jefeId=null).
  area: z.string().nullable().optional(),
  jefeId: z.uuid().nullable().optional(),
  estado: z.enum(["activo", "inactivo"]).optional(),
  estadoVinculacion: z.enum(["activo", "retirado"]).optional(),
  presencia: z.enum(["en_oficina", "vacaciones", "permiso", "incapacidad"]).optional(),
  riesgo: z.enum(["alto", "medio", "bajo"]).optional(),
  fueros: z.array(z.string()).optional(),
  arlNivel: z.number().int().min(1).max(5).optional(),
  origen: z.enum(["manual", "contrato"]).optional(),
});
export type CreateColaboradorInput = z.infer<typeof CreateColaboradorSchema>;

export const UpdateColaboradorSchema = CreateColaboradorSchema.partial();
export type UpdateColaboradorInput = z.infer<typeof UpdateColaboradorSchema>;

// ── Areas ─────────────────────────────────────────────────────────────
export const CreateAreaSchema = z.object({
  nombre: z.string().min(1),
  orden: z.number().int().optional(),
});
export type CreateAreaInput = z.infer<typeof CreateAreaSchema>;

export const UpdateAreaSchema = z.object({
  nombre: z.string().min(1).optional(),
  orden: z.number().int().optional(),
});
export type UpdateAreaInput = z.infer<typeof UpdateAreaSchema>;

// ── Timesheet ──────────────────────────────────────────────────────────
const TIPO_HORA_VALUES = [
  "extra_diurna", "extra_nocturna", "recargo_nocturno",
  "recargo_dom_fest", "recargo_dom_fest_nocturno",
  "extra_dom_fest_diurna", "extra_dom_fest_nocturna",
  "pto", "permiso", "incapacidad", "ordinaria",
] as const;

export const CreateTimesheetSchema = z.object({
  colaboradorId: z.uuid(),
  fecha: isoDate,
  horas: z.number().min(0.5).max(24),
  tipo: z.enum(TIPO_HORA_VALUES),
  notas: z.string().optional(),
});
export type CreateTimesheetInput = z.infer<typeof CreateTimesheetSchema>;

// ── Disciplinario ──────────────────────────────────────────────────────
export const CreateExpedienteSchema = z.object({
  colaboradorId: z.uuid(),
  hechos: z.string().min(1),
  fechaHechos: isoDate,
  gravedad: z.enum(["leve", "grave", "gravisima"]),
  normaVulnerada: z.string().optional(),
  fechaDiligencia: isoDate.optional(),
  hora: z.string().optional(),
  modalidad: z.enum(["Presencial", "Virtual"]).optional(),
  lugar: z.string().optional(),
  asistentes: z.string().optional(),
  ciudad: z.string().optional(),
  cartaTexto: z.string().optional(),
});
export type CreateExpedienteInput = z.infer<typeof CreateExpedienteSchema>;

export const UpdateExpedienteSchema = z.object({
  hechos: z.string().optional(),
  fechaHechos: isoDate.optional(),
  gravedad: z.enum(["leve", "grave", "gravisima"]).optional(),
  normaVulnerada: z.string().optional(),
  fechaDiligencia: isoDate.optional(),
  hora: z.string().optional(),
  modalidad: z.enum(["Presencial", "Virtual"]).optional(),
  lugar: z.string().optional(),
  asistentes: z.string().optional(),
  ciudad: z.string().optional(),
  estado: z.enum(["abierto", "cerrado"]).optional(),
  cartaTexto: z.string().optional(),
  etapas: z.record(z.string(), z.boolean()).optional(),
  notificado: z.array(z.object({ canal: z.enum(["email", "telefono"]), fecha: isoDate })).optional(),
});
export type UpdateExpedienteInput = z.infer<typeof UpdateExpedienteSchema>;

// ── Novedades ──────────────────────────────────────────────────────────
export const CreateNovedadSchema = z.object({
  colaboradorId: z.uuid(),
  tipo: z.string().min(1),
  descripcion: z.string().optional(),
  fecha: isoDate,
  monto: z.number().optional(),
  origen: z.string().optional(),
});
export type CreateNovedadInput = z.infer<typeof CreateNovedadSchema>;

// Rango opcional para el calendario de obligaciones recurrentes.
export const ObligacionesQuerySchema = z.object({
  desde: isoDate.optional(),
  hasta: isoDate.optional(),
});
export type ObligacionesQuery = z.infer<typeof ObligacionesQuerySchema>;

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

// Correccion manual de las variables extraidas (post-update humano del contrato).
// Todos los campos son opcionales: solo se actualiza lo que el usuario edita.
export const UpdateContratoSchema = z.object({
  tipoContrato: z.enum(CONTRACT_TYPES).nullable().optional(),
  nombreColaborador: z.string().nullable().optional(),
  cedula: z.string().nullable().optional(),
  cargo: z.string().nullable().optional(),
  fechaInicio: isoDate.nullable().optional(),
  fechaFin: isoDate.nullable().optional(),
  salario: z.number().nonnegative().nullable().optional(),
  jornadaHorasSemana: z.number().int().positive().nullable().optional(),
});
export type UpdateContratoInput = z.infer<typeof UpdateContratoSchema>;

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
