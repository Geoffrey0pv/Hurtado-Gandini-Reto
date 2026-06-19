import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { IdParamSchema } from "../../shared/schemas.js";
import { httpError } from "../../shared/errors.js";
import { getTenant } from "../../shared/tenant.js";
import { deleteDocumento, listDocumentos, upsertDocumento } from "./service.js";

export async function documentosRoutes(app: FastifyInstance) {
  app.addHook("preHandler", app.authenticate);

  app.get("/", async (req) => {
    const { organizationId } = getTenant(req);
    const { colaboradorId } = z.object({ colaboradorId: z.uuid() }).parse(req.query);
    return listDocumentos(organizationId, colaboradorId);
  });

  app.post("/upload", async (req, reply) => {
    const { organizationId } = getTenant(req);
    const data = await req.file();
    if (!data) throw httpError(400, "Falta el archivo");

    const fields = data.fields as Record<string, { value?: string }>;
    const colaboradorId = fields.colaboradorId?.value;
    const slotKey = fields.slotKey?.value;

    if (!colaboradorId || !slotKey) {
      data.file.resume();
      throw httpError(400, "Faltan campos colaboradorId y slotKey");
    }

    const nombre = data.filename ?? slotKey;
    const row = await upsertDocumento(
      organizationId,
      colaboradorId,
      slotKey,
      data.file,
      nombre,
      0,
      data.mimetype ?? "application/octet-stream",
    );
    return reply.code(201).send(row);
  });

  app.delete("/:id", async (req, reply) => {
    const { organizationId } = getTenant(req);
    const { id } = IdParamSchema.parse(req.params);
    const row = await deleteDocumento(organizationId, id);
    if (!row) throw httpError(404, "Documento no encontrado");
    return reply.code(204).send();
  });
}
