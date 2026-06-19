// src/scripts/rag-smoke.ts — Prueba de humo del RAG con inferencia REAL.
// Siembra un contrato con clausulas riesgosas, genera embeddings (bge-m3 real),
// y ejecuta ragRiskAnalysis (qwen2.5 real). Verifica retrieve + reason + audit
// end-to-end sin necesidad de levantar API/worker ni subir PDFs.
//
//   npx tsx src/scripts/rag-smoke.ts
//
// Requiere: docker infra arriba + LLM_MODE=ollama + modelos descargados.
import { and, eq } from "drizzle-orm";
import { db, queryClient } from "../db/index.js";
import { colaboradores, contratos, documentChunks, organizations } from "../db/schema.js";
import { embed } from "../lib/llm.js";
import { chunkClauses } from "../workers/processors/embed.js";
import { ragRiskAnalysis } from "../modules/rag/service.js";
import { env } from "../config/env.js";

const NIT = "900000000-RAGSMOKE";

// Contrato de prueba con riesgos deliberados: jornada de 48h (excede Ley 2101),
// periodo de prueba de 4 meses (excede el legal de 2 meses), termino fijo de 6
// meses renovado, y salario integral mal redactado.
const RAW_TEXT = `CONTRATO INDIVIDUAL DE TRABAJO A TERMINO FIJO

Entre EMPRESA DEMO S.A.S., identificada con NIT 900.000.000-1, y el TRABAJADOR
JUAN PEREZ GOMEZ, identificado con cedula 1.020.304.050, se celebra el presente
contrato bajo las siguientes clausulas:

CLAUSULA PRIMERA. OBJETO. El trabajador se obliga a prestar sus servicios
personales en el cargo de Analista de Operaciones.

CLAUSULA SEGUNDA. DURACION. El presente contrato es a termino fijo por un periodo
de seis (6) meses, contados a partir del 1 de febrero de 2026, prorrogable
automaticamente por periodos iguales.

CLAUSULA TERCERA. PERIODO DE PRUEBA. Las partes acuerdan un periodo de prueba de
cuatro (4) meses, durante el cual cualquiera de las partes podra dar por terminado
el contrato sin previo aviso ni indemnizacion alguna.

CLAUSULA CUARTA. JORNADA. La jornada ordinaria de trabajo sera de cuarenta y ocho
(48) horas semanales, distribuidas de lunes a sabado, sin que ello genere recargo
alguno.

CLAUSULA QUINTA. REMUNERACION. El trabajador devengara un salario mensual de UN
MILLON QUINIENTOS MIL PESOS ($1.500.000), suma que se entiende como salario
integral que incluye todas las prestaciones sociales, recargos y horas extra.

CLAUSULA SEXTA. EXCLUSIVIDAD. El trabajador no podra prestar servicios a ninguna
otra persona natural o juridica durante la vigencia del contrato, ni aun fuera de
la jornada laboral.`;

async function ensureSeed(): Promise<{ orgId: string; contratoId: string }> {
  // Org idempotente por NIT.
  let [org] = await db.select().from(organizations).where(eq(organizations.nit, NIT)).limit(1);
  if (!org) {
    [org] = await db.insert(organizations).values({ name: "Empresa Demo (RAG smoke)", nit: NIT }).returning();
  }
  const orgId = org.id;

  // Colaborador idempotente por (org, cedula).
  let [col] = await db
    .select()
    .from(colaboradores)
    .where(and(eq(colaboradores.organizationId, orgId), eq(colaboradores.cedula, "1020304050")))
    .limit(1);
  if (!col) {
    [col] = await db
      .insert(colaboradores)
      .values({ organizationId: orgId, nombre: "Juan Perez Gomez", cedula: "1020304050", cargo: "Analista de Operaciones" })
      .returning();
  }

  // Contrato: reusar el de smoke si existe, si no crearlo en estado DONE.
  let [contrato] = await db
    .select()
    .from(contratos)
    .where(and(eq(contratos.organizationId, orgId), eq(contratos.fileKey, "smoke/contrato-demo.pdf")))
    .limit(1);
  if (!contrato) {
    [contrato] = await db
      .insert(contratos)
      .values({
        organizationId: orgId,
        colaboradorId: col.id,
        tipoContrato: "TERMINO_FIJO",
        fileKey: "smoke/contrato-demo.pdf",
        rawText: RAW_TEXT,
        status: "DONE",
      })
      .returning();
  }
  return { orgId, contratoId: contrato.id };
}

async function ensureChunks(orgId: string, contratoId: string): Promise<number> {
  // Regenerar siempre para usar bge-m3 real con el texto actual.
  await db.delete(documentChunks).where(eq(documentChunks.contratoId, contratoId));
  const chunks = chunkClauses(RAW_TEXT);
  const rows = [];
  for (const content of chunks) {
    const embedding = await embed(content);
    rows.push({ organizationId: orgId, contratoId, source: "contrato", content, embedding });
  }
  await db.insert(documentChunks).values(rows);
  return rows.length;
}

async function main() {
  console.log(`\n=== RAG SMOKE TEST (LLM_MODE=${env.LLM_MODE}) ===`);
  console.log(`Razonamiento: ${env.OLLAMA_MODEL_COMPLEX} | Embeddings: ${env.EMBED_MODEL}\n`);

  const { orgId, contratoId } = await ensureSeed();
  console.log(`Org:      ${orgId}`);
  console.log(`Contrato: ${contratoId} (status DONE)`);

  console.log("\n[1/2] Generando embeddings con bge-m3...");
  const n = await ensureChunks(orgId, contratoId);
  console.log(`      ${n} chunks indexados.`);

  const query = "Analiza los riesgos legales de la jornada laboral, el periodo de prueba y el salario integral de este contrato.";
  console.log(`\n[2/2] Ejecutando RAG con qwen2.5...\n      Query: "${query}"\n`);

  const t0 = Date.now();
  const result = await ragRiskAnalysis({ orgId, userId: "00000000-0000-0000-0000-000000000000", contratoId, query });
  const dt = ((Date.now() - t0) / 1000).toFixed(1);

  console.log("=== RESULTADO ===");
  console.log(`Modelo:      ${result.model}`);
  console.log(`Chunks:      ${result.chunksUsed}`);
  console.log(`Abstenido:   ${result.abstained}`);
  console.log(`Confianza:   ${result.response.confianza}`);
  console.log(`Tiempo:      ${dt}s\n`);
  console.log(`Resumen: ${result.response.resumen}\n`);

  console.log(`Riesgos (${result.response.riesgos.length}):`);
  for (const [i, r] of result.response.riesgos.entries()) {
    console.log(`  ${i + 1}. [${r.severidad.toUpperCase()}] ${r.descripcion}`);
    console.log(`     Fuentes: ${r.fuentesCitadas.join(", ") || "(ninguna)"}`);
    console.log(`     Recomendacion: ${r.recomendacion}`);
  }

  if (result.response.abstenciones.length) {
    console.log(`\nAbstenciones (${result.response.abstenciones.length}):`);
    for (const a of result.response.abstenciones) console.log(`  - ${a}`);
  }

  console.log("\nOK: audit log RAG_RISK registrado. Verifica con GET /audit-logs?action=RAG_RISK\n");
}

main()
  .catch((err) => {
    console.error("\nFALLO el smoke test:", err);
    process.exitCode = 1;
  })
  .finally(() => queryClient.end());
