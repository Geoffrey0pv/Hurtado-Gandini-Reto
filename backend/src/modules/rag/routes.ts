// src/modules/rag/routes.ts — Endpoints RAG de riesgo + audit logs.
// POST /rag/analyze  — análisis de riesgo con cita o abstención
// GET  /rag/similar   — búsqueda de chunks similares (debug/exploración)
// GET  /audit-logs    — trazabilidad completa (requisito clave del jurado)
import type { FastifyInstance } from "fastify";
import { getTenant } from "../../shared/tenant.js";
import {
  AuditLogQuerySchema,
  RagAnalyzeSchema,
  RagSimilarQuerySchema,
} from "../../shared/schemas.js";
import { listAuditLogs, ragRiskAnalysis, retrieveSimilar } from "./service.js";

export async function ragRoutes(app: FastifyInstance) {
  app.addHook("preHandler", app.authenticate);

  // ── POST /rag/analyze — Análisis de riesgo con RAG ──────────────────
  // Retrieve chunks → ground prompt → LLM con cita/abstención → audit log.
  app.post("/analyze", async (req) => {
    const { organizationId, userId } = getTenant(req);
    const { contratoId, query } = RagAnalyzeSchema.parse(req.body);

    const result = await ragRiskAnalysis({
      orgId: organizationId,
      userId,
      contratoId,
      query,
    });

    return {
      contratoId,
      query,
      model: result.model,
      chunksUsed: result.chunksUsed,
      abstained: result.abstained,
      ...result.response,
    };
  });

  // ── GET /rag/similar — Búsqueda de chunks por similitud ─────────────
  // Útil para debug, exploración y demo al jurado.
  app.get("/similar", async (req) => {
    const { organizationId } = getTenant(req);
    const { q, k } = RagSimilarQuerySchema.parse(req.query);

    const chunks = await retrieveSimilar(organizationId, q, k);

    return {
      query: q,
      count: chunks.length,
      chunks: chunks.map((c, i) => ({
        rank: i + 1,
        similarity: Number(c.similarity.toFixed(4)),
        source: c.source,
        contratoId: c.contratoId,
        content: c.content,
      })),
    };
  });
}

// ── Audit logs: ruta separada para registrar a nivel /audit-logs ───────
export async function auditLogRoutes(app: FastifyInstance) {
  app.addHook("preHandler", app.authenticate);

  // GET /audit-logs — Lista paginada con filtros.
  // Ejemplo: GET /audit-logs?action=RAG_RISK&limit=10&offset=0
  app.get("/", async (req) => {
    const { organizationId } = getTenant(req);
    const filters = AuditLogQuerySchema.parse(req.query);

    const logs = await listAuditLogs(organizationId, filters);

    return {
      count: logs.length,
      limit: filters.limit,
      offset: filters.offset,
      logs,
    };
  });
}
