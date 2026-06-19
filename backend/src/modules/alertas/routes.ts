import type { FastifyInstance } from "fastify";
import { getTenant } from "../../shared/tenant.js";
import { getAlertasOrg } from "./service.js";

export async function alertasRoutes(app: FastifyInstance) {
  app.addHook("preHandler", app.authenticate);

  app.get("/", async (req) => {
    const { organizationId } = getTenant(req);
    return getAlertasOrg(organizationId);
  });
}
