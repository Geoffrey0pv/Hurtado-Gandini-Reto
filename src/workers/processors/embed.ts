// src/workers/processors/embed.ts — Procesador de la cola "embed".
// Trocea el texto del contrato en clausulas y genera embeddings -> document_chunks.
import { eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { contratos, documentChunks } from "../../db/schema.js";
import { embed } from "../../lib/llm.js";
import type { EmbedJobData } from "../../lib/queue.js";

// Trocea por clausulas. Heuristica: corta en marcadores "CLAUSULA/PRIMERA..."
// o por parrafos; si quedan trozos enormes, los parte por longitud.
export function chunkClauses(text: string, maxChars = 800): string[] {
  const normalized = text.replace(/\r\n/g, "\n");
  // Separa por encabezados de clausula o doble salto de linea.
  const rough = normalized
    .split(/\n(?=\s*(?:CL[AÁ]USULA|PAR[AÁ]GRAFO|ART[IÍ]CULO)\b)|\n\s*\n/i)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  const chunks: string[] = [];
  for (const part of rough) {
    if (part.length <= maxChars) {
      chunks.push(part);
    } else {
      // Trozo grande: partir por longitud respetando limites de frase.
      let buf = "";
      for (const sentence of part.split(/(?<=[.;])\s+/)) {
        if ((buf + " " + sentence).length > maxChars && buf) {
          chunks.push(buf.trim());
          buf = sentence;
        } else {
          buf = buf ? `${buf} ${sentence}` : sentence;
        }
      }
      if (buf.trim()) chunks.push(buf.trim());
    }
  }
  return chunks;
}

export async function runEmbedding(data: EmbedJobData): Promise<void> {
  const { contratoId, organizationId } = data;

  const [contrato] = await db
    .select({ rawText: contratos.rawText })
    .from(contratos)
    .where(eq(contratos.id, contratoId))
    .limit(1);

  if (!contrato?.rawText) return; // nada que trocear

  const chunks = chunkClauses(contrato.rawText);
  if (chunks.length === 0) return;

  // Idempotencia: si el job se reintenta, reemplazamos los chunks previos.
  await db.delete(documentChunks).where(eq(documentChunks.contratoId, contratoId));

  // Embeddings (en mock es instantaneo; en ollama, bge-m3 en serie).
  const rows = [];
  for (const content of chunks) {
    const embedding = await embed(content);
    rows.push({
      organizationId,
      contratoId,
      source: "contrato",
      content,
      embedding,
    });
  }

  // Insert por lotes.
  await db.insert(documentChunks).values(rows);
}
