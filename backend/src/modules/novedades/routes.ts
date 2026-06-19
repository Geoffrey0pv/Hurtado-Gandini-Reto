import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { CreateNovedadSchema, IdParamSchema } from "../../shared/schemas.js";
import { httpError } from "../../shared/errors.js";
import { getTenant } from "../../shared/tenant.js";
import { createNovedad, deleteNovedad, listNovedades } from "./service.js";

export async function novedadesRoutes(app: FastifyInstance) {
  app.addHook("preHandler", app.authenticate);

  app.get("/", async (req) => {
    const { organizationId } = getTenant(req);
    const q = z.object({ colaboradorId: z.uuid().optional() }).parse(req.query);
    return listNovedades(organizationId, q.colaboradorId);
  });

  app.post("/", async (req, reply) => {
    const { organizationId } = getTenant(req);
    const body = CreateNovedadSchema.parse(req.body);
    const row = await createNovedad(organizationId, body);
    return reply.code(201).send(row);
  });

  app.delete("/:id", async (req, reply) => {
    const { organizationId } = getTenant(req);
    const { id } = IdParamSchema.parse(req.params);
    const row = await deleteNovedad(organizationId, id);
    if (!row) throw httpError(404, "Novedad no encontrada");
    return reply.code(204).send();
  });
}
