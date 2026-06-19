// src/workers/processors/analysis.ts — Procesador de la cola "analysis".
// Corre AUTOMATICAMENTE tras la extraccion (contrato DONE). Aplica las reglas
// deterministas (jornada, liquidacion, alertas) sobre los datos ya extraidos y
// deja TRAZA en audit_logs. No usa IA (aiModel=null) y no muta el contrato:
// las alertas se siguen calculando on-read para que nunca queden obsoletas.
import { and, eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { contratos } from "../../db/schema.js";
import { analizarContrato } from "../../rules/analisis.js";
import { writeAuditLog } from "../../shared/audit.js";
import type { AnalysisJobData } from "../../lib/queue.js";

export async function runAnalysis(data: AnalysisJobData): Promise<void> {
  const { contratoId, organizationId } = data;

  const [c] = await db
    .select({
      tipoContrato: contratos.tipoContrato,
      salario: contratos.salario,
      fechaInicio: contratos.fechaInicio,
      fechaFin: contratos.fechaFin,
      jornadaHorasSemana: contratos.jornadaHorasSemana,
      status: contratos.status,
    })
    .from(contratos)
    .where(and(eq(contratos.organizationId, organizationId), eq(contratos.id, contratoId)))
    .limit(1);

  if (!c || c.status !== "DONE") return; // nada que analizar todavia

  const analisis = analizarContrato({
    tipoContrato: c.tipoContrato,
    salario: c.salario != null ? Number(c.salario) : null,
    fechaInicio: c.fechaInicio,
    fechaFin: c.fechaFin,
    jornadaHorasSemana: c.jornadaHorasSemana,
  });

  // Resumen de lo accionable (omite las alertas OK) para la traza.
  const alertasAccionables = analisis.alertas.filter((a) => a.severidad !== "OK");

  await writeAuditLog({
    organizationId,
    action: "RULES_ANALYSIS",
    entity: "contrato",
    entityId: contratoId,
    aiModel: null, // determinista: NO es IA
    payload: {
      trigger: "post-ingestion",
      jornada: analisis.jornada,
      liquidacion: analisis.liquidacion,
      alertas: analisis.alertas,
      alertasAccionables: alertasAccionables.length,
    },
  });
}
