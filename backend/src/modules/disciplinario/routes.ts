import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { CreateExpedienteSchema, IdParamSchema, UpdateExpedienteSchema } from "../../shared/schemas.js";
import { httpError } from "../../shared/errors.js";
import { getTenant } from "../../shared/tenant.js";
import { evaluarDebidoProceso } from "../../rules/debido-proceso.js";
import {
  createExpediente,
  getExpediente,
  listExpedientes,
  updateExpediente,
} from "./service.js";

export async function disciplinarioRoutes(app: FastifyInstance) {
  app.addHook("preHandler", app.authenticate);

  app.get("/", async (req) => {
    const { organizationId } = getTenant(req);
    const q = z.object({ colaboradorId: z.uuid().optional() }).parse(req.query);
    return listExpedientes(organizationId, q.colaboradorId);
  });

  app.get("/:id", async (req) => {
    const { organizationId } = getTenant(req);
    const { id } = IdParamSchema.parse(req.params);
    const row = await getExpediente(organizationId, id);
    if (!row) throw httpError(404, "Expediente no encontrado");
    return row;
  });

  app.post("/", async (req, reply) => {
    const { organizationId } = getTenant(req);
    const body = CreateExpedienteSchema.parse(req.body);
    const row = await createExpediente(organizationId, body);
    return reply.code(201).send(row);
  });

  app.patch("/:id", async (req) => {
    const { organizationId } = getTenant(req);
    const { id } = IdParamSchema.parse(req.params);
    const body = UpdateExpedienteSchema.parse(req.body);
    const row = await updateExpediente(organizationId, id, body);
    if (!row) throw httpError(404, "Expediente no encontrado");
    return row;
  });

  // Evalua el debido proceso sobre las etapas actuales del expediente
  app.get("/:id/debido-proceso", async (req) => {
    const { organizationId } = getTenant(req);
    const { id } = IdParamSchema.parse(req.params);
    const row = await getExpediente(organizationId, id);
    if (!row) throw httpError(404, "Expediente no encontrado");
    return evaluarDebidoProceso((row.etapas ?? {}) as Record<string, boolean>);
  });
}
