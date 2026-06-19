// src/modules/rag/service.ts — Pipeline RAG de riesgo: retrieve → ground → generate.
// Filosofia del spec: "cita o abstención". Cada afirmación debe citar una fuente
// recuperada; si no hay evidencia, el modelo se ABSTIENE explícitamente.
// Todo queda registrado en audit_logs para trazabilidad ante el jurado.
import { and, desc, eq, gt, sql } from "drizzle-orm";
import { cosineDistance } from "drizzle-orm";
import { env } from "../../config/env.js";
import { db } from "../../db/index.js";
import { auditLogs, contratos, documentChunks } from "../../db/schema.js";
import { embed, generateStructured } from "../../lib/llm.js";
import { writeAuditLog } from "../../shared/audit.js";
import {
  RagResponseSchema,
  type AuditLogQuery,
  type RagResponse,
} from "../../shared/schemas.js";

// ── Retrieve: búsqueda por similitud con pgvector ─────────────────────
// Filtra por organizationId (multi-tenant) y umbral de similaridad.
export interface RetrievedChunk {
  id: string;
  content: string;
  source: string;
  similarity: number;
  contratoId: string | null;
}

export async function retrieveSimilar(
  orgId: string,
  query: string,
  k = 5,
  threshold = 0.3,
): Promise<RetrievedChunk[]> {
  const queryEmbedding = await embed(query);
  const similarity = sql<number>`1 - (${cosineDistance(documentChunks.embedding, queryEmbedding)})`;

  // En LLM_MODE=mock los embeddings son vectores pseudo-aleatorios: la similitud
  // coseno entre query y chunks ronda ~0, asi que el umbral real (0.3) descartaria
  // TODO y el pipeline siempre se abstendria. Para poder demostrar el camino feliz
  // end-to-end sin Ollama, en mock devolvemos los top-k por similitud sin umbral.
  // En modo ollama, bge-m3 da similitudes significativas y el umbral aplica normal.
  const effectiveThreshold = env.LLM_MODE === "mock" ? -1 : threshold;

  const rows = await db
    .select({
      id: documentChunks.id,
      content: documentChunks.content,
      source: documentChunks.source,
      similarity,
      contratoId: documentChunks.contratoId,
    })
    .from(documentChunks)
    .where(and(eq(documentChunks.organizationId, orgId), gt(similarity, effectiveThreshold)))
    .orderBy(desc(similarity))
    .limit(k);

  return rows;
}

// ── Prompt del sistema RAG ────────────────────────────────────────────
const RAG_SYSTEM_PROMPT = `Eres un abogado laboralista colombiano experto en compliance y derecho laboral.
Tu tarea es analizar riesgos legales en contratos laborales usando EXCLUSIVAMENTE
las fuentes documentales proporcionadas.

REGLAS ESTRICTAS:
1. Cada afirmacion que hagas DEBE citar su fuente como [FUENTE N] donde N es el numero de la fuente.
2. Si NO hay evidencia suficiente en las fuentes para un tema, ABSTENTE explicitamente en el campo "abstenciones".
3. NUNCA inventes informacion que no este soportada por las fuentes proporcionadas.
4. Clasifica cada riesgo detectado con severidad: "alta", "media" o "baja".
5. Para cada riesgo, proporciona una recomendacion concreta y accionable.
6. El resumen debe ser breve (2-3 oraciones) y reflejar solo lo que las fuentes soportan.
7. La confianza (0 a 1) debe reflejar que tan bien las fuentes cubren la pregunta.

Responde EXCLUSIVAMENTE con el JSON del schema proporcionado.`;

// ── Mock de respuesta RAG (para LLM_MODE=mock) ───────────────────────
function buildMockResponse(query: string, chunks: RetrievedChunk[]): RagResponse {
  if (chunks.length === 0) {
    return {
      riesgos: [],
      resumen: "No se encontro evidencia documental suficiente para analizar la consulta.",
      abstenciones: [`No hay clausulas indexadas relevantes para: "${query.slice(0, 60)}"`],
      confianza: 0,
    };
  }
  return {
    riesgos: [
      {
        descripcion: `Posible riesgo identificado en clausulas del contrato relacionado con: ${query.slice(0, 50)}`,
        severidad: "media",
        fuentesCitadas: chunks.slice(0, 2).map((_, i) => `FUENTE ${i + 1}`),
        recomendacion: "Revisar las clausulas citadas con un abogado laboralista para confirmar cumplimiento normativo.",
      },
    ],
    resumen: `Se analizaron ${chunks.length} clausulas relevantes. Se identifico 1 riesgo de severidad media basado en las fuentes documentales (mock).`,
    abstenciones: [],
    confianza: 0.65,
  };
}

