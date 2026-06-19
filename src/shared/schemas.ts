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

export const ExtractionSchema = z.object({
  tipoContrato: z.enum(CONTRACT_TYPES).nullable(),
  nombreColaborador: z.string().nullable(),
  cedula: z.string().nullable(),
  cargo: z.string().nullable(),
  fechaInicio: isoDate.nullable(),
  fechaFin: isoDate.nullable(),
  salario: z.number().nonnegative().nullable(),
  jornadaHorasSemana: z.number().int().positive().nullable(),
  // Confianza global 0-1 que reporta el modelo sobre su propia extraccion.
  confianza: z.number().min(0).max(1).nullable(),
});
export type Extraction = z.infer<typeof ExtractionSchema>;
