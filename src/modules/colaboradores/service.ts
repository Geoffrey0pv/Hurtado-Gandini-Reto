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
    })
    .returning();
  return row;
}

export async function updateColaborador(
  orgId: string,
  id: string,
  data: UpdateColaboradorInput,
) {
  const [row] = await db
    .update(colaboradores)
    .set({
      ...(data.nombre !== undefined ? { nombre: data.nombre } : {}),
      ...(data.cedula !== undefined ? { cedula: data.cedula } : {}),
      ...(data.fechaNacimiento !== undefined ? { fechaNacimiento: data.fechaNacimiento } : {}),
      ...(data.cargo !== undefined ? { cargo: data.cargo } : {}),
    })
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
