import type { FastifyInstance } from "fastify";
import { CreateAreaSchema, IdParamSchema, UpdateAreaSchema } from "../../shared/schemas.js";
import { httpError, isUniqueViolation } from "../../shared/errors.js";
import { getTenant } from "../../shared/tenant.js";
import { createArea, deleteArea, listAreas, updateArea } from "./service.js";

export async function areasRoutes(app: FastifyInstance) {
  app.addHook("preHandler", app.authenticate);

  app.get("/", async (req) => {
    const { organizationId } = getTenant(req);
    return listAreas(organizationId);
  });

  app.post("/", async (req, reply) => {
    const { organizationId } = getTenant(req);
    const body = CreateAreaSchema.parse(req.body);
    try {
      const row = await createArea(organizationId, body);
      return reply.code(201).send(row);
    } catch (e) {
      if (isUniqueViolation(e)) throw httpError(409, "Ya existe un area con ese nombre");
      throw e;
    }
  });

  app.patch("/:id", async (req) => {
    const { organizationId } = getTenant(req);
    const { id } = IdParamSchema.parse(req.params);
    const body = UpdateAreaSchema.parse(req.body);
    const row = await updateArea(organizationId, id, body);
    if (!row) throw httpError(404, "Area no encontrada");
    return row;
  });

  app.delete("/:id", async (req, reply) => {
    const { organizationId } = getTenant(req);
    const { id } = IdParamSchema.parse(req.params);
    const row = await deleteArea(organizationId, id);
    if (!row) throw httpError(404, "Area no encontrada");
    return reply.code(204).send();
  });
}
