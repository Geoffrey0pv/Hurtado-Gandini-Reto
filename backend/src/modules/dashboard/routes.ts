import type { FastifyInstance } from "fastify";
import { getTenant } from "../../shared/tenant.js";
import { getDashboardSummary } from "./service.js";

export async function dashboardRoutes(app: FastifyInstance) {
  app.addHook("preHandler", app.authenticate);

  app.get("/summary", async (req) => {
    const { organizationId } = getTenant(req);
    return getDashboardSummary(organizationId);
  });
}
