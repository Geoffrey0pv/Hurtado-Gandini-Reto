import { and, asc, eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { areas } from "../../db/schema.js";
import type { CreateAreaInput, UpdateAreaInput } from "../../shared/schemas.js";

export async function listAreas(orgId: string) {
  return db
    .select()
    .from(areas)
    .where(eq(areas.organizationId, orgId))
    .orderBy(asc(areas.orden), asc(areas.nombre));
}

export async function createArea(orgId: string, data: CreateAreaInput) {
  const [row] = await db
    .insert(areas)
    .values({ organizationId: orgId, nombre: data.nombre, orden: data.orden ?? 0 })
    .returning();
  return row;
}

export async function updateArea(orgId: string, id: string, data: UpdateAreaInput) {
  const patch: Record<string, unknown> = {};
  if (data.nombre !== undefined) patch.nombre = data.nombre;
  if (data.orden !== undefined) patch.orden = data.orden;
  const [row] = await db
    .update(areas)
    .set(patch)
    .where(and(eq(areas.organizationId, orgId), eq(areas.id, id)))
    .returning();
  return row ?? null;
}

export async function deleteArea(orgId: string, id: string) {
  const [row] = await db
    .delete(areas)
    .where(and(eq(areas.organizationId, orgId), eq(areas.id, id)))
    .returning({ id: areas.id });
  return row ?? null;
}
