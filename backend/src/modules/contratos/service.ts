// src/modules/contratos/service.ts
import { and, desc, eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { colaboradores, contratos, ingestionJobs } from "../../db/schema.js";
import type { UpdateContratoInput } from "../../shared/schemas.js";

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

// Corrección manual de las variables extraídas. Actualiza las columnas tipadas del
// contrato, fusiona los cambios en el JSON `extracted` (marcándolo como editado) y
// reconcilia el nombre/cargo del colaborador. Solo toca lo que el usuario envió.
export async function updateContratoExtraido(
  orgId: string,
  id: string,
  data: UpdateContratoInput,
) {
  const [contrato] = await db
    .select()
    .from(contratos)
    .where(and(eq(contratos.organizationId, orgId), eq(contratos.id, id)))
    .limit(1);
  if (!contrato) return null;

  const prevExtracted = (contrato.extracted ?? {}) as Record<string, unknown>;
  const mergedExtracted: Record<string, unknown> = { ...prevExtracted };
  for (const k of Object.keys(data) as (keyof UpdateContratoInput)[]) {
    mergedExtracted[k] = data[k];
  }
  mergedExtracted.editadoManualmente = true;

  const set: Record<string, unknown> = { extracted: mergedExtracted };
  if ("tipoContrato" in data) set.tipoContrato = data.tipoContrato;
  if ("fechaInicio" in data) set.fechaInicio = data.fechaInicio;
  if ("fechaFin" in data) set.fechaFin = data.fechaFin;
  if ("salario" in data) set.salario = data.salario != null ? String(data.salario) : null;
  if ("jornadaHorasSemana" in data) set.jornadaHorasSemana = data.jornadaHorasSemana;

  const [updated] = await db
    .update(contratos)
    .set(set)
    .where(and(eq(contratos.organizationId, orgId), eq(contratos.id, id)))
    .returning();

  // Reconciliar datos del colaborador (nombre/cargo) si se editaron.
  const colUpdate: Record<string, string> = {};
  if (data.nombreColaborador) colUpdate.nombre = data.nombreColaborador;
  if (data.cargo) colUpdate.cargo = data.cargo;
  if (Object.keys(colUpdate).length > 0) {
    await db
      .update(colaboradores)
      .set(colUpdate)
      .where(
        and(
          eq(colaboradores.id, contrato.colaboradorId),
          eq(colaboradores.organizationId, orgId),
        ),
      );
  }

  return updated;
}

export async function getIngestionJob(orgId: string, jobId: string) {
  const [row] = await db
    .select()
    .from(ingestionJobs)
    .where(and(eq(ingestionJobs.organizationId, orgId), eq(ingestionJobs.id, jobId)))
    .limit(1);
  return row ?? null;
}
