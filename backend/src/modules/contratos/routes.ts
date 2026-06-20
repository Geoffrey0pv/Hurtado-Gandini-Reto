// src/modules/contratos/routes.ts — Subida de PDF y consulta de contratos.
import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { IdParamSchema, ObligacionesQuerySchema, RevisionContratoSchema, UpdateContratoSchema } from "../../shared/schemas.js";
import { httpError } from "../../shared/errors.js";
import { getTenant } from "../../shared/tenant.js";
import { extractQueue } from "../../lib/queue.js";
import { presignGet, uploadStream } from "../../lib/storage.js";
import { analizarContrato } from "../../rules/analisis.js";
import { obligacionesEnRango } from "../../rules/obligaciones.js";
import { writeAuditLog } from "../../shared/audit.js";
import { getColaborador } from "../colaboradores/service.js";
import {
  createContratoWithJob,
  getContrato,
  getIngestionJob,
  listContratos,
  setContratoRevision,
  updateContratoExtraido,
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

    // complex=true => usa el modelo de razonamiento (qwen2.5) para contratos
    // complejos; por defecto usa el modelo estandar (llama3), mas rapido.
    const complex = (data.fields.complex as { value?: string } | undefined)?.value === "true";

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
      complex,
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

  // PATCH /contratos/:id — corrección manual de las variables extraídas.
  // Permite al humano arreglar lo que la IA extrajo mal y persistirlo. Trazable.
  app.patch("/:id", async (req) => {
    const { organizationId, userId } = getTenant(req);
    const { id } = IdParamSchema.parse(req.params);
    const cambios = UpdateContratoSchema.parse(req.body);

    const updated = await updateContratoExtraido(organizationId, id, cambios);
    if (!updated) throw httpError(404, "Contrato no encontrado");

    await writeAuditLog({
      organizationId,
      userId,
      action: "CONTRACT_MANUAL_FIX",
      entity: "contrato",
      entityId: id,
      aiModel: null, // correccion humana, no IA
      payload: { cambios },
    });

    return updated;
  });

  // POST /contratos/:id/revision — decisión jurídica humana (aprobado/rechazado).
  // El contrato debe estar procesado (DONE). Persiste la decisión y deja traza en
  // audit_logs: ninguna salida con efecto jurídico es válida sin esta aprobación.
  app.post("/:id/revision", async (req) => {
    const { organizationId, userId } = getTenant(req);
    const { id } = IdParamSchema.parse(req.params);
    const { decision, nota } = RevisionContratoSchema.parse(req.body);

    const contrato = await getContrato(organizationId, id);
    if (!contrato) throw httpError(404, "Contrato no encontrado");
    if (contrato.status !== "DONE") {
      throw httpError(409, "El contrato aún no está procesado; no puede revisarse");
    }

    const updated = await setContratoRevision(organizationId, id, { decision, nota, userId });
    if (!updated) throw httpError(404, "Contrato no encontrado");

    await writeAuditLog({
      organizationId,
      userId,
      action: decision === "aprobado" ? "CONTRACT_APPROVED" : "CONTRACT_REJECTED",
      entity: "contrato",
      entityId: id,
      aiModel: null, // decisión humana, no IA
      payload: { decision, nota: nota ?? null },
    });

    return updated;
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

  // GET /contratos/:id/obligaciones?desde&hasta — calendario DETERMINISTA de
  // obligaciones recurrentes (PILA, nómina, prima, cesantías, dotación) con monto
  // y base legal. Sin IA. Por defecto: desde inicio del mes actual hasta +12 meses.
  app.get("/:id/obligaciones", async (req) => {
    const { organizationId } = getTenant(req);
    const { id } = IdParamSchema.parse(req.params);
    const { desde, hasta } = ObligacionesQuerySchema.parse(req.query);

    const contrato = await getContrato(organizationId, id);
    if (!contrato) throw httpError(404, "Contrato no encontrado");

    const hoy = new Date();
    const desdeDef = desde ?? `${hoy.getUTCFullYear()}-${String(hoy.getUTCMonth() + 1).padStart(2, "0")}-01`;
    const hastaDef =
      hasta ?? `${hoy.getUTCFullYear() + 1}-${String(hoy.getUTCMonth() + 1).padStart(2, "0")}-28`;

    return obligacionesEnRango({
      empleadoId: contrato.colaboradorId,
      salario: contrato.salario != null ? Number(contrato.salario) : 0,
      tipoContrato: contrato.tipoContrato,
      desde: desdeDef,
      hasta: hastaDef,
    });
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
