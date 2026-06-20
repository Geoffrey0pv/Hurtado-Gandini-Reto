// src/modules/colaboradores/service.ts
// CADA query filtra por organizationId (multi-tenant). No hay metodo que
// reciba solo un id sin el orgId: asi es imposible cruzar tenants por error.
import { and, desc, eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { colaboradores } from "../../db/schema.js";
import type {
  CreateColaboradorInput,
  UpdateColaboradorInput,
} from "../../shared/schemas.js";

export async function listColaboradores(orgId: string) {
  return db
    .select()
    .from(colaboradores)
    .where(eq(colaboradores.organizationId, orgId))
    .orderBy(desc(colaboradores.createdAt));
}

export async function getColaborador(orgId: string, id: string) {
  const [row] = await db
    .select()
    .from(colaboradores)
    .where(and(eq(colaboradores.organizationId, orgId), eq(colaboradores.id, id)))
    .limit(1);
  return row ?? null;
}

export async function createColaborador(orgId: string, data: CreateColaboradorInput) {
  const [row] = await db
    .insert(colaboradores)
    .values({
      organizationId: orgId,
      nombre: data.nombre,
      cedula: data.cedula,
      fechaNacimiento: data.fechaNacimiento ?? null,
      cargo: data.cargo ?? null,
      email: data.email ?? null,
      telefono: data.telefono ?? null,
      area: data.area ?? null,
      jefeId: data.jefeId ?? null,
      estado: data.estado ?? "activo",
      estadoVinculacion: data.estadoVinculacion ?? "activo",
      presencia: data.presencia ?? "en_oficina",
      riesgo: data.riesgo ?? "bajo",
      fueros: data.fueros ?? [],
      arlNivel: data.arlNivel ?? 2,
      origen: data.origen ?? "manual",
      tipoContrato: data.tipoContrato ?? null,
      fechaInicio: data.fechaInicio ?? null,
      fechaFin: data.fechaFin ?? null,
      salario: data.salario != null ? String(data.salario) : null,
      jornadaHorasSemana: data.jornadaHorasSemana ?? null,
    })
    .returning();
  return row;
}

export async function updateColaborador(
  orgId: string,
  id: string,
  data: UpdateColaboradorInput,
) {
  const patch: Record<string, unknown> = {};
  if (data.nombre !== undefined) patch.nombre = data.nombre;
  if (data.cedula !== undefined) patch.cedula = data.cedula;
  if (data.fechaNacimiento !== undefined) patch.fechaNacimiento = data.fechaNacimiento;
  if (data.cargo !== undefined) patch.cargo = data.cargo;
  if (data.email !== undefined) patch.email = data.email;
  if (data.telefono !== undefined) patch.telefono = data.telefono;
  if (data.area !== undefined) patch.area = data.area;
  if (data.jefeId !== undefined) patch.jefeId = data.jefeId;
  if (data.estado !== undefined) patch.estado = data.estado;
  if (data.estadoVinculacion !== undefined) patch.estadoVinculacion = data.estadoVinculacion;
  if (data.presencia !== undefined) patch.presencia = data.presencia;
  if (data.riesgo !== undefined) patch.riesgo = data.riesgo;
  if (data.fueros !== undefined) patch.fueros = data.fueros;
  if (data.arlNivel !== undefined) patch.arlNivel = data.arlNivel;
  if (data.origen !== undefined) patch.origen = data.origen;
  if (data.tipoContrato !== undefined) patch.tipoContrato = data.tipoContrato;
  if (data.fechaInicio !== undefined) patch.fechaInicio = data.fechaInicio;
  if (data.fechaFin !== undefined) patch.fechaFin = data.fechaFin;
  if (data.salario !== undefined) {
    patch.salario = data.salario != null ? String(data.salario) : null;
  }
  if (data.jornadaHorasSemana !== undefined) patch.jornadaHorasSemana = data.jornadaHorasSemana;

  const [row] = await db
    .update(colaboradores)
    .set(patch)
    .where(and(eq(colaboradores.organizationId, orgId), eq(colaboradores.id, id)))
    .returning();
  return row ?? null;
}

export async function deleteColaborador(orgId: string, id: string) {
  const [row] = await db
    .delete(colaboradores)
    .where(and(eq(colaboradores.organizationId, orgId), eq(colaboradores.id, id)))
    .returning({ id: colaboradores.id });
  return row ?? null;
}
