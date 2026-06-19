// src/modules/organizations/routes.ts — siempre operan sobre el tenant del token.
import type { FastifyInstance } from "fastify";
import { UpdateOrgSchema } from "../../shared/schemas.js";
import { httpError } from "../../shared/errors.js";
import { getTenant } from "../../shared/tenant.js";
import { getOrganization, updateOrganization } from "./service.js";

export async function organizationRoutes(app: FastifyInstance) {
  // Todas las rutas de este modulo requieren autenticacion.
  app.addHook("preHandler", app.authenticate);

  // GET /organizations/me — datos de la organizacion del usuario.
  app.get("/me", async (req) => {
    const { organizationId } = getTenant(req);
    const org = await getOrganization(organizationId);
    if (!org) throw httpError(404, "Organizacion no encontrada");
    return org;
  });

  // PATCH /organizations/me — actualizar nombre (solo admin).
  app.patch("/me", async (req) => {
    const { organizationId, role } = getTenant(req);
    if (role !== "admin") throw httpError(403, "Solo un admin puede modificar la organizacion");
    const body = UpdateOrgSchema.parse(req.body);
    const org = await updateOrganization(organizationId, body);
    if (!org) throw httpError(404, "Organizacion no encontrada");
    return org;
  });
}
