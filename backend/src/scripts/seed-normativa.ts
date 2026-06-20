// src/scripts/seed-normativa.ts — Indexa la normativa (CST, leyes, decretos) en la
// base vectorial para enriquecer el RAG de revisión jurídica.
//
// Coloca tus archivos .md en  backend/seed/normativa/  y ejecuta:
//   cd backend && npx tsx src/scripts/seed-normativa.ts
//
// Lee cada .md, lo trocea, genera embeddings con bge-m3 y los inserta en
// document_chunks con source="normativa" (contratoId=null). Es idempotente:
// borra la normativa previa de cada organización antes de reinsertar.
//
// Multi-tenant: la tabla exige organizationId, así que la normativa se siembra
// para TODAS las organizaciones existentes (la ley es igual para todas). Como el
// RAG recupera por organizationId, así queda disponible para cada tenant.
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { and, eq } from "drizzle-orm";
import { db, queryClient } from "../db/index.js";
import { documentChunks, organizations } from "../db/schema.js";
import { embed } from "../lib/llm.js";
import { env } from "../config/env.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const NORMATIVA_DIR = join(__dirname, "../../seed/normativa");

// Trocea texto/markdown en bloques de ~900 chars respetando párrafos y títulos.
function chunkMarkdown(text: string, maxChars = 900): string[] {
  const blocks = text
    .replace(/\r\n/g, "\n")
    .split(/\n\s*\n/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  const chunks: string[] = [];
  let buf = "";
  for (const b of blocks) {
    if (buf && (buf + "\n\n" + b).length > maxChars) {
      chunks.push(buf);
      buf = b;
    } else {
      buf = buf ? `${buf}\n\n${b}` : b;
    }
    // Bloque enorme (artículo largo): partir por longitud.
    while (buf.length > maxChars * 1.6) {
      chunks.push(buf.slice(0, maxChars));
      buf = buf.slice(maxChars);
    }
  }
  if (buf.trim()) chunks.push(buf.trim());
  return chunks;
}

async function main() {
  console.log(`\n=== SEED NORMATIVA (LLM_MODE=${env.LLM_MODE}, embeddings=${env.EMBED_MODEL}) ===`);
  console.log(`Directorio: ${NORMATIVA_DIR}`);

  // 1) Leer archivos .md (ignora ocultos y los que empiezan por _).
  let files: string[];
  try {
    files = readdirSync(NORMATIVA_DIR).filter(
      (f) => f.toLowerCase().endsWith(".md") && !f.startsWith("_") && !f.startsWith("."),
    );
  } catch {
    console.error("No existe el directorio. Crea backend/seed/normativa/ y pon ahí los .md.");
    process.exit(1);
  }
  if (files.length === 0) {
    console.error("No hay archivos .md en backend/seed/normativa/. Agrega la normativa y reintenta.");
    process.exit(1);
  }
  console.log(`Archivos: ${files.join(", ")}`);

  // 2) Trocear todos los archivos (el nombre del archivo encabeza cada chunk como contexto).
  const docs: Array<{ content: string }> = [];
  for (const file of files) {
    const raw = readFileSync(join(NORMATIVA_DIR, file), "utf8");
    const fuente = file.replace(/\.md$/i, "");
    for (const chunk of chunkMarkdown(raw)) {
      docs.push({ content: `[${fuente}] ${chunk}` });
    }
  }
  console.log(`Total de chunks a indexar por organización: ${docs.length}`);

  // 3) Embeddings (una sola vez; el mismo vector sirve para todas las orgs).
  console.log("Generando embeddings con bge-m3...");
  const embedded = [];
  for (const d of docs) {
    embedded.push({ content: d.content, embedding: await embed(d.content) });
  }

  // 4) Sembrar para cada organización (idempotente).
  const orgs = await db.select({ id: organizations.id, name: organizations.name }).from(organizations);
  if (orgs.length === 0) {
    console.error("No hay organizaciones. Registra un usuario primero (POST /auth/register).");
    process.exit(1);
  }

  for (const org of orgs) {
    await db
      .delete(documentChunks)
      .where(and(eq(documentChunks.organizationId, org.id), eq(documentChunks.source, "normativa")));

    await db.insert(documentChunks).values(
      embedded.map((e) => ({
        organizationId: org.id,
        contratoId: null,
        source: "normativa",
        content: e.content,
        embedding: e.embedding,
      })),
    );
    console.log(`  ✓ ${org.name}: ${embedded.length} chunks de normativa indexados.`);
  }

  console.log("\nListo. El RAG ahora puede citar la normativa además de las cláusulas del contrato.\n");
}

main()
  .catch((err) => {
    console.error("\nFALLO el seed de normativa:", err);
    process.exitCode = 1;
  })
  .finally(() => queryClient.end());
