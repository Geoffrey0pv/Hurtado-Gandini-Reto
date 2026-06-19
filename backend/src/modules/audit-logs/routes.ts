import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { getTenant } from "../../shared/tenant.js";
import { listAuditLogs } from "./service.js";

export async function auditLogsRoutes(app: FastifyInstance) {
  app.addHook("preHandler", app.authenticate);

  app.get("/", async (req) => {
    const { organizationId } = getTenant(req);
    const q = z.object({
      desde: z.string().optional(),
      hasta: z.string().optional(),
      action: z.string().optional(),
    }).parse(req.query);
    return listAuditLogs(organizationId, q);
  });
}
