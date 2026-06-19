// src/modules/colaboradores/routes.ts — CRUD protegido y scoped por tenant.
import type { FastifyInstance } from "fastify";
import {
  CreateColaboradorSchema,
  IdParamSchema,
  UpdateColaboradorSchema,
} from "../../shared/schemas.js";
import { httpError, isUniqueViolation } from "../../shared/errors.js";
import { getTenant } from "../../shared/tenant.js";
import {
  createColaborador,
  deleteColaborador,
  getColaborador,
  listColaboradores,
  updateColaborador,
} from "./service.js";

export async function colaboradoresRoutes(app: FastifyInstance) {
  app.addHook("preHandler", app.authenticate);

  // GET /colaboradores — lista del tenant.
  app.get("/", async (req) => {
    const { organizationId } = getTenant(req);
    return listColaboradores(organizationId);
  });

  // GET /colaboradores/:id
  app.get("/:id", async (req) => {
    const { organizationId } = getTenant(req);
    const { id } = IdParamSchema.parse(req.params);
    const row = await getColaborador(organizationId, id);
    if (!row) throw httpError(404, "Colaborador no encontrado");
    return row;
  });

  // POST /colaboradores
  app.post("/", async (req, reply) => {
    const { organizationId } = getTenant(req);
    const body = CreateColaboradorSchema.parse(req.body);
    try {
      const row = await createColaborador(organizationId, body);
      return reply.code(201).send(row);
    } catch (e) {
      // uniq_cedula_org: cedula duplicada dentro de la misma organizacion.
      if (isUniqueViolation(e)) {
        throw httpError(409, "Ya existe un colaborador con esa cedula en la organizacion");
      }
      throw e;
    }
  });

  // PATCH /colaboradores/:id
  app.patch("/:id", async (req) => {
    const { organizationId } = getTenant(req);
    const { id } = IdParamSchema.parse(req.params);
    const body = UpdateColaboradorSchema.parse(req.body);
    try {
      const row = await updateColaborador(organizationId, id, body);
      if (!row) throw httpError(404, "Colaborador no encontrado");
      return row;
    } catch (e) {
      if (isUniqueViolation(e)) {
        throw httpError(409, "Ya existe un colaborador con esa cedula en la organizacion");
      }
      throw e;
    }
  });

  // DELETE /colaboradores/:id
  app.delete("/:id", async (req, reply) => {
    const { organizationId } = getTenant(req);
    const { id } = IdParamSchema.parse(req.params);
    const row = await deleteColaborador(organizationId, id);
    if (!row) throw httpError(404, "Colaborador no encontrado");
    return reply.code(204).send();
  });
}