// ── RAG Risk Analysis: pipeline completo ──────────────────────────────
export interface RagAnalysisResult {
  response: RagResponse;
  model: string;
  chunksUsed: number;
  abstained: boolean;
}

export async function ragRiskAnalysis(params: {
  orgId: string;
  userId: string;
  contratoId: string;
  query: string;
}): Promise<RagAnalysisResult> {
  const { orgId, userId, contratoId, query } = params;

  // 1) Validar que el contrato existe, pertenece al tenant y esta procesado.
  const [contrato] = await db
    .select({ id: contratos.id, status: contratos.status })
    .from(contratos)
    .where(and(eq(contratos.organizationId, orgId), eq(contratos.id, contratoId)))
    .limit(1);

  if (!contrato) {
    throw Object.assign(new Error("Contrato no encontrado"), { statusCode: 404 });
  }
  if (contrato.status !== "DONE") {
    throw Object.assign(
      new Error(`El contrato aun no esta procesado (status: ${contrato.status}). Espere a que termine la ingestion.`),
      { statusCode: 409 },
    );
  }

  // 2) Retrieve: buscar chunks similares al query dentro del tenant.
  const chunks = await retrieveSimilar(orgId, query, 8, 0.3);

  // 3) Si no hay chunks suficientes -> abstencion explicita (no inventar).
  if (chunks.length === 0) {
    const abstentionResult: RagResponse = {
      riesgos: [],
      resumen: "No se encontro evidencia documental suficiente en las clausulas indexadas del contrato para responder a la consulta.",
      abstenciones: [
        `La consulta "${query.slice(0, 80)}" no tiene soporte en las clausulas indexadas. Posibles causas: el contrato no contiene clausulas relevantes, o el texto extraido no cubre este tema.`,
      ],
      confianza: 0,
    };

    await writeAuditLog({
      organizationId: orgId,
      userId,
      action: "RAG_RISK_ABSTENTION",
      entity: "contrato",
      entityId: contratoId,
      aiModel: null,
      payload: { query, chunksRetrieved: 0, response: abstentionResult },
    });

    return { response: abstentionResult, model: "none (abstention)", chunksUsed: 0, abstained: true };
  }

  // 4) Ground: construir prompt con fuentes numeradas.
  const sourcesBlock = chunks
    .map((c, i) => `[FUENTE ${i + 1}] (${c.source}, similitud=${c.similarity.toFixed(2)}):\n"${c.content}"`)
    .join("\n\n");

  const userPrompt = `FUENTES RECUPERADAS DEL CONTRATO:\n${sourcesBlock}\n\nPREGUNTA DEL USUARIO:\n${query}`;

  // 5) Generate: LLM con salida estructurada + validacion Zod.
  const mockFallback = buildMockResponse(query, chunks);
  const { data: response, model } = await generateStructured({
    systemPrompt: RAG_SYSTEM_PROMPT,
    userPrompt,
    schema: RagResponseSchema,
    mockFallback,
    complex: true,
  });

  // 6) Audit log con trazabilidad completa: modelo, query, fuentes, respuesta.
  await writeAuditLog({
    organizationId: orgId,
    userId,
    action: "RAG_RISK",
    entity: "contrato",
    entityId: contratoId,
    aiModel: model,
    payload: {
      query,
      chunksRetrieved: chunks.length,
      sources: chunks.map((c, i) => ({
        fuenteNum: i + 1,
        chunkId: c.id,
        source: c.source,
        similarity: c.similarity,
        contentPreview: c.content.slice(0, 200),
      })),
      response,
    },
  });

  return {
    response,
    model,
    chunksUsed: chunks.length,
    abstained: response.riesgos.length === 0 && response.abstenciones.length > 0,
  };
}

// ── Audit Logs: consulta paginada con filtros ─────────────────────────
export async function listAuditLogs(orgId: string, filters: AuditLogQuery) {
  const conditions = [eq(auditLogs.organizationId, orgId)];

  if (filters.action) conditions.push(eq(auditLogs.action, filters.action));
  if (filters.entity) conditions.push(eq(auditLogs.entity, filters.entity));
  if (filters.entityId) conditions.push(eq(auditLogs.entityId, filters.entityId));

  const rows = await db
    .select()
    .from(auditLogs)
    .where(and(...conditions))
    .orderBy(desc(auditLogs.createdAt))
    .limit(filters.limit)
    .offset(filters.offset);

  return rows;
}
