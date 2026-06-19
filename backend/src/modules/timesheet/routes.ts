import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { CreateTimesheetSchema, IdParamSchema } from "../../shared/schemas.js";
import { httpError } from "../../shared/errors.js";
import { getTenant } from "../../shared/tenant.js";
import { createTimesheetEntry, deleteTimesheetEntry, listTimesheet } from "./service.js";

export async function timesheetRoutes(app: FastifyInstance) {
  app.addHook("preHandler", app.authenticate);

  app.get("/", async (req) => {
    const { organizationId } = getTenant(req);
    const { colaboradorId } = z.object({ colaboradorId: z.uuid() }).parse(req.query);
    return listTimesheet(organizationId, colaboradorId);
  });

  app.post("/", async (req, reply) => {
    const { organizationId } = getTenant(req);
    const body = CreateTimesheetSchema.parse(req.body);
    const row = await createTimesheetEntry(organizationId, body);
    return reply.code(201).send(row);
  });

  app.delete("/:id", async (req, reply) => {
    const { organizationId } = getTenant(req);
    const { id } = IdParamSchema.parse(req.params);
    const row = await deleteTimesheetEntry(organizationId, id);
    if (!row) throw httpError(404, "Entrada no encontrada");
    return reply.code(204).send();
  });
}
