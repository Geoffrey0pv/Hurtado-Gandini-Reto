// src/workers/processors/extract.ts — Procesador de la cola "extract".
// Descarga el PDF -> texto (pdf-parse/OCR) -> LLM (Zod) -> persiste contrato
// con columnas tipadas validadas -> encola el job de embeddings.
import { and, eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { colaboradores, contratos, ingestionJobs } from "../../db/schema.js";
import { extractContract } from "../../lib/llm.js";
import { extractTextFromPdf } from "../../lib/ocr.js";
import { analysisQueue, embedQueue, type ExtractJobData } from "../../lib/queue.js";
import { downloadBuffer } from "../../lib/storage.js";
import { writeAuditLog } from "../../shared/audit.js";

export async function runIngestion(data: ExtractJobData): Promise<void> {
  const { ingestionJobId, contratoId, colaboradorId, organizationId, fileKey, complex } = data;

  try {
    await db.update(contratos).set({ status: "PROCESSING" }).where(eq(contratos.id, contratoId));
    await db
      .update(ingestionJobs)
      .set({ status: "PROCESSING", updatedAt: new Date() })
      .where(eq(ingestionJobs.id, ingestionJobId));

    // 7-8) Descargar + extraer texto (con fallback OCR).
    const buffer = await downloadBuffer(fileKey);
    const { text, method, chars } = await extractTextFromPdf(buffer);
    if (!text || chars < 1) {
      throw new Error("No se pudo extraer texto del PDF (ni nativo ni OCR)");
    }

    // 9-10) LLM con salida estructurada + validacion Zod (dentro de extractContract).
    const { data: extraction, model } = await extractContract(text, complex);

    // 11) Persistir extraccion completa (jsonb) + columnas tipadas validadas.
    //     undefined => drizzle no toca la columna (deja el null por defecto).
    await db
      .update(contratos)
      .set({
        rawText: text,
        extracted: extraction,
        tipoContrato: extraction.tipoContrato ?? undefined,
        fechaInicio: extraction.fechaInicio ?? undefined,
        fechaFin: extraction.fechaFin ?? undefined,
        salario: extraction.salario != null ? String(extraction.salario) : undefined,
        jornadaHorasSemana: extraction.jornadaHorasSemana ?? undefined,
        status: "DONE",
      })
      .where(eq(contratos.id, contratoId));

    // Reconciliacion del colaborador con datos del contrato (no toca cedula
    // para no chocar con el unique (orgId, cedula)).
    // TODO: fix for production — upsert completo por cedula+orgId si difiere.
    const colUpdate: Partial<{ nombre: string; cargo: string }> = {};
    if (extraction.nombreColaborador) colUpdate.nombre = extraction.nombreColaborador;
    if (extraction.cargo) colUpdate.cargo = extraction.cargo;
    if (Object.keys(colUpdate).length > 0) {
      await db
        .update(colaboradores)
        .set(colUpdate)
        .where(and(eq(colaboradores.id, colaboradorId), eq(colaboradores.organizationId, organizationId)));
    }

    // 12) Encolar embeddings (cola separada, mas concurrencia).
    await embedQueue.add("embed", { contratoId, organizationId });

    // 13) Encolar analisis determinista (reglas: jornada/liquidacion/alertas)
    //     que corre automaticamente tras la extraccion y deja traza en audit_logs.
    await analysisQueue.add("analysis", { contratoId, organizationId });

    // 15) Trazabilidad.
    await writeAuditLog({
      organizationId,
      action: "EXTRACT_CONTRACT",
      entity: "contrato",
      entityId: contratoId,
      aiModel: model,
      payload: { method, chars, extraction },
    });

    // 16) Cierre del job de ingestion.
    await db
      .update(ingestionJobs)
      .set({ status: "DONE", updatedAt: new Date() })
      .where(eq(ingestionJobs.id, ingestionJobId));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    // No persistir basura: marcar FAILED y dejar rastro.
    await db.update(contratos).set({ status: "FAILED" }).where(eq(contratos.id, contratoId));
    await db
      .update(ingestionJobs)
      .set({ status: "FAILED", error: message, updatedAt: new Date() })
      .where(eq(ingestionJobs.id, ingestionJobId));
    await writeAuditLog({
      organizationId,
      action: "EXTRACT_CONTRACT_FAILED",
      entity: "contrato",
      entityId: contratoId,
      payload: { error: message },
    });
    throw err; // que BullMQ registre el fallo y reintente
  }
}
