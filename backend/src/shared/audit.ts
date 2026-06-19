// src/shared/audit.ts — Trazabilidad. Se usa fuerte en la Hora 18-22 (RAG),
// pero ya queda disponible para registrar acciones de negocio.
import { db } from "../db/index.js";
import { auditLogs } from "../db/schema.js";

export interface AuditInput {
  organizationId: string;
  userId?: string | null;
  action: string;              // EXTRACT_CONTRACT, RAG_RISK, CREATE_COLABORADOR...
  entity?: string | null;
  entityId?: string | null;
  aiModel?: string | null;     // modelo + version, null si fue regla determinista
  payload?: unknown;           // sugerencia IA + fuentes citadas / detalle
}

export async function writeAuditLog(input: AuditInput): Promise<void> {
  await db.insert(auditLogs).values({
    organizationId: input.organizationId,
    userId: input.userId ?? null,
    action: input.action,
    entity: input.entity ?? null,
    entityId: input.entityId ?? null,
    aiModel: input.aiModel ?? null,
    payload: (input.payload ?? null) as object | null,
  });
}
