// src/modules/contratos/routes.ts — Subida de PDF y consulta de contratos.
import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { IdParamSchema } from "../../shared/schemas.js";
import { httpError } from "../../shared/errors.js";
import { getTenant } from "../../shared/tenant.js";
import { extractQueue } from "../../lib/queue.js";
import { presignGet, uploadStream } from "../../lib/storage.js";
import { analizarContrato } from "../../rules/analisis.js";
import { writeAuditLog } from "../../shared/audit.js";
import { getColaborador } from "../colaboradores/service.js";
import {
  createContratoWithJob,
  getContrato,
  getIngestionJob,
  listContratos,
} from "./service.js";

export async function contratosRoutes(app: FastifyInstance) {
  app.addHook("preHandler", app.authenticate);

  // POST /contratos/upload — multipart: campo colaboradorId + archivo PDF.
  // Sube a MinIO, crea contrato(PENDING)+job, encola extraccion, responde 202.
  app.post("/upload", async (req, reply) => {
    const { organizationId } = getTenant(req);

    const data = await req.file();
    if (!data) throw httpError(400, "Falta el archivo (campo 'file' multipart)");

    // colaboradorId viene como campo de texto ANTES del archivo en el form.
    const colaboradorId = (data.fields.colaboradorId as { value?: string } | undefined)?.value;
    if (!colaboradorId) {
      // hay que drenar el stream para no colgar la conexion
      data.file.resume();
      throw httpError(400, "Falta el campo 'colaboradorId'");
    }

    // El colaborador debe existir y pertenecer al tenant.
    const colaborador = await getColaborador(organizationId, colaboradorId);
    if (!colaborador) {
      data.file.resume();
      throw httpError(404, "Colaborador no encontrado en la organizacion");
    }

    if (data.mimetype && data.mimetype !== "application/pdf") {
      data.file.resume();
      throw httpError(415, "Solo se aceptan archivos PDF");
    }

    // Stream directo a MinIO (no se bufferiza el PDF en memoria).
    const fileKey = `${organizationId}/${randomUUID()}.pdf`;
    await uploadStream(fileKey, data.file, "application/pdf");

    const { contrato, job } = await createContratoWithJob({
      organizationId,
      colaboradorId,
      fileKey,
    });

    await extractQueue.add("ingest", {
      ingestionJobId: job.id,
      contratoId: contrato.id,
      colaboradorId,
      organizationId,
      fileKey,
    });

    return reply.code(202).send({
      jobId: job.id,
      contratoId: contrato.id,
      status: contrato.status,
      message: "Contrato recibido; procesando en segundo plano.",
    });
  });

  // GET /contratos — lista del tenant.
  app.get("/", async (req) => {
    const { organizationId } = getTenant(req);
    return listContratos(organizationId);
  });

  // GET /contratos/:id — detalle + URL prefirmada del PDF.
  app.get("/:id", async (req) => {
    const { organizationId } = getTenant(req);
    const { id } = IdParamSchema.parse(req.params);
    const contrato = await getContrato(organizationId, id);
    if (!contrato) throw httpError(404, "Contrato no encontrado");
    const fileUrl = await presignGet(contrato.fileKey).catch(() => null);
    return { ...contrato, fileUrl };
  });

  // GET /contratos/:id/analisis — compliance DETERMINISTA (sin IA) sobre los
  // datos ya extraidos: jornada, liquidacion estimada y alertas. Trazable.
  app.get("/:id/analisis", async (req) => {
    const { organizationId, userId } = getTenant(req);
    const { id } = IdParamSchema.parse(req.params);
    const contrato = await getContrato(organizationId, id);
    if (!contrato) throw httpError(404, "Contrato no encontrado");

    const analisis = analizarContrato({
      tipoContrato: contrato.tipoContrato,
      salario: contrato.salario != null ? Number(contrato.salario) : null,
      fechaInicio: contrato.fechaInicio,
      fechaFin: contrato.fechaFin,
      jornadaHorasSemana: contrato.jornadaHorasSemana,
    });

    // aiModel = null: dejamos constancia de que NO fue IA, fue calculo.
    await writeAuditLog({
      organizationId,
      userId,
      action: "RULES_ANALYSIS",
      entity: "contrato",
      entityId: id,
      aiModel: null,
      payload: analisis,
    });

    return analisis;
  });

  // GET /contratos/job/:id — estado del job de ingestion (para polling).
  app.get("/job/:id", async (req) => {
    const { organizationId } = getTenant(req);
    const { id } = IdParamSchema.parse(req.params);
    const job = await getIngestionJob(organizationId, id);
    if (!job) throw httpError(404, "Job no encontrado");
    return job;
  });
}
