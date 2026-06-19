// src/modules/contratos/service.ts
import { and, desc, eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { contratos, ingestionJobs } from "../../db/schema.js";

// Crea el contrato (PENDING) y su ingestion_job en una transaccion.
// Se llama tras subir el PDF a MinIO (ya tenemos fileKey).
export async function createContratoWithJob(params: {
  organizationId: string;
  colaboradorId: string;
  fileKey: string;
}) {
  return db.transaction(async (tx) => {
    const [contrato] = await tx
      .insert(contratos)
      .values({
        organizationId: params.organizationId,
        colaboradorId: params.colaboradorId,
        fileKey: params.fileKey,
        status: "PENDING",
      })
      .returning();

    const [job] = await tx
      .insert(ingestionJobs)
      .values({
        organizationId: params.organizationId,
        contratoId: contrato.id,
        fileKey: params.fileKey,
        status: "PENDING",
      })
      .returning();

    return { contrato, job };
  });
}

export async function listContratos(orgId: string) {
  return db
    .select()
    .from(contratos)
    .where(eq(contratos.organizationId, orgId))
    .orderBy(desc(contratos.createdAt));
}

export async function getContrato(orgId: string, id: string) {
  const [row] = await db
    .select()
    .from(contratos)
    .where(and(eq(contratos.organizationId, orgId), eq(contratos.id, id)))
    .limit(1);
  return row ?? null;
}

export async function getIngestionJob(orgId: string, jobId: string) {
  const [row] = await db
    .select()
    .from(ingestionJobs)
    .where(and(eq(ingestionJobs.organizationId, orgId), eq(ingestionJobs.id, jobId)))
    .limit(1);
  return row ?? null;
}
