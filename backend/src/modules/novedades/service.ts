import { and, desc, eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { novedades } from "../../db/schema.js";
import type { CreateNovedadInput } from "../../shared/schemas.js";

export async function listNovedades(orgId: string, colaboradorId?: string) {
  const conditions = [eq(novedades.organizationId, orgId)];
  if (colaboradorId) conditions.push(eq(novedades.colaboradorId, colaboradorId));
  return db
    .select()
    .from(novedades)
    .where(and(...conditions))
    .orderBy(desc(novedades.fecha));
}

export async function createNovedad(orgId: string, data: CreateNovedadInput) {
  const [row] = await db
    .insert(novedades)
    .values({
      organizationId: orgId,
      colaboradorId: data.colaboradorId,
      tipo: data.tipo,
      descripcion: data.descripcion ?? null,
      fecha: data.fecha,
      monto: data.monto != null ? String(data.monto) : null,
      origen: data.origen ?? "manual",
    })
    .returning();
  return row;
}

export async function deleteNovedad(orgId: string, id: string) {
  const [row] = await db
    .delete(novedades)
    .where(and(eq(novedades.organizationId, orgId), eq(novedades.id, id)))
    .returning({ id: novedades.id });
  return row ?? null;
}
