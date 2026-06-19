import { and, desc, eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { expedientes } from "../../db/schema.js";
import type { CreateExpedienteInput, UpdateExpedienteInput } from "../../shared/schemas.js";

export async function listExpedientes(orgId: string, colaboradorId?: string) {
  const conditions = [eq(expedientes.organizationId, orgId)];
  if (colaboradorId) conditions.push(eq(expedientes.colaboradorId, colaboradorId));
  return db
    .select()
    .from(expedientes)
    .where(and(...conditions))
    .orderBy(desc(expedientes.createdAt));
}

export async function getExpediente(orgId: string, id: string) {
  const [row] = await db
    .select()
    .from(expedientes)
    .where(and(eq(expedientes.organizationId, orgId), eq(expedientes.id, id)))
    .limit(1);
  return row ?? null;
}

export async function createExpediente(orgId: string, data: CreateExpedienteInput) {
  const [row] = await db
    .insert(expedientes)
    .values({
      organizationId: orgId,
      colaboradorId: data.colaboradorId,
      hechos: data.hechos,
      fechaHechos: data.fechaHechos,
      gravedad: data.gravedad,
      normaVulnerada: data.normaVulnerada ?? null,
      fechaDiligencia: data.fechaDiligencia ?? null,
      hora: data.hora ?? null,
      modalidad: data.modalidad ?? "Presencial",
      lugar: data.lugar ?? null,
      asistentes: data.asistentes ?? null,
      ciudad: data.ciudad ?? null,
      cartaTexto: data.cartaTexto ?? null,
    })
    .returning();
  return row;
}

export async function updateExpediente(orgId: string, id: string, data: UpdateExpedienteInput) {
  const patch: Record<string, unknown> = {};
  const fields = [
    "hechos", "fechaHechos", "gravedad", "normaVulnerada", "fechaDiligencia",
    "hora", "modalidad", "lugar", "asistentes", "ciudad", "estado",
    "cartaTexto", "etapas", "notificado",
  ] as const;
  for (const f of fields) {
    if ((data as Record<string, unknown>)[f] !== undefined) {
      patch[f] = (data as Record<string, unknown>)[f];
    }
  }
  const [row] = await db
    .update(expedientes)
    .set(patch)
    .where(and(eq(expedientes.organizationId, orgId), eq(expedientes.id, id)))
    .returning();
  return row ?? null;
}
