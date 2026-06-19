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
